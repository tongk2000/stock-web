/**
 * Supabase 조인 결과 정규화 유틸리티
 *
 * Supabase JS는 외래키 조인(`profiles!fk(...)`)의 결과를 관계 종류에 따라
 * 단일 객체 또는 1개짜리 배열로 돌려줄 수 있고, 매칭이 없으면 null을 반환합니다.
 * 호출부마다 `Array.isArray(...)` 분기를 다시 쓰지 않도록 한 곳에 모았습니다.
 */

/**
 * 단일 객체 / 객체 배열 / null 어느 형태든 받아 첫 원소(또는 그 자체)를 반환합니다.
 * 빈 배열, null, undefined는 모두 null로 정규화합니다.
 *
 * @example
 * const profile = firstOrNull(row.profiles); // T | null
 */
export function firstOrNull<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}
