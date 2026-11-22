import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  formatKRWCompact,
  formatNumber,
  formatPercent,
  formatRelativeTime,
} from '@/lib/format';

describe('formatRelativeTime', () => {
  const now = new Date('2026-05-20T12:00:00Z');
  const originalTz = process.env.TZ;

  beforeEach(() => {
    // 월 일 표기는 실행 환경의 시간대를 따르므로 KST로 고정한다.
    process.env.TZ = 'Asia/Seoul';
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });
  afterEach(() => {
    vi.useRealTimers();
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

  it('1분 미만은 방금', () => {
    expect(formatRelativeTime(ago(0))).toBe('방금');
    expect(formatRelativeTime(ago(59_999))).toBe('방금');
  });

  it('미래 시각도 방금으로 본다', () => {
    expect(formatRelativeTime(ago(-5 * 60_000))).toBe('방금');
  });

  it('1분 경계에서 분 단위로 바뀐다', () => {
    expect(formatRelativeTime(ago(60_000))).toBe('1분 전');
    expect(formatRelativeTime(ago(59 * 60_000 + 59_999))).toBe('59분 전');
  });

  it('60분 경계에서 시간 단위로 바뀐다', () => {
    expect(formatRelativeTime(ago(60 * 60_000))).toBe('1시간 전');
    expect(formatRelativeTime(ago(23 * 3_600_000 + 59 * 60_000))).toBe('23시간 전');
  });

  it('24시간 경계에서 일 단위로 바뀐다', () => {
    expect(formatRelativeTime(ago(24 * 3_600_000))).toBe('1일 전');
    expect(formatRelativeTime(ago(6 * 86_400_000 + 23 * 3_600_000))).toBe('6일 전');
  });

  it('7일 이상이면 월 일 표기', () => {
    // 5월 13일 12:00Z = KST 21:00
    expect(formatRelativeTime(ago(7 * 86_400_000))).toBe('5월 13일');
  });
});

describe('formatKRWCompact', () => {
  it('null·undefined·NaN·무한대는 하이픈', () => {
    expect(formatKRWCompact(null)).toBe('-');
    expect(formatKRWCompact(undefined)).toBe('-');
    expect(formatKRWCompact(NaN)).toBe('-');
    expect(formatKRWCompact(Infinity)).toBe('-');
    expect(formatKRWCompact(-Infinity)).toBe('-');
  });

  it('1만 미만은 콤마만', () => {
    expect(formatKRWCompact(0)).toBe('0');
    expect(formatKRWCompact(1234)).toBe('1,234');
    expect(formatKRWCompact(9999)).toBe('9,999');
  });

  it('만 단위는 반올림한 정수', () => {
    expect(formatKRWCompact(10_000)).toBe('1만');
    expect(formatKRWCompact(1_234_000)).toBe('123만');
    expect(formatKRWCompact(12_345)).toBe('1만');
  });

  it('억 단위는 소수 둘째 자리', () => {
    expect(formatKRWCompact(100_000_000)).toBe('1.00억');
    expect(formatKRWCompact(123_456_789)).toBe('1.23억');
  });

  it('조 단위는 소수 둘째 자리', () => {
    expect(formatKRWCompact(1_000_000_000_000)).toBe('1.00조');
    expect(formatKRWCompact(1_234_000_000_000)).toBe('1.23조');
  });

  it('음수는 부호를 앞에 붙인다', () => {
    expect(formatKRWCompact(-1234)).toBe('-1,234');
    expect(formatKRWCompact(-1_234_000)).toBe('-123만');
    expect(formatKRWCompact(-123_456_789)).toBe('-1.23억');
    expect(formatKRWCompact(-1_234_000_000_000)).toBe('-1.23조');
  });
});

describe('formatPercent', () => {
  it('양수에는 + 부호, 기본 소수 둘째 자리', () => {
    expect(formatPercent(1.234)).toBe('+1.23%');
  });

  it('음수는 - 부호', () => {
    expect(formatPercent(-1.234)).toBe('-1.23%');
  });

  it('0은 부호 없이', () => {
    expect(formatPercent(0)).toBe('0.00%');
  });

  it('자릿수를 지정할 수 있다', () => {
    expect(formatPercent(1.5, 0)).toBe('+2%');
    expect(formatPercent(1.5, 1)).toBe('+1.5%');
    expect(formatPercent(-0.126, 3)).toBe('-0.126%');
  });

  it('null·undefined·NaN·무한대는 하이픈', () => {
    expect(formatPercent(null)).toBe('-');
    expect(formatPercent(undefined)).toBe('-');
    expect(formatPercent(NaN)).toBe('-');
    expect(formatPercent(Infinity)).toBe('-');
  });
});

describe('formatNumber', () => {
  it('기본은 반올림한 정수에 천단위 콤마', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
    expect(formatNumber(1234.5)).toBe('1,235');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(-1234)).toBe('-1,234');
  });

  it('digits를 주면 그 자릿수로 고정', () => {
    expect(formatNumber(1234.5, 2)).toBe('1,234.50');
    expect(formatNumber(1234.567, 1)).toBe('1,234.6');
    expect(formatNumber(0, 2)).toBe('0.00');
  });

  it('null·undefined·NaN·무한대는 하이픈', () => {
    expect(formatNumber(null)).toBe('-');
    expect(formatNumber(undefined)).toBe('-');
    expect(formatNumber(NaN, 2)).toBe('-');
    expect(formatNumber(Infinity)).toBe('-');
  });
});
