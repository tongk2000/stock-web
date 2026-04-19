/**
 * 공통 포맷 유틸리티
 *
 * 날짜/숫자 등 앱 전역에서 공유하는 포맷 함수를 모아둡니다.
 */

/**
 * ISO 날짜 문자열을 상대 시간(예: "방금", "3분 전", "2일 전")으로 변환합니다.
 * 7일 이내면 상대 시간, 이후는 "4월 12일" 형태로 표시합니다.
 */
export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

/**
 * 큰 금액(원)을 한국식 단위로 축약합니다.
 *   1,234       → "1,234"
 *   1,234,000   → "123만"
 *   123_456_789 → "1.23억"
 *   1_234_000_000_000 → "1.23조"
 */
export function formatKRWCompact(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '-';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_0000_0000_0000) return `${sign}${(abs / 1_0000_0000_0000).toFixed(2)}조`;
  if (abs >= 1_0000_0000) return `${sign}${(abs / 1_0000_0000).toFixed(2)}억`;
  if (abs >= 1_0000) return `${sign}${Math.round(abs / 1_0000).toLocaleString()}만`;
  return `${sign}${Math.round(abs).toLocaleString()}`;
}

/**
 * 백분율 표기. 부호 포함, 소수점 자릿수 지정 가능.
 */
export function formatPercent(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return '-';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)}%`;
}

/**
 * 숫자에 천단위 콤마.
 */
export function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value == null || !Number.isFinite(value)) return '-';
  return digits === 0
    ? Math.round(value).toLocaleString()
    : value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}
