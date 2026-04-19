/**
 * 랭킹 페이지(/rankings/*) 공용 타입
 */

import type { Stock } from './stock';

/** 랭킹 테이블 한 행에 들어갈 종목 정보 + 지표값 */
export type RankingRow = Pick<Stock, 'code' | 'name' | 'market'> & {
  /** 정렬 기준이 된 메트릭 값 (포맷 전 raw) */
  metric: number | null;
  /** 메트릭 외 함께 보여줄 보조 지표 (옵션) */
  secondary?: { label: string; value: string }[];
};

/** view: v_daily_change */
export type DailyChangeRow = {
  stock_code: string;
  today_date: string;
  today_open: number;
  today_high: number;
  today_low: number;
  today_close: number;
  today_volume: number;
  today_value: number;
  prev_date: string | null;
  prev_close: number | null;
  change_rate: number | null;
};

/** view: v_latest_financials */
export type LatestFinancialsRow = {
  stock_code: string;
  year: number;
  quarter: number;
  revenue: number | null;
  operating_profit: number | null;
  net_income: number | null;
  operating_margin: number | null;
  eps: number | null;
  per: number | null;
  pbr: number | null;
  roe: number | null;
  debt_ratio: number | null;
  market_cap: number | null;
};

/** view: v_52w_extremes */
export type ExtremesRow = {
  stock_code: string;
  today_high: number | null;
  today_low: number | null;
  high_252: number | null;
  low_252: number | null;
  is_new_high: boolean;
  is_new_low: boolean;
};

/** valuation 페이지 탭 */
export type ValuationTab = 'market_cap' | 'low_per' | 'low_pbr' | 'high_roe';

/** movers 페이지 탭 */
export type MoversTab = 'gainers' | 'losers' | 'high_52w' | 'low_52w';

/** volume 페이지 탭 */
export type VolumeTab = 'value' | 'surge';
