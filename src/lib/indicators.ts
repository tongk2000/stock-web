/**
 * 기술적 지표 계산 함수 모음
 *
 * CandleChart에서 사용하는 보조지표(MA, BB, RSI, OBV)와
 * 일봉→주봉/월봉 집계(aggregateCandles)를 제공합니다.
 * 모든 함수는 순수 함수로, 캔들 배열을 입력받아 시계열 데이터를 반환합니다.
 */

import type { Candle, CandleType } from '@/types/stock';

// ── 이동평균선 ────────────────────────────────────────────────────────────────

/** N기간 단순 이동평균선(SMA) 계산 */
export function calcMA(
  candles: Candle[],
  period: number,
): { time: string; value: number }[] {
  const result: { time: string; value: number }[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += candles[j].close;
    result.push({ time: candles[i].date, value: sum / period });
  }
  return result;
}

// ── 볼린저밴드 ────────────────────────────────────────────────────────────────

export interface BBPoint {
  time: string;
  upper: number;
  middle: number;
  lower: number;
}

/** 볼린저밴드 계산 (기본: 20기간, 2σ) */
export function calcBB(candles: Candle[], period = 20, mult = 2): BBPoint[] {
  const result: BBPoint[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1).map((c) => c.close);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const std = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period);
    result.push({
      time: candles[i].date,
      upper: mean + mult * std,
      middle: mean,
      lower: mean - mult * std,
    });
  }
  return result;
}

// ── RSI ──────────────────────────────────────────────────────────────────────

/** RSI(상대강도지수) 계산 — Wilder 평활법 적용 (기본 14기간) */
export function calcRSI(
  candles: Candle[],
  period = 14,
): { time: string; value: number }[] {
  if (candles.length <= period) return [];

  const result: { time: string; value: number }[] = [];
  let avgGain = 0;
  let avgLoss = 0;

  // 첫 period 평균
  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff > 0) avgGain += diff;
    else avgLoss += Math.abs(diff);
  }
  avgGain /= period;
  avgLoss /= period;

  const rsi = (g: number, l: number) => (l === 0 ? 100 : 100 - 100 / (1 + g / l));
  result.push({ time: candles[period].date, value: rsi(avgGain, avgLoss) });

  // Wilder 평활
  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result.push({ time: candles[i].date, value: rsi(avgGain, avgLoss) });
  }

  return result;
}

// ── OBV ──────────────────────────────────────────────────────────────────────

/** OBV(거래량 균형 지표) 계산 — 종가 상승 시 +volume, 하락 시 -volume */
export function calcOBV(candles: Candle[]): { time: string; value: number }[] {
  const result: { time: string; value: number }[] = [];
  let obv = 0;
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      obv = candles[0].volume;
    } else {
      const diff = candles[i].close - candles[i - 1].close;
      if (diff > 0) obv += candles[i].volume;
      else if (diff < 0) obv -= candles[i].volume;
    }
    result.push({ time: candles[i].date, value: obv });
  }
  return result;
}

// ── 데이터 집계 (주봉, 월봉) ──────────────────────────────────────────────────

/**
 * 일봉 날짜(YYYY-MM-DD)가 속한 주·월봉 묶음의 키.
 * 일봉은 날짜 그대로, 주봉은 그 주 월요일 날짜, 월봉은 "YYYY-MM".
 * `aggregateCandles`와 차트 보조 데이터(`lib/short-credit.ts`)가 같은 묶음을 쓰도록 공유한다.
 */
export function candleGroupKey(date: string, type: CandleType): string {
  if (type === 'daily') return date;
  if (type === 'monthly') return date.substring(0, 7);
  const d = new Date(date);
  const day = d.getUTCDay();
  // 월요일을 시작 기준으로 그룹화
  d.setUTCDate(d.getUTCDate() - day + (day === 0 ? -6 : 1));
  return d.toISOString().split('T')[0];
}

/**
 * 일봉 데이터를 주봉 또는 월봉으로 집계합니다.
 * - 주봉: 월요일 시작 기준으로 그룹화
 * - 월봉: YYYY-MM 기준으로 그룹화
 * - 시가=그룹 첫 거래일, 종가=마지막 거래일, 고/저=그룹 내 최대/최소, 거래량=누적
 */
export function aggregateCandles(candles: Candle[], type: CandleType): Candle[] {
  if (type === 'daily' || candles.length === 0) return candles;

  const result: Candle[] = [];
  let currentGroupKey = '';
  let currentCandle: Candle | null = null;

  for (const c of candles) {
    const key = candleGroupKey(c.date, type);

    if (key !== currentGroupKey) {
      if (currentCandle) result.push(currentCandle);
      currentGroupKey = key;
      // 새 그룹의 시작: 시/고/저/종/거래량 모두 현재 캔들 기준으로 초기화
      // 첫 거래일의 날짜를 유지
      currentCandle = {
        date: c.date,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      };
    } else if (currentCandle) {
      currentCandle.high = Math.max(currentCandle.high, c.high);
      currentCandle.low = Math.min(currentCandle.low, c.low);
      currentCandle.close = c.close; // 종가는 마지막 거래일 기준
      currentCandle.volume += c.volume; // 거래량은 누적
    }
  }
  
  if (currentCandle) result.push(currentCandle);

  return result;
}
