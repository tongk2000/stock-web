import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KST_OFFSET_MS, isKstWeekend, kstNow, kstToday, parseTradeDate } from '@/lib/time';

// 2026-05-04는 월요일, 05-08 금, 05-09 토, 05-10 일.
describe('KST 시각 헬퍼', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('KST_OFFSET_MS는 9시간', () => {
    expect(KST_OFFSET_MS).toBe(9 * 3600 * 1000);
  });

  it('kstNow는 UTC보다 9시간 앞선 값을 UTC 필드로 읽게 한다', () => {
    vi.setSystemTime(new Date('2026-05-04T00:30:00Z'));
    const d = kstNow();
    expect(d.getUTCHours()).toBe(9);
    expect(d.getUTCMinutes()).toBe(30);
    expect(d.getUTCDay()).toBe(1);
  });

  describe('kstToday', () => {
    it('KST 자정 직전(UTC 14:59:59)은 같은 날', () => {
      vi.setSystemTime(new Date('2026-05-04T14:59:59Z'));
      expect(kstToday()).toBe('2026-05-04');
    });

    it('KST 자정(UTC 15:00:00)에 다음 날로 넘어간다', () => {
      vi.setSystemTime(new Date('2026-05-04T15:00:00Z'));
      expect(kstToday()).toBe('2026-05-05');
    });

    it('UTC로는 아직 전날인 KST 아침도 KST 날짜를 돌려준다', () => {
      vi.setSystemTime(new Date('2026-05-03T16:00:00Z'));
      expect(kstToday()).toBe('2026-05-04');
    });

    it('연말 경계', () => {
      vi.setSystemTime(new Date('2025-12-31T15:00:00Z'));
      expect(kstToday()).toBe('2026-01-01');
    });
  });

  describe('isKstWeekend', () => {
    it('평일 낮은 false', () => {
      vi.setSystemTime(new Date('2026-05-04T03:00:00Z'));
      expect(isKstWeekend()).toBe(false);
    });

    it('금요일 KST 23:59:59는 false', () => {
      vi.setSystemTime(new Date('2026-05-08T14:59:59Z'));
      expect(isKstWeekend()).toBe(false);
    });

    it('토요일 KST 00:00(금요일 UTC 15:00)부터 true', () => {
      vi.setSystemTime(new Date('2026-05-08T15:00:00Z'));
      expect(isKstWeekend()).toBe(true);
    });

    it('일요일 KST 23:59:59는 true', () => {
      vi.setSystemTime(new Date('2026-05-10T14:59:59Z'));
      expect(isKstWeekend()).toBe(true);
    });

    it('월요일 KST 00:00(일요일 UTC 15:00)부터 false', () => {
      vi.setSystemTime(new Date('2026-05-10T15:00:00Z'));
      expect(isKstWeekend()).toBe(false);
    });
  });
});

describe('parseTradeDate', () => {
  it('점 표기를 하이픈으로 바꾼다', () => {
    expect(parseTradeDate('2025.05.02')).toBe('2025-05-02');
  });

  it('ISO 시각에서 날짜만 뽑는다', () => {
    expect(parseTradeDate('2026-05-04T13:36:21+09:00')).toBe('2026-05-04');
  });

  it('이미 YYYY-MM-DD면 그대로', () => {
    expect(parseTradeDate('2026-05-04')).toBe('2026-05-04');
  });

  it('null·undefined·빈 문자열은 빈 문자열', () => {
    expect(parseTradeDate(null)).toBe('');
    expect(parseTradeDate(undefined)).toBe('');
    expect(parseTradeDate('')).toBe('');
  });
});
