/**
 * 차트 공매도·신용잔고 패널용 순수 함수: DB 행 정규화와 일·주·월봉 집계.
 *
 * - 점의 시간은 캔들(`aggregateCandles` 결과)의 date에 맞춘다. 캔들에 없는 날짜의 행은 버리고,
 *   행이 없는 봉은 점을 만들지 않는다(0으로 채우지 않는다).
 * - 묶음은 `candleGroupKey`로 `aggregateCandles`와 같게 나눈다.
 */

import { candleGroupKey } from '@/lib/indicators';
import type { Candle, CandleType, CreditBalance, ShortSale } from '@/types/stock';

/** 공매도 패널의 점 하나. ratio는 거래량 대비 공매도 비중(%) */
export interface ShortSalePoint {
  time: string;
  volume: number | null;
  ratio: number;
}

/** 신용잔고 패널의 점 하나. rate는 신용잔고율(%) */
export interface CreditPoint {
  time: string;
  rate: number;
  shares: number | null;
}

/** PostgREST가 numeric·bigint를 문자열로 줄 수 있어 숫자로 바꾼다. 빈 값·숫자가 아닌 값은 null */
export function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** short_sales 조회 결과를 숫자 행으로 바꾸고 날짜 오름차순으로 둔다. 날짜 없는 행은 버린다 */
export function normalizeShortSales(raw: readonly Record<string, unknown>[]): ShortSale[] {
  return raw
    .filter((r) => typeof r.date === 'string' && r.date !== '')
    .map((r) => ({
      date: r.date as string,
      short_volume: toNum(r.short_volume),
      short_value: toNum(r.short_value),
      short_volume_ratio: toNum(r.short_volume_ratio),
      short_value_ratio: toNum(r.short_value_ratio),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** credit_balances 조회 결과를 숫자 행으로 바꾸고 날짜 오름차순으로 둔다. 날짜 없는 행은 버린다 */
export function normalizeCreditBalances(raw: readonly Record<string, unknown>[]): CreditBalance[] {
  return raw
    .filter((r) => typeof r.date === 'string' && r.date !== '')
    .map((r) => ({
      date: r.date as string,
      loan_balance_shares: toNum(r.loan_balance_shares),
      loan_balance_amount: toNum(r.loan_balance_amount),
      loan_balance_rate: toNum(r.loan_balance_rate),
      loan_new_shares: toNum(r.loan_new_shares),
      loan_repay_shares: toNum(r.loan_repay_shares),
      lend_balance_shares: toNum(r.lend_balance_shares),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** 행을 봉 묶음 키별로 모은다(입력 순서 유지) */
function groupByKey<T extends { date: string }>(rows: readonly T[], type: CandleType): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const k = candleGroupKey(r.date, type);
    const list = m.get(k);
    if (list) list.push(r);
    else m.set(k, [r]);
  }
  return m;
}

/**
 * 공매도 점을 캔들에 맞춘다.
 * - 일봉: 그날 행의 수량과 비중(short_volume_ratio, KRX 기준) 그대로.
 * - 주·월봉: 수량은 기간 합계, 비중은 기간 합계 수량 ÷ 그 봉의 거래량 × 100.
 *   분모는 넘겨받은 캔들 거래량이라 '통합'(KRX+NXT 합산) 모드에서는 KRX 기준 비중보다 작게 나온다.
 *   공매도 행이 빠진 날이 있으면 분자만 줄어든다.
 */
export function alignShortSales(
  rows: readonly ShortSale[],
  candles: readonly Candle[],
  type: CandleType,
): ShortSalePoint[] {
  if (rows.length === 0 || candles.length === 0) return [];
  const groups = groupByKey(rows, type);
  const out: ShortSalePoint[] = [];
  for (const c of candles) {
    const g = groups.get(candleGroupKey(c.date, type));
    if (!g) continue;
    if (type === 'daily') {
      const r = g[g.length - 1];
      if (r.short_volume_ratio === null) continue;
      out.push({ time: c.date, volume: r.short_volume, ratio: r.short_volume_ratio });
      continue;
    }
    const vols = g.map((r) => r.short_volume).filter((v): v is number => v !== null);
    if (vols.length === 0 || !(c.volume > 0)) continue;
    const sum = vols.reduce((a, b) => a + b, 0);
    out.push({ time: c.date, volume: sum, ratio: (sum / c.volume) * 100 });
  }
  return out;
}

/**
 * 신용잔고 점을 캔들에 맞춘다. 일봉은 그날 값, 주·월봉은 기간 안에서 잔고율이 있는 마지막 날의 값.
 */
export function alignCreditBalances(
  rows: readonly CreditBalance[],
  candles: readonly Candle[],
  type: CandleType,
): CreditPoint[] {
  if (rows.length === 0 || candles.length === 0) return [];
  const groups = groupByKey(rows, type);
  const out: CreditPoint[] = [];
  for (const c of candles) {
    const g = groups.get(candleGroupKey(c.date, type));
    if (!g) continue;
    for (let i = g.length - 1; i >= 0; i--) {
      const r = g[i];
      if (r.loan_balance_rate === null) continue;
      out.push({ time: c.date, rate: r.loan_balance_rate, shares: r.loan_balance_shares });
      break;
    }
  }
  return out;
}
