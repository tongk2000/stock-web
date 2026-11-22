import { describe, expect, it } from 'vitest';
import { firstOrNull } from '@/lib/supabase/normalize';

describe('firstOrNull', () => {
  it('단일 객체는 그대로', () => {
    const row = { id: 1 };
    expect(firstOrNull(row)).toBe(row);
  });

  it('배열은 첫 원소', () => {
    const a = { id: 1 };
    const b = { id: 2 };
    expect(firstOrNull([a, b])).toBe(a);
  });

  it('원소가 하나인 배열', () => {
    expect(firstOrNull([{ id: 1 }])).toEqual({ id: 1 });
  });

  it('빈 배열은 null', () => {
    expect(firstOrNull([])).toBeNull();
  });

  it('null·undefined는 null', () => {
    expect(firstOrNull(null)).toBeNull();
    expect(firstOrNull(undefined)).toBeNull();
  });

  it('첫 원소가 undefined인 배열은 null', () => {
    expect(firstOrNull([undefined as unknown as { id: number }])).toBeNull();
  });
});
