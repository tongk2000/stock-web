'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface CompanyInfoData {
  // stocks
  description: string | null;
  face_value: number | null;
  substitute_value: number | null;
  listing_date: string | null;
  ipo_price: number | null;
  shares_outstanding: number | null;
  capital: number | null;
  foreign_ownership_ratio: number | null;
  // v_daily_change
  today_close: number | null;
  prev_close: number | null;
  // v_latest_financials
  year: number | null;
  quarter: number | null;
  net_income: number | null;
  market_cap: number | null;
  per: number | null;
  eps: number | null;
  pbr: number | null;
  bps: number | null;
  ev_ebitda: number | null;
  roe: number | null;
  dividend: number | null;
  dividend_yield: number | null;
  credit_balance_ratio: number | null;
  // candles (computed)
  high_5d: number | null;
  low_5d: number | null;
  high_20d: number | null;
  low_20d: number | null;
  high_52w: number | null;
  low_52w: number | null;
}

function fmt(value: number | null | undefined, suffix = ''): string {
  if (value == null) return '-';
  return value.toLocaleString('ko-KR') + suffix;
}

function fmtOk(value: number | null | undefined, decimals = 2, suffix = ''): string {
  if (value == null) return '-';
  return value.toFixed(decimals) + suffix;
}

function fmtAok(value: number | null | undefined, suffix = ''): string {
  // 억 단위
  if (value == null) return '-';
  return Math.round(value / 1e8).toLocaleString('ko-KR') + suffix;
}

function netIncomeMonth(year: number | null, quarter: number | null): string {
  if (!year || !quarter) return '-';
  return `${year}.${String(quarter * 3).padStart(2, '0')}`;
}

interface RowItem {
  label: string;
  value: string;
  color?: 'red' | 'blue' | 'default';
  full?: boolean;
}

