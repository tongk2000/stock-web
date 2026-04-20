'use client';

/**
 * useInfinitePosts
 *
 * 토론 피드의 커서 기반 무한 스크롤 로직을 재사용 가능한 형태로 추출한 훅입니다.
 *
 * `fetchPage(cursor)` 를 받아:
 *   - 최초 렌더 시 첫 페이지 로드
 *   - `fetchPage` identity가 바뀌면 (검색어/즐겨찾기 변경 등) 커서를 리셋하고 다시 로드
 *   - sentinel div가 뷰포트에 들어오면 다음 페이지를 이어붙임
 *   - 이미 보여준 게시글은 id 기준 dedup
 *
 * 종목명/프로필은 페이지마다 함께 가져와 각각 Map에 누적합니다.
 *
 * 호출측은 반환된 `sentinelRef`를 목록 맨 아래 div에 붙이면 됩니다.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PostListItem, ProfileInfo } from '@/types/discussion';

type StockRow = { code: string; name: string };
type ProfileRow = { id: string } & ProfileInfo;

export type FetchPageResult = {
  list: PostListItem[];
  stocks: StockRow[];
  profiles: ProfileRow[];
};

export interface UseInfinitePostsOptions {
  /** 한 페이지 크기. 반환된 list가 이 값과 같으면 다음 페이지가 있다고 판단합니다. */
  pageSize: number;
  /** 한 페이지를 가져오는 함수. cursor는 마지막 아이템의 `created_at`. 첫 페이지는 null. */
  fetchPage: (cursor: string | null) => Promise<FetchPageResult>;
  /** false면 초기 로드를 건너뜁니다 (예: 즐겨찾기가 비어있을 때). 기본값 true. */
  enabled?: boolean;
}

export function useInfinitePosts({
  pageSize,
  fetchPage,
  enabled = true,
}: UseInfinitePostsOptions) {
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [stockMap, setStockMap] = useState<Map<string, string>>(new Map());
  const [profileMap, setProfileMap] = useState<Map<string, ProfileInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // 초기/재로드: fetchPage 가 바뀌거나 enabled 토글 시 커서 리셋.
  useEffect(() => {
    if (!enabled) {
      setPosts([]);
      setStockMap(new Map());
      setProfileMap(new Map());
      setHasMore(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setPosts([]);
    setHasMore(true);

    (async () => {
      const { list, stocks, profiles } = await fetchPage(null);
      if (cancelled) return;
      setPosts(list);
      setStockMap(new Map(stocks.map((s) => [s.code, s.name])));
      setProfileMap(
        new Map(profiles.map((p) => [p.id, { nickname: p.nickname, is_premium: p.is_premium }])),
      );
      setHasMore(list.length === pageSize);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchPage, enabled, pageSize]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || loading) return;
    const lastPost = posts[posts.length - 1];
    if (!lastPost) return;
    setLoadingMore(true);
    const { list, stocks, profiles } = await fetchPage(lastPost.created_at);
    setPosts((prev) => {
      const seen = new Set(prev.map((p) => p.id));
      const next = list.filter((p) => !seen.has(p.id));
      return [...prev, ...next];
    });
    setStockMap((prev) => {
      const next = new Map(prev);
      stocks.forEach((s) => next.set(s.code, s.name));
      return next;
    });
    setProfileMap((prev) => {
      const next = new Map(prev);
      profiles.forEach((p) =>
        next.set(p.id, { nickname: p.nickname, is_premium: p.is_premium }),
      );
      return next;
    });
    setHasMore(list.length === pageSize);
    setLoadingMore(false);
  }, [loadingMore, hasMore, loading, posts, fetchPage, pageSize]);

  // 뷰포트 200px 이내로 sentinel이 들어오면 다음 페이지 로드
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  return {
    posts,
    stockMap,
    profileMap,
    loading,
    loadingMore,
    hasMore,
    sentinelRef,
  };
}
