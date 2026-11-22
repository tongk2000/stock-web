/**
 * GET /api/stocks/[code]/company-info
 *
 * 종목 상세의 "기업정보" 탭에 필요한 데이터를 한 번에 모아 응답합니다.
 *   - stocks 테이블 메타데이터 (액면가/상장일 등)
 *   - v_latest_financials 뷰 (PER/PBR/ROE/EPS 등 최신 분기)
 *   - 최근 252영업일 캔들 (5/20일 고저가, 52주 고저가 폴백)
 *   - Naver `/integration` 응답 (DB가 비어있을 때 PER/시총 등 보강)
 *
 * Naver 보강은 1.2초 타임아웃과 try/catch로 감싸 외부 API가 죽어도 페이지가 멈추지 않습니다.
 * 일부 컬럼이 빠진 마이그레이션 환경(스키마 fallback)을 위해 select 실패 시 축소된
 * 컬럼 셋으로 한 번 더 조회합니다.
 */

import { NextResponse } from 'next/server';
import { LIMITS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';
import { parseDecimalOrNull, parseKrwAmount } from '@/lib/parsers';

type StockRow = {
  shares_outstanding: number | null;
  description?: string | null;
  face_value?: number | null;
  listing_date?: string | null;
  capital?: number | null;
  foreign_ownership_ratio?: number | null;
};

type FinancialsRow = {
  year: number | null;
  quarter: number | null;
  net_income: number | null;
  market_cap: number | null;
  per: number | null;
  eps: number | null;
  pbr: number | null;
  roe: number | null;
  bps?: number | null;
  ev_ebitda?: number | null;
  dividend?: number | null;
  dividend_yield?: number | null;
  credit_balance_ratio?: number | null;
};

type CandleRow = {
  high: number;
  low: number;
  close: number;
};

type NaverInfo = {
  code?: string;
  value?: string;
};

type NaverSupplement = {
  market_cap: number | null;
  per: number | null;
  eps: number | null;
  pbr: number | null;
  bps: number | null;
  dividend: number | null;
  dividend_yield: number | null;
  foreign_ownership_ratio: number | null;
  high_52w: number | null;
  low_52w: number | null;
};

/** Supabase 응답에서 error가 있으면 null로, 없으면 data를 그대로 반환합니다. */
function okData<T>(data: T | null, error: unknown): T | null {
  return error ? null : data;
}

function infoValue(infos: NaverInfo[] | undefined, code: string): string | undefined {
  return infos?.find((info) => info.code === code)?.value;
}

async function fetchNaverSupplement(code: string): Promise<NaverSupplement | null> {
  try {
    const res = await fetch(`https://m.stock.naver.com/api/stock/${code}/integration`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
      signal: AbortSignal.timeout(1200),
    });

    if (!res.ok) return null;

    const json = (await res.json()) as { totalInfos?: NaverInfo[] };
    const infos = json.totalInfos;

    return {
      market_cap: parseKrwAmount(infoValue(infos, 'marketValue')),
      per: parseDecimalOrNull(infoValue(infos, 'per')),
      eps: parseDecimalOrNull(infoValue(infos, 'eps')),
      pbr: parseDecimalOrNull(infoValue(infos, 'pbr')),
      bps: parseDecimalOrNull(infoValue(infos, 'bps')),
      dividend: parseDecimalOrNull(infoValue(infos, 'dividend')),
      dividend_yield: parseDecimalOrNull(infoValue(infos, 'dividendYieldRatio')),
      foreign_ownership_ratio: parseDecimalOrNull(infoValue(infos, 'foreignRate')),
      high_52w: parseDecimalOrNull(infoValue(infos, 'highPriceOf52Weeks')),
      low_52w: parseDecimalOrNull(infoValue(infos, 'lowPriceOf52Weeks')),
    };
  } catch {
    return null;
  }
}

function maxHigh(rows: CandleRow[]): number | null {
  return rows.reduce<number | null>((acc, row) => (acc == null ? row.high : Math.max(acc, row.high)), null);
}

