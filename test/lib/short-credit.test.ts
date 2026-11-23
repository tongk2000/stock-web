import { describe, expect, it } from 'vitest';
import { aggregateCandles, candleGroupKey } from '@/lib/indicators';
import {
  alignCreditBalances,
  alignShortSales,
  normalizeCreditBalances,
  normalizeShortSales,
  toNum,
} from '@/lib/short-credit';
import type { Candle, CreditBalance, ShortSale } from '@/types/stock';

function c(date: string, volume = 1000): Candle {
  return { date, open: 100, high: 100, low: 100, close: 100, volume };
}

function ss(date: string, short_volume: number | null, short_volume_ratio: number | null): ShortSale {
  return { date, short_volume, short_value: null, short_volume_ratio, short_value_ratio: null };
}

function cb(date: string, loan_balance_rate: number | null, loan_balance_shares: number | null = 10): CreditBalance {
  return {
    date, loan_balance_shares, loan_balance_amount: null, loan_balance_rate,
    loan_new_shares: null, loan_repay_shares: null, lend_balance_shares: null,
  };
}

describe('candleGroupKey', () => {
  it('일봉은 날짜 그대로', () => {
    expect(candleGroupKey('2026-11-20', 'daily')).toBe('2026-11-20');
  });

  it('월봉은 YYYY-MM', () => {
    expect(candleGroupKey('2026-11-20', 'monthly')).toBe('2026-11');
  });

  it('주봉은 그 주 월요일(일요일은 앞 주)', () => {
    expect(candleGroupKey('2026-11-20', 'weekly')).toBe('2026-11-16'); // 금
    expect(candleGroupKey('2026-11-16', 'weekly')).toBe('2026-11-16'); // 월
    expect(candleGroupKey('2026-11-22', 'weekly')).toBe('2026-11-16'); // 일
  });

  it('주가 해를 넘으면 앞 해 월요일', () => {
    expect(candleGroupKey('2027-01-01', 'weekly')).toBe('2026-12-28');
  });
});

describe('toNum', () => {
  it('문자열 numeric을 숫자로', () => {
    expect(toNum('3.25')).toBe(3.25);
    expect(toNum('1234567890123')).toBe(1234567890123);
  });

  it('0은 0으로 둔다', () => {
    expect(toNum(0)).toBe(0);
    expect(toNum('0')).toBe(0);
  });

  it('null·undefined·빈 문자열·숫자 아님은 null', () => {
    expect(toNum(null)).toBeNull();
    expect(toNum(undefined)).toBeNull();
    expect(toNum('')).toBeNull();
    expect(toNum('abc')).toBeNull();
  });
});

describe('normalizeShortSales / normalizeCreditBalances', () => {
  it('빈 배열은 빈 결과', () => {
    expect(normalizeShortSales([])).toEqual([]);
    expect(normalizeCreditBalances([])).toEqual([]);
  });

  it('문자열 숫자를 바꾸고 날짜순으로 정렬, 날짜 없는 행은 버림', () => {
    const r = normalizeShortSales([
      { date: '2026-11-21', short_volume: '200', short_volume_ratio: '2.50' },
      { date: '2026-11-20', short_volume: 100, short_volume_ratio: null },
      { date: null, short_volume: 1 },
    ]);
    expect(r.map((x) => x.date)).toEqual(['2026-11-20', '2026-11-21']);
    expect(r[1]).toEqual({
      date: '2026-11-21', short_volume: 200, short_value: null, short_volume_ratio: 2.5, short_value_ratio: null,
    });
    expect(r[0].short_volume_ratio).toBeNull();
  });

  it('신용잔고 numeric 문자열을 숫자로', () => {
    const r = normalizeCreditBalances([{ date: '2026-11-20', loan_balance_rate: '0.31', loan_balance_shares: '5000' }]);
    expect(r[0].loan_balance_rate).toBe(0.31);
    expect(r[0].loan_balance_shares).toBe(5000);
    expect(r[0].lend_balance_shares).toBeNull();
  });
});

