import { describe, expect, it } from 'vitest';
import { parseDecimalOrNull, parseFloat0, parseInt0, parseKrwAmount } from '@/lib/parsers';

describe('parseInt0', () => {
  it('콤마를 지우고 정수로 읽는다', () => {
    expect(parseInt0('1,234,500')).toBe(1234500);
    expect(parseInt0('0')).toBe(0);
  });

  it('음수 부호를 살린다', () => {
    expect(parseInt0('-2,300')).toBe(-2300);
  });

  it('단위 문자는 버린다', () => {
    expect(parseInt0('1,200원')).toBe(1200);
  });

  it('빈 문자열·숫자 없는 문자열·부호만 있는 문자열은 0', () => {
    expect(parseInt0('')).toBe(0);
    expect(parseInt0('abc')).toBe(0);
    expect(parseInt0('-')).toBe(0);
  });

  it('문자열이 아니면 0', () => {
    expect(parseInt0(undefined)).toBe(0);
    expect(parseInt0(null)).toBe(0);
    expect(parseInt0(1234)).toBe(0);
    expect(parseInt0({})).toBe(0);
  });
});

describe('parseFloat0', () => {
  it('콤마를 지우고 소수를 읽는다', () => {
    expect(parseFloat0('1,234.5')).toBe(1234.5);
    expect(parseFloat0('0.25')).toBe(0.25);
  });

  it('부호를 읽는다', () => {
    expect(parseFloat0('-1.5')).toBe(-1.5);
    expect(parseFloat0('+1.5')).toBe(1.5);
  });

  it('뒤에 붙은 단위는 무시한다', () => {
    expect(parseFloat0('1.5%')).toBe(1.5);
  });

  it('읽을 수 없거나 문자열이 아니면 0', () => {
    expect(parseFloat0('')).toBe(0);
    expect(parseFloat0('abc')).toBe(0);
    expect(parseFloat0(undefined)).toBe(0);
    expect(parseFloat0(1.5)).toBe(0);
  });
});

describe('parseDecimalOrNull', () => {
  it('콤마와 단위 문자를 지우고 읽는다', () => {
    expect(parseDecimalOrNull('1,234.5')).toBe(1234.5);
    expect(parseDecimalOrNull('12.3배')).toBe(12.3);
    expect(parseDecimalOrNull('-0.5')).toBe(-0.5);
  });

  it('"0"은 null이 아니라 0', () => {
    expect(parseDecimalOrNull('0')).toBe(0);
  });

  it('빈 값·읽을 수 없는 값은 null', () => {
    expect(parseDecimalOrNull(undefined)).toBeNull();
    expect(parseDecimalOrNull('')).toBeNull();
    expect(parseDecimalOrNull('N/A')).toBeNull();
    expect(parseDecimalOrNull('-')).toBeNull();
  });
});

describe('parseKrwAmount', () => {
  it('억 단위', () => {
    expect(parseKrwAmount('1억')).toBe(100_000_000);
    expect(parseKrwAmount('1,234억')).toBe(123_400_000_000);
  });

  it('조 단위(소수 가능)', () => {
    expect(parseKrwAmount('1.23조')).toBe(1_230_000_000_000);
    expect(parseKrwAmount('-1.5조')).toBe(-1_500_000_000_000);
  });

  it('조와 억이 섞이면 더하고 공백을 무시한다', () => {
    expect(parseKrwAmount('1조 2345억')).toBe(1_234_500_000_000);
    expect(parseKrwAmount('1.23조 4,560억')).toBe(1_686_000_000_000);
  });

  it('단위가 없으면 숫자로 읽는다', () => {
    expect(parseKrwAmount('1234')).toBe(1234);
    expect(parseKrwAmount('1,234,567')).toBe(1234567);
  });

  it('빈 값·읽을 수 없는 값은 null', () => {
    expect(parseKrwAmount(undefined)).toBeNull();
    expect(parseKrwAmount('')).toBeNull();
    expect(parseKrwAmount('N/A')).toBeNull();
  });
});
