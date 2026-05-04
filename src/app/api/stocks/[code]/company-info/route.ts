import { NextResponse } from 'next/server';
import { LIMITS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';

type StockRow = {
  shares_outstanding: number | null;
  description?: string | null;
  face_value?: number | null;
  substitute_value?: number | null;
  listing_date?: string | null;
  ipo_price?: number | null;
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

function okData<T>(data: T | null, error: unknown): T | null {
  return error ? null : data;
}

function parseNumber(value: string | undefined): number | null {
  if (!value) return null;
  const num = Number.parseFloat(value.replace(/,/g, '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(num) ? num : null;
}

function parseKrwAmount(value: string | undefined): number | null {
  if (!value) return null;

  const compact = value.replace(/,/g, '').replace(/\s+/g, '');
  const trillion = compact.match(/(-?\d+(?:\.\d+)?)조/);
  const hundredMillion = compact.match(/(-?\d+(?:\.\d+)?)억/);

  if (trillion || hundredMillion) {
    return Math.round(
      (trillion ? Number.parseFloat(trillion[1]) * 1e12 : 0) +
        (hundredMillion ? Number.parseFloat(hundredMillion[1]) * 1e8 : 0),
    );
  }

  return parseNumber(value);
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
      per: parseNumber(infoValue(infos, 'per')),
      eps: parseNumber(infoValue(infos, 'eps')),
      pbr: parseNumber(infoValue(infos, 'pbr')),
      bps: parseNumber(infoValue(infos, 'bps')),
      dividend: parseNumber(infoValue(infos, 'dividend')),
      dividend_yield: parseNumber(infoValue(infos, 'dividendYieldRatio')),
      foreign_ownership_ratio: parseNumber(infoValue(infos, 'foreignRate')),
      high_52w: parseNumber(infoValue(infos, 'highPriceOf52Weeks')),
      low_52w: parseNumber(infoValue(infos, 'lowPriceOf52Weeks')),
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
      .select('shares_outstanding, description, face_value, substitute_value, listing_date, ipo_price, capital, foreign_ownership_ratio')
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
    substitute_value: stock?.substitute_value ?? null,
    listing_date: stock?.listing_date ?? null,
    ipo_price: stock?.ipo_price ?? null,
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
    high_52w: naver?.high_52w ?? maxHigh(candles),
    low_52w: naver?.low_52w ?? minLow(candles),
  };

  return NextResponse.json({ data });
}