export default function CompanyInfoSection({ stockCode }: { stockCode: string }) {
  const [data, setData] = useState<CompanyInfoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      try {
        // 기존 컬럼(항상 존재)과 신규 컬럼(migration 미적용 시 실패 가능)을 분리해서
        // 신규 쪽이 실패해도 기존 데이터가 정상 표시되도록 합니다.
        const [
          stockBaseRes,
          stockExtRes,
          dailyRes,
          financialsBaseRes,
          financialsExtRes,
          extremesRes,
          candlesRes,
        ] = await Promise.all([
          // stocks — 기존 컬럼 (20260419000002에서 추가)
          supabase
            .from('stocks')
            .select('shares_outstanding')
            .eq('code', stockCode)
            .single(),
          // stocks — 신규 컬럼 (20260429000001에서 추가, migration 전에는 null 반환)
          supabase
            .from('stocks')
            .select('description, face_value, substitute_value, listing_date, ipo_price, capital, foreign_ownership_ratio')
            .eq('code', stockCode)
            .single(),
          // v_daily_change — 컬럼 변경 없음
          supabase
            .from('v_daily_change')
            .select('today_close, prev_close')
            .eq('stock_code', stockCode)
            .single(),
          // v_latest_financials — 기존 컬럼
          supabase
            .from('v_latest_financials')
            .select('year, quarter, net_income, market_cap, per, eps, pbr, roe')
            .eq('stock_code', stockCode)
            .single(),
          // v_latest_financials — 신규 컬럼 (migration 전에는 null 반환)
          supabase
            .from('v_latest_financials')
            .select('bps, ev_ebitda, dividend, dividend_yield, credit_balance_ratio')
            .eq('stock_code', stockCode)
            .single(),
          // v_52w_extremes — 컬럼 변경 없음
          supabase
            .from('v_52w_extremes')
            .select('high_252, low_252')
            .eq('stock_code', stockCode)
            .single(),
          // candles — 5일/20일 계산용
          supabase
            .from('candles')
            .select('high, low')
            .eq('stock_code', stockCode)
            .eq('exchange', 'KRX')
            .eq('candle_type', 'daily')
            .order('date', { ascending: false })
            .limit(20),
        ]);

        type CandleRow = { high: number; low: number };
        const candles: CandleRow[] = candlesRes.data ?? [];
        const high_5d = candles.slice(0, 5).reduce<number | null>((acc, c) => (acc == null ? c.high : Math.max(acc, c.high)), null);
        const low_5d = candles.slice(0, 5).reduce<number | null>((acc, c) => (acc == null ? c.low : Math.min(acc, c.low)), null);
        const high_20d = candles.reduce<number | null>((acc, c) => (acc == null ? c.high : Math.max(acc, c.high)), null);
        const low_20d = candles.reduce<number | null>((acc, c) => (acc == null ? c.low : Math.min(acc, c.low)), null);

        const sb = stockBaseRes.data;
        const se = stockExtRes.data;
        const d = dailyRes.data;
        const fb = financialsBaseRes.data;
        const fe = financialsExtRes.data;
        const e = extremesRes.data;

        setData({
          description: se?.description ?? null,
          face_value: se?.face_value ?? null,
          substitute_value: se?.substitute_value ?? null,
          listing_date: se?.listing_date ?? null,
          ipo_price: se?.ipo_price ?? null,
          shares_outstanding: sb?.shares_outstanding ?? null,
          capital: se?.capital ?? null,
          foreign_ownership_ratio: se?.foreign_ownership_ratio ?? null,
          today_close: d?.today_close ?? null,
          prev_close: d?.prev_close ?? null,
          year: fb?.year ?? null,
          quarter: fb?.quarter ?? null,
          net_income: fb?.net_income ?? null,
          market_cap: fb?.market_cap ?? null,
          per: fb?.per ?? null,
          eps: fb?.eps ?? null,
          pbr: fb?.pbr ?? null,
          roe: fb?.roe ?? null,
          bps: fe?.bps ?? null,
          ev_ebitda: fe?.ev_ebitda ?? null,
          dividend: fe?.dividend ?? null,
          dividend_yield: fe?.dividend_yield ?? null,
          credit_balance_ratio: fe?.credit_balance_ratio ?? null,
          high_5d,
          low_5d,
          high_20d,
          low_20d,
          high_52w: e?.high_252 ?? null,
          low_52w: e?.low_252 ?? null,
        });
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [stockCode]);

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">
        불러오는 중...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">
        정보를 불러올 수 없습니다.
      </div>
    );
  }

  const priceDir =
    data.today_close != null && data.prev_close != null
      ? data.today_close > data.prev_close
        ? 'red'
        : data.today_close < data.prev_close
          ? 'blue'
          : 'default'
      : 'default';

  const rows: RowItem[] = [
    { label: '현재가', value: fmt(data.today_close, ''), color: priceDir },
    { label: '전일종가', value: fmt(data.prev_close) },
    { label: '액면가', value: fmt(data.face_value) },
    { label: '대용가', value: fmt(data.substitute_value) },
    { label: '5일고가', value: fmt(data.high_5d), color: 'red' },
    { label: '5일저가', value: fmt(data.low_5d), color: 'blue' },
    { label: '20일고가', value: fmt(data.high_20d), color: 'red' },
    { label: '20일저가', value: fmt(data.low_20d), color: 'blue' },
    { label: '52주 최고', value: fmt(data.high_52w), color: 'red' },
    { label: '52주 최저', value: fmt(data.low_52w), color: 'blue' },
    {
      label: '상장일',
      value: data.listing_date ? data.listing_date.replace(/-/g, '.') : '-',
    },
    { label: '공모가', value: fmt(data.ipo_price) },
    { label: '상장주수', value: fmt(data.shares_outstanding) },
    { label: '추가상장', value: '0' },
    { label: '시가총액(억)', value: fmtAok(data.market_cap) },
    { label: '자본금(억)', value: fmtAok(data.capital) },
    { label: '순이익 기준월', value: netIncomeMonth(data.year, data.quarter) },
    { label: '순이익(억)', value: fmtAok(data.net_income) },
    { label: 'PER', value: data.per != null ? fmtOk(data.per) : '-' },
    { label: 'EPS', value: data.eps != null ? fmt(data.eps, '원') : '-' },
    { label: 'PBR', value: data.pbr != null ? fmtOk(data.pbr) : '-' },
    { label: 'BPS', value: data.bps != null ? fmt(data.bps, '원') : '-' },
    { label: 'EV/EBITDA', value: data.ev_ebitda != null ? fmtOk(data.ev_ebitda) : '-' },
    { label: 'ROE', value: data.roe != null ? fmtOk(data.roe, 2, '%') : '-' },
    {
      label: '외국인지분율',
      value: data.foreign_ownership_ratio != null ? fmtOk(data.foreign_ownership_ratio, 2, '%') : '-',
    },
    {
      label: '신용잔고비율',
      value: data.credit_balance_ratio != null ? fmtOk(data.credit_balance_ratio, 2, '%') : '-',
    },
    { label: '배당금', value: data.dividend != null ? fmt(data.dividend, '원') : '-' },
    {
      label: '배당수익률',
      value: data.dividend_yield != null ? fmtOk(data.dividend_yield, 2, '%') : '-',
    },
  ];

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {data.description && (
        <div className="flex border-b border-border">
          <span className="shrink-0 w-24 px-3 py-3 text-xs text-muted-foreground bg-muted/40 flex items-start">
            기업개요
          </span>
          <span className="px-3 py-3 text-sm text-foreground leading-relaxed">
            {data.description}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y divide-border">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center">
            <span className="w-24 shrink-0 px-3 py-2.5 text-xs text-muted-foreground bg-muted/40">
              {row.label}
            </span>
            <span
              className={cn(
                'flex-1 px-3 py-2.5 text-sm text-right tabular-nums',
                row.color === 'red' && 'text-red-500',
                row.color === 'blue' && 'text-blue-500',
                row.color === 'default' || !row.color ? 'text-foreground' : '',
              )}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
