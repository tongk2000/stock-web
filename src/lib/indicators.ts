import type { Candle } from '@/types/stock';

// ── 이동평균선 ────────────────────────────────────────────────────────────────

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
