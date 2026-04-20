import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Tailwind 클래스 병합 유틸리티.
 *
 * `clsx`로 조건부 클래스 조합을 해결하고, `tailwind-merge`로
 * 충돌하는 Tailwind 유틸리티(예: `p-2`와 `p-4`가 같이 들어올 때)를
 * 뒤쪽 값 기준으로 자동 정리합니다. shadcn/ui 컴포넌트 컨벤션입니다.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Supabase 조인 결과에서 단일 객체를 꺼냅니다.
 *
 * `.select('profiles!fk(...)')` 형태의 조인은 FK 관계 추정에 따라
 * 단일 객체 또는 배열(보통 1개짜리)로 리턴됩니다. 타입 단언이 어려워
 * 이 헬퍼로 일관되게 `T | null` 로 정규화합니다.
 */
export function firstOrNull<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

/**
 * PostgreSQL ILIKE 패턴에서 사용자 입력을 안전하게 이스케이프합니다.
 *
 * `%`, `_`, `\` 를 리터럴로 다루기 위해 앞에 `\` 를 붙입니다.
 * `escapeIlike('50%') -> '50\\%'` 형태가 되어 와일드카드로 해석되지 않습니다.
 */
export function escapeIlike(query: string): string {
  return query.replace(/([\\%_])/g, '\\$1')
}