describe('alignShortSales', () => {
  it('행이나 캔들이 없으면 빈 결과', () => {
    expect(alignShortSales([], [c('2026-11-20')], 'daily')).toEqual([]);
    expect(alignShortSales([ss('2026-11-20', 1, 1)], [], 'daily')).toEqual([]);
  });

  it('일봉은 행의 비중 그대로, 데이터 없는 날은 점을 비움', () => {
    const candles = [c('2026-11-18'), c('2026-11-19'), c('2026-11-20')];
    const rows = [ss('2026-11-18', 50, 5), ss('2026-11-20', 0, 0)];
    expect(alignShortSales(rows, candles, 'daily')).toEqual([
      { time: '2026-11-18', volume: 50, ratio: 5 },
      { time: '2026-11-20', volume: 0, ratio: 0 },
    ]);
  });

  it('일봉에서 비중이 null인 행과 캔들에 없는 날짜의 행은 버림', () => {
    const rows = [ss('2026-11-18', 50, null), ss('2026-11-17', 10, 1)];
    expect(alignShortSales(rows, [c('2026-11-18')], 'daily')).toEqual([]);
  });

  it('주봉은 기간 합계 수량 ÷ 봉 거래량', () => {
    const daily = [c('2026-11-16', 1000), c('2026-11-17', 1000), c('2026-11-23', 500)];
    const weekly = aggregateCandles(daily, 'weekly');
    const rows = [ss('2026-11-16', 100, 10), ss('2026-11-17', 300, 30), ss('2026-11-23', 25, 5)];
    expect(alignShortSales(rows, weekly, 'weekly')).toEqual([
      { time: '2026-11-16', volume: 400, ratio: 20 },
      { time: '2026-11-23', volume: 25, ratio: 5 },
    ]);
  });

  it('월봉: 공매도 행이 없는 달은 점이 없고, 수량이 모두 null이어도 없음', () => {
    const daily = [c('2026-10-30', 100), c('2026-11-02', 100), c('2026-12-01', 100)];
    const monthly = aggregateCandles(daily, 'monthly');
    const rows = [ss('2026-11-02', 10, 10), ss('2026-12-01', null, 3)];
    expect(alignShortSales(rows, monthly, 'monthly')).toEqual([
      { time: '2026-11-02', volume: 10, ratio: 10 },
    ]);
  });

  it('주봉 거래량이 0이면 점을 만들지 않음', () => {
    const weekly = aggregateCandles([c('2026-11-16', 0)], 'weekly');
    expect(alignShortSales([ss('2026-11-16', 10, 1)], weekly, 'weekly')).toEqual([]);
  });
});

describe('alignCreditBalances', () => {
  it('행이 없으면 빈 결과', () => {
    expect(alignCreditBalances([], [c('2026-11-20')], 'daily')).toEqual([]);
  });

  it('일봉은 그날 값, 없는 날(최근 2영업일 등)은 비움', () => {
    const candles = [c('2026-11-18'), c('2026-11-19'), c('2026-11-20')];
    const rows = [cb('2026-11-18', 0.5, 1000)];
    expect(alignCreditBalances(rows, candles, 'daily')).toEqual([
      { time: '2026-11-18', rate: 0.5, shares: 1000 },
    ]);
  });

  it('주봉은 기간 안 잔고율이 있는 마지막 날 값', () => {
    const daily = [c('2026-11-16'), c('2026-11-17'), c('2026-11-18'), c('2026-11-23')];
    const weekly = aggregateCandles(daily, 'weekly');
    const rows = [cb('2026-11-16', 0.1, 1), cb('2026-11-17', 0.2, 2), cb('2026-11-18', null, 3)];
    expect(alignCreditBalances(rows, weekly, 'weekly')).toEqual([
      { time: '2026-11-16', rate: 0.2, shares: 2 },
    ]);
  });

  it('잔고율 0은 점으로 남김', () => {
    expect(alignCreditBalances([cb('2026-11-20', 0, null)], [c('2026-11-20')], 'daily')).toEqual([
      { time: '2026-11-20', rate: 0, shares: null },
    ]);
  });
});
