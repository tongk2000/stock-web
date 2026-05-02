'use client';

/**
 * DiscussionFeed
 *
 * 모든 종목의 최근 토론 게시글 피드 (무한 스크롤).
 *
 * - 검색어(`query` prop)는 URL 쿼리에서 전달됩니다. prop이 바뀌면 커서를 리셋하고 다시 로드합니다.
 * - 최신순으로 PAGE_SIZE.DEFAULT씩 불러오고, 스크롤이 끝에 닿으면 다음 페이지를 이어 붙입니다.
 * - 카드 클릭 시 토론글 상세 페이지(/discussions/[id])로 이동합니다.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PAGE_SIZE } from '@/lib/constants';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import PostCard, {
  type PostCardData,
  type PostCardProfile,
} from './PostCard';

export default function DiscussionFeed({ query = '' }: { query?: string }) {
  const [posts, setPosts] = useState<PostCardData[]>([]);
  const [stockMap, setStockMap] = useState<Map<string, string>>(new Map());
  const [profileMap, setProfileMap] = useState<Map<string, PostCardProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // 한 페이지 조회 (cursor = 마지막으로 본 게시글의 created_at, 없으면 첫 페이지)
  const fetchPage = useCallback(
    async (cursor: string | null) => {
      const supabase = createClient();
      let q = supabase
        .from('posts')
        .select('id, content, created_at, like_count, stock_code, user_id')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE.DEFAULT);
      if (cursor) q = q.lt('created_at', cursor);
      if (query) {
        // % _ \ 는 ILIKE 메타문자라 사용자 입력에 그대로 두면 안 됨
        const escaped = query.replace(/([\\%_])/g, '\\$1');
        q = q.ilike('content', `%${escaped}%`);
      }

      const { data: postsData } = await q;
      const list = (postsData ?? []) as PostCardData[];
      const stockCodes = [...new Set(list.map((p) => p.stock_code))];
      const userIds = [...new Set(list.map((p) => p.user_id))];

      const [stocksRes, profilesRes] = await Promise.all([
        stockCodes.length
          ? supabase.from('stocks').select('code, name').in('code', stockCodes)
          : Promise.resolve({ data: [] as { code: string; name: string }[] }),
        userIds.length
          ? supabase.from('profiles').select('id, nickname, is_premium').in('id', userIds)
          : Promise.resolve({ data: [] as { id: string; nickname: string; is_premium: boolean }[] }),
      ]);

      return {
        list,
        stocks: stocksRes.data ?? [],
        profiles: profilesRes.data ?? [],
      };
    },
    [query],
  );

  // 검색어 변경 시 처음부터 다시 로드
  useEffect(() => {
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
      setHasMore(list.length === PAGE_SIZE.DEFAULT);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || loading) return;
    const lastPost = posts[posts.length - 1];
    if (!lastPost) return;
    setLoadingMore(true);
    const { list, stocks, profiles } = await fetchPage(lastPost.created_at);
    setPosts((prev) => {
      // 같은 created_at 경계에서 중복이 들어올 수 있어 id로 dedup
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
      profiles.forEach((p) => next.set(p.id, { nickname: p.nickname, is_premium: p.is_premium }));
      return next;
    });
    setHasMore(list.length === PAGE_SIZE.DEFAULT);
    setLoadingMore(false);
  }, [loadingMore, hasMore, loading, posts, fetchPage]);

  useInfiniteScroll(sentinelRef, loadMore, { enabled: hasMore });

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        {query ? `"${query}"에 해당하는 게시글이 없습니다.` : '아직 게시글이 없습니다.'}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          stockName={stockMap.get(post.stock_code)}
          profile={profileMap.get(post.user_id)}
        />
      ))}

      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          {loadingMore && (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
          )}
        </div>
      )}
    </div>
  );
}