function minLow(rows: CandleRow[]): number | null {
  return rows.reduce<number | null>((acc, row) => (acc == null ? row.low : Math.min(acc, row.low)), null);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'invalid stock code' }, { status: 400 });
  }

  const supabase = await createClient();

  const [
    stockRes,
    financialsRes,
    candlesRes,
    naver,
  ] = await Promise.all([
    supabase
      .from('stocks')
      .select('shares_outstanding, description, face_value, listing_date, capital, foreign_ownership_ratio')
      .eq('code', code)
      .maybeSingle<StockRow>(),
    supabase
      .from('v_latest_financials')
      .select('year, quarter, net_income, market_cap, per, eps, pbr, roe, bps, ev_ebitda, dividend, dividend_yield, credit_balance_ratio')
      .eq('stock_code', code)
      .maybeSingle<FinancialsRow>(),
    supabase
      .from('candles')
      .select('high, low, close')
      .eq('stock_code', code)
      .eq('exchange', 'KRX')
      .eq('candle_type', 'daily')
      .order('date', { ascending: false })
      .limit(252)
      .returns<CandleRow[]>(),
    fetchNaverSupplement(code),
  ]);

  let stock = okData(stockRes.data, stockRes.error);
  let financials = okData(financialsRes.data, financialsRes.error);
  const candles = candlesRes.error ? [] : candlesRes.data ?? [];
  const lookback20 = candles.slice(0, LIMITS.COMPANY_INFO_LOOKBACK_DAYS);
  // 52주 고저가도 5/20일 고저가와 같은 KRX 정규장 캔들로 계산한다. Naver 값은 NXT 등을
  // 포함해 KRX 저가보다 낮게 나올 수 있어(52주 최저 < 5일저가처럼 보임) 캔들이 1년치에
  // 못 미치는 신규 상장·수집 누락 종목에만 폴백으로 쓴다.
  const hasYearOfCandles = candles.length >= LIMITS.COMPANY_INFO_52W_MIN_CANDLES;

  if (stockRes.error) {
    const fallback = await supabase
      .from('stocks')
      .select('shares_outstanding')
      .eq('code', code)
      .maybeSingle<StockRow>();
    stock = okData(fallback.data, fallback.error);
  }

  if (financialsRes.error) {
    const fallback = await supabase
      .from('v_latest_financials')
      .select('year, quarter, net_income, market_cap, per, eps, pbr, roe')
      .eq('stock_code', code)
      .maybeSingle<FinancialsRow>();
    financials = okData(fallback.data, fallback.error);
  }

  const data = {
    description: stock?.description ?? null,
    face_value: stock?.face_value ?? null,
    listing_date: stock?.listing_date ?? null,
    shares_outstanding: stock?.shares_outstanding ?? null,
    capital: stock?.capital ?? null,
    foreign_ownership_ratio: stock?.foreign_ownership_ratio ?? naver?.foreign_ownership_ratio ?? null,
    today_close: candles[0]?.close ?? null,
    prev_close: candles[1]?.close ?? null,
    year: financials?.year ?? null,
    quarter: financials?.quarter ?? null,
    net_income: financials?.net_income ?? null,
    market_cap: financials?.market_cap ?? naver?.market_cap ?? null,
    per: financials?.per ?? naver?.per ?? null,
    eps: financials?.eps ?? naver?.eps ?? null,
    pbr: financials?.pbr ?? naver?.pbr ?? null,
    roe: financials?.roe ?? null,
    bps: financials?.bps ?? naver?.bps ?? null,
    ev_ebitda: financials?.ev_ebitda ?? null,
    dividend: financials?.dividend ?? naver?.dividend ?? null,
    dividend_yield: financials?.dividend_yield ?? naver?.dividend_yield ?? null,
    credit_balance_ratio: financials?.credit_balance_ratio ?? null,
    high_5d: maxHigh(candles.slice(0, 5)),
    low_5d: minLow(candles.slice(0, 5)),
    high_20d: maxHigh(lookback20),
    low_20d: minLow(lookback20),
    high_52w: hasYearOfCandles ? maxHigh(candles) : (naver?.high_52w ?? maxHigh(candles)),
    low_52w: hasYearOfCandles ? minLow(candles) : (naver?.low_52w ?? minLow(candles)),
  };

  return NextResponse.json({ data });
}
