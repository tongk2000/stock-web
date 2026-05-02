'use client';

/**
 * useInfiniteScroll
 *
 * 센티넬 엘리먼트가 뷰포트에 들어오면 콜백을 호출해 다음 페이지를 로드합니다.
 *
 * 사용법:
 *   const sentinelRef = useRef<HTMLDivElement>(null);
 *   useInfiniteScroll(sentinelRef, loadMore);
 *   ...
 *   <div ref={sentinelRef} />
 *
 * 콜백은 자체적으로 중복 실행 방어(loading/loadingMore 플래그)를 갖고 있어야 합니다.
 * 이 훅은 단순히 "센티넬이 보이면 콜백" 만 책임집니다.
 */

import { useEffect, type RefObject } from 'react';

interface Options {
  /** IntersectionObserver의 rootMargin (기본값: "200px" — 끝에 닿기 전 미리 로드) */
  rootMargin?: string;
  /** false면 옵저버 등록을 건너뜁니다 (예: hasMore=false). 기본 true */
  enabled?: boolean;
}

export function useInfiniteScroll(
  sentinelRef: RefObject<HTMLElement | null>,
  onIntersect: () => void,
  { rootMargin = '200px', enabled = true }: Options = {},
): void {
  useEffect(() => {
    if (!enabled) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onIntersect();
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [sentinelRef, onIntersect, rootMargin, enabled]);
}
