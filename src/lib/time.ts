/**
 * KST(한국 표준시) 시간 헬퍼
 *
 * 한국 증시는 모두 KST 기준이므로 앱 곳곳에서 같은 변환 로직을 반복했습니다.
 * (`new Date(Date.now() + 9*60*60*1000)` 패턴이 4개 파일에 흩어져 있었음 →
 * useTodayCandle, market.ts, /api/stock/today/[code], 그리고 단위 변환들)
 * 이 모듈에 한 번만 정의하고 거기서 import 해서 사용합니다.
 *
 * 구현 노트: `kstNow()`가 돌려주는 Date는 "KST 시각을 UTC인 척" 인코딩한 값이라
 * `getUTCHours()`/`getUTCDay()`로 읽어야 KST 기준 시/요일이 나옵니다. (KST 타임존이
 * 시스템 로케일에 잡혀 있지 않아도 동작하도록 만든 트릭이며, `toISOString()` 기반
 * 'YYYY-MM-DD' 추출도 같은 가정 위에서 유효합니다.)
 */

/** UTC와 KST의 시차 (밀리초). KST = UTC+9 */
export const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * 현재 시각을 "KST 시각을 UTC인 척" 인코딩한 Date로 반환합니다.
 * 시/요일 판정에는 반드시 `getUTCHours()`, `getUTCDay()` 등을 써야 합니다.
 */
export function kstNow(): Date {
  return new Date(Date.now() + KST_OFFSET_MS);
}

/** KST 기준 오늘 날짜를 'YYYY-MM-DD' 문자열로 반환 */
export function kstToday(): string {
  return kstNow().toISOString().slice(0, 10);
}

/** KST 기준 오늘이 토/일이면 true */
export function isKstWeekend(): boolean {
  const day = kstNow().getUTCDay();
  return day === 0 || day === 6;
}

/**
 * Naver `localTradedAt`처럼 "2025.05.02" 또는 "2026-05-04T13:36:21+09:00"
 * 형태로 오는 날짜 문자열에서 'YYYY-MM-DD' 부분만 뽑아냅니다.
 * null/undefined/빈 문자열은 빈 문자열로 정규화 — 호출부에서 fallback을 결정합니다.
 */
export function parseTradeDate(raw: string | null | undefined): string {
  return (raw ?? '').replace(/\./g, '-').slice(0, 10);
}
