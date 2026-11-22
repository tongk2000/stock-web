import { describe, expect, it } from 'vitest';
import { aggregateCandles, calcBB, calcMA, calcOBV, calcRSI } from '@/lib/indicators';
import type { Candle } from '@/types/stock';

/** 종가·거래량만 의미 있는 캔들. 시/고/저는 종가와 같게 둔다. */
function c(date: string, close: number, volume = 100): Candle {
  return { date, open: close, high: close, low: close, close, volume };
}

/** 같은 날짜 간격 없이 종가만 나열한 캔들(지표 계산용). */
function series(closes: number[], volumes?: number[]): Candle[] {
  return closes.map((close, i) =>
    c(`2026-01-${String(i + 1).padStart(2, '0')}`, close, volumes?.[i] ?? 100),
  );
}

describe('calcMA', () => {
  it('빈 배열은 빈 결과', () => {
    expect(calcMA([], 5)).toEqual([]);
  });

  it('기간보다 캔들이 적으면 빈 결과', () => {
    expect(calcMA(series([1, 2]), 3)).toEqual([]);
  });

  it('기간만큼 모이는 첫 날부터 단순 평균', () => {
    const r = calcMA(series([10, 20, 30, 40]), 2);
    expect(r).toEqual([
      { time: '2026-01-02', value: 15 },
      { time: '2026-01-03', value: 25 },
      { time: '2026-01-04', value: 35 },
    ]);
  });

  it('기간이 1이면 종가 그대로', () => {
    expect(calcMA(series([7, 8]), 1).map((p) => p.value)).toEqual([7, 8]);
  });

  it('기간과 캔들 수가 같으면 점 하나', () => {
    expect(calcMA(series([1, 2, 3]), 3)).toEqual([{ time: '2026-01-03', value: 2 }]);
  });
});

describe('calcBB', () => {
  it('빈 배열·기간 미달은 빈 결과', () => {
    expect(calcBB([])).toEqual([]);
    expect(calcBB(series([1, 2, 3]), 20)).toEqual([]);
  });

  it('종가가 모두 같으면 상·중·하단이 같다', () => {
    const r = calcBB(series([5, 5, 5]), 3);
    expect(r).toEqual([{ time: '2026-01-03', upper: 5, middle: 5, lower: 5 }]);
  });

  it('모표준편차(N으로 나눔)로 밴드를 만든다', () => {
    // 평균 2, 분산 2/3
    const [p] = calcBB(series([1, 2, 3]), 3, 2);
    const std = Math.sqrt(2 / 3);
    expect(p.middle).toBe(2);
    expect(p.upper).toBeCloseTo(2 + 2 * std, 10);
    expect(p.lower).toBeCloseTo(2 - 2 * std, 10);
  });

  it('배수를 바꾸면 폭이 비례한다', () => {
    const [p1] = calcBB(series([1, 2, 3]), 3, 1);
    const [p2] = calcBB(series([1, 2, 3]), 3, 2);
    expect(p2.upper - p2.middle).toBeCloseTo(2 * (p1.upper - p1.middle), 10);
  });

  it('한 칸씩 밀리며 점을 만든다', () => {
    const r = calcBB(series([1, 2, 3, 4]), 3);
    expect(r.map((p) => p.time)).toEqual(['2026-01-03', '2026-01-04']);
    expect(r.map((p) => p.middle)).toEqual([2, 3]);
  });
});

describe('calcRSI', () => {
  it('빈 배열·기간 이하는 빈 결과', () => {
    expect(calcRSI([])).toEqual([]);
    expect(calcRSI(series([1, 2]), 2)).toEqual([]);
    expect(calcRSI(series(Array(14).fill(1)))).toEqual([]);
  });

  it('기간보다 하나 더 있으면 점 하나', () => {
    const r = calcRSI(series([10, 11, 10]), 2);
    expect(r).toEqual([{ time: '2026-01-03', value: 50 }]);
  });

  it('계속 오르면 100', () => {
    const r = calcRSI(series([1, 2, 3, 4, 5]), 2);
    expect(r.map((p) => p.value)).toEqual([100, 100, 100]);
  });

  it('계속 내리면 0', () => {
    const r = calcRSI(series([5, 4, 3, 2, 1]), 2);
    expect(r.map((p) => p.value)).toEqual([0, 0, 0]);
  });

  it('Wilder 평활을 적용한다', () => {
    // 첫 평균: gain 0.5, loss 0.5 -> 50. 다음 +2: gain (0.5*1+2)/2=1.25, loss (0.5*1)/2=0.25 -> rs 5
    const r = calcRSI(series([10, 11, 10, 12]), 2);
    expect(r).toHaveLength(2);
    expect(r[0].value).toBe(50);
    expect(r[1].time).toBe('2026-01-04');
    expect(r[1].value).toBeCloseTo(100 - 100 / 6, 10);
  });

  it('값은 0~100 안', () => {
    const r = calcRSI(series([10, 12, 11, 15, 9, 9, 14, 13, 20, 8, 8, 9, 10, 11, 7, 12]));
    expect(r.length).toBeGreaterThan(0);
    for (const p of r) {
      expect(p.value).toBeGreaterThanOrEqual(0);
      expect(p.value).toBeLessThanOrEqual(100);
    }
  });
});

