import { describe, expect, it } from 'vitest';
import { isStockCode } from '@/lib/naver';

describe('isStockCode', () => {
  it('6자리 숫자만 통과', () => {
    expect(isStockCode('005930')).toBe(true);
    expect(isStockCode('000000')).toBe(true);
  });

  it('자릿수가 다르면 거부', () => {
    expect(isStockCode('')).toBe(false);
    expect(isStockCode('12345')).toBe(false);
    expect(isStockCode('1234567')).toBe(false);
  });

  it('숫자 아닌 문자가 섞이면 거부', () => {
    expect(isStockCode('00593A')).toBe(false);
    expect(isStockCode('abcdef')).toBe(false);
    expect(isStockCode('005 930')).toBe(false);
    expect(isStockCode('-05930')).toBe(false);
  });

  it('앞뒤 공백·줄바꿈이 붙으면 거부', () => {
    expect(isStockCode(' 005930')).toBe(false);
    expect(isStockCode('005930\n')).toBe(false);
  });
});
