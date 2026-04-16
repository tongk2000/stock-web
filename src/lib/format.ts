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
