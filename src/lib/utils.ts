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
