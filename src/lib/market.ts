/**
 * KRX 영업일 판정 유틸리티
 *
 * 오늘이 한국 증시 개장일인지 확인합니다. 즐겨찾기 페이지의
 * "오늘 시세" 표시 등에서 휴장일에는 호출 자체를 생략하기 위해 사용합니다.
 *
 * 주말 → 즉시 false, 평일 → Naver 시세 API의 `localTradedAt`이 오늘과
 * 일치하는지로 판정 (공휴일 캘린더를 별도로 두지 않기 위한 트릭).
 * 결과는 1시간 단위로 캐시되어 반복 호출 비용이 없습니다.
 */

import { unstable_cache } from 'next/cache';
import { isKstWeekend, kstToday, parseTradeDate } from '@/lib/time';

/**
 * 삼성전자(005930)의 마지막 체결일이 인자 날짜와 같으면 영업일로 간주합니다.
 * Next.js의 unstable_cache로 1시간 캐시 — 실제 외부 호출은 시간당 1회 이하.
 * 네트워크 오류 등 확인 불가 시 영업일(true)로 폴백 — 안전 측 (false 반환은 기능 비활성화).
 */
const _checkTradingDay = unstable_cache(
  async (date: string): Promise<boolean> => {
    try {
      const res = await fetch('https://m.stock.naver.com/api/stock/005930/basic', {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        cache: 'no-store',
      });
      if (!res.ok) return true;
      const d = await res.json();
      const marketDate = parseTradeDate(d.localTradedAt);
      return marketDate === date;
    } catch {
      return true;
    }
  },
  ['market-trading-day'],
  { revalidate: 3600 },
);

/** 오늘이 KRX 영업일인지 반환 (주말/공휴일이면 false). */
export async function getIsTradingDay(): Promise<boolean> {
  if (isKstWeekend()) return false;
  return _checkTradingDay(kstToday());
}