describe('calcOBV', () => {
  it('빈 배열은 빈 결과', () => {
    expect(calcOBV([])).toEqual([]);
  });

  it('첫 날은 그날 거래량', () => {
    expect(calcOBV(series([10], [500]))).toEqual([{ time: '2026-01-01', value: 500 }]);
  });

  it('오르면 더하고 내리면 빼고 같으면 유지', () => {
    const r = calcOBV(series([10, 11, 11, 9, 12], [100, 20, 30, 40, 50]));
    expect(r.map((p) => p.value)).toEqual([100, 120, 120, 80, 130]);
  });

  it('음수까지 내려갈 수 있다', () => {
    const r = calcOBV(series([10, 9], [10, 50]));
    expect(r.map((p) => p.value)).toEqual([10, -40]);
  });
});

describe('aggregateCandles', () => {
  const full = (
    date: string,
    open: number,
    high: number,
    low: number,
    close: number,
    volume: number,
  ): Candle => ({ date, open, high, low, close, volume });

  it('일봉이면 입력을 그대로 돌려준다', () => {
    const input = [c('2026-05-04', 1)];
    expect(aggregateCandles(input, 'daily')).toBe(input);
  });

  it('빈 배열은 빈 결과(주봉·월봉도)', () => {
    expect(aggregateCandles([], 'weekly')).toEqual([]);
    expect(aggregateCandles([], 'monthly')).toEqual([]);
  });

  describe('주봉', () => {
    it('월~금을 한 주로 묶는다: 시가=첫날, 종가=마지막날, 고저=극값, 거래량=합', () => {
      const input = [
        full('2026-05-04', 10, 12, 9, 11, 100), // 월
        full('2026-05-05', 11, 15, 10, 14, 200),
        full('2026-05-06', 14, 14, 8, 9, 300),
        full('2026-05-08', 9, 13, 9, 12, 400), // 금
      ];
      expect(aggregateCandles(input, 'weekly')).toEqual([
        { date: '2026-05-04', open: 10, high: 15, low: 8, close: 12, volume: 1000 },
      ]);
    });

    it('주의 날짜는 그 주 첫 거래일(월요일이 휴장이면 화요일)', () => {
      const r = aggregateCandles([c('2026-05-05', 1), c('2026-05-06', 2)], 'weekly');
      expect(r).toHaveLength(1);
      expect(r[0].date).toBe('2026-05-05');
    });

    it('금요일과 다음 월요일은 다른 주', () => {
      const r = aggregateCandles([c('2026-05-08', 1), c('2026-05-11', 2)], 'weekly');
      expect(r.map((x) => x.date)).toEqual(['2026-05-08', '2026-05-11']);
    });

    it('토요일·일요일은 월요일부터 시작하는 같은 주에 묶인다', () => {
      const r = aggregateCandles(
        [c('2026-05-04', 1), c('2026-05-09', 2), c('2026-05-10', 3), c('2026-05-11', 4)],
        'weekly',
      );
      expect(r).toHaveLength(2);
      expect(r[0]).toMatchObject({ date: '2026-05-04', close: 3, volume: 300 });
      expect(r[1]).toMatchObject({ date: '2026-05-11', close: 4, volume: 100 });
    });

    it('월 경계를 넘는 주는 하나로 묶인다(목 4/30, 금 5/1)', () => {
      const r = aggregateCandles([c('2026-04-30', 1), c('2026-05-01', 2)], 'weekly');
      expect(r).toHaveLength(1);
      expect(r[0]).toMatchObject({ date: '2026-04-30', close: 2 });
    });

    it('연 경계를 넘는 주는 하나로 묶인다(2025-12-31 수, 2026-01-02 금)', () => {
      const r = aggregateCandles([c('2025-12-31', 1), c('2026-01-02', 2)], 'weekly');
      expect(r).toHaveLength(1);
      expect(r[0]).toMatchObject({ date: '2025-12-31', close: 2 });
    });

    it('하루짜리 입력은 그대로 한 봉', () => {
      expect(aggregateCandles([c('2026-05-06', 5, 7)], 'weekly')).toEqual([c('2026-05-06', 5, 7)]);
    });
  });

  describe('월봉', () => {
    it('YYYY-MM으로 묶는다', () => {
      const input = [
        full('2026-04-29', 10, 12, 9, 11, 100),
        full('2026-04-30', 11, 20, 10, 18, 200),
        full('2026-05-01', 18, 19, 5, 6, 300),
        full('2026-05-04', 6, 7, 6, 7, 400),
      ];
      expect(aggregateCandles(input, 'monthly')).toEqual([
        { date: '2026-04-29', open: 10, high: 20, low: 9, close: 18, volume: 300 },
        { date: '2026-05-01', open: 18, high: 19, low: 5, close: 7, volume: 700 },
      ]);
    });

    it('같은 달이 연도만 다르면 다른 봉', () => {
      const r = aggregateCandles([c('2025-05-02', 1), c('2026-05-04', 2)], 'monthly');
      expect(r).toHaveLength(2);
    });
  });

  it('입력 캔들을 바꾸지 않는다', () => {
    const input = [c('2026-05-04', 1, 10), c('2026-05-05', 2, 20)];
    const snapshot = structuredClone(input);
    aggregateCandles(input, 'weekly');
    aggregateCandles(input, 'monthly');
    expect(input).toEqual(snapshot);
  });
});
