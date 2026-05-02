'use client';

/**
 * FavoriteDiscussionFeed
 *
 * 즐겨찾기한 종목들의 최근 토론글을 최신순으로 보여줍니다.
 * 무한 스크롤로 불러오며, 즐겨찾기가 없거나 글이 없으면 안내 문구를 표시합니다.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useFavorites } from '@/contexts/FavoritesContext';
import { PAGE_SIZE } from '@/lib/constants';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import PostCard, {
  type PostCardData,
  type PostCardProfile,
} from './PostCard';

export default function FavoriteDiscussionFeed() {
  const { favorites } = useFavorites();
  const codes = favorites.map((f) => f.code);
  // codes 자체는 매 렌더 새 배열이라 dependency로 쓰면 무한 루프가 남.
  // join한 문자열을 키로 써서 실제 내용이 바뀐 경우만 재호출.
  const codesKey = codes.join(',');

  const [posts, setPosts] = useState<PostCardData[]>([]);
  const [stockMap, setStockMap] = useState<Map<string, string>>(new Map());
  const [profileMap, setProfileMap] = useState<Map<string, PostCardProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(
    async (cursor: string | null) => {
      if (codes.length === 0) {
        return { list: [] as PostCardData[], stocks: [], profiles: [] };
      }
      const supabase = createClient();
      let q = supabase
        .from('posts')
        .select('id, content, created_at, like_count, stock_code, user_id')
        .in('stock_code', codes)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE.FAVORITES);
      if (cursor) q = q.lt('created_at', cursor);

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
          : Promise.resolve({
              data: [] as { id: string; nickname: string; is_premium: boolean }[],
            }),
      ]);

      return {
        list,
        stocks: stocksRes.data ?? [],
        profiles: profilesRes.data ?? [],
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [codesKey],
  );

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
      setHasMore(list.length === PAGE_SIZE.FAVORITES);
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
    setHasMore(list.length === PAGE_SIZE.FAVORITES);
    setLoadingMore(false);
  }, [loadingMore, hasMore, loading, posts, fetchPage]);

  useInfiniteScroll(sentinelRef, loadMore, { enabled: hasMore });

  if (favorites.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/30 px-6 py-10 text-center">
        <Star className="mx-auto mb-3 size-6 text-amber-500" />
        <p className="text-sm text-muted-foreground">
          즐겨찾기한 종목의 토론글이 여기에 표시됩니다.
        </p>
      </div>
    );
  }

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
      <p className="py-10 text-center text-sm text-muted-foreground">
        즐겨찾기 종목에 아직 토론글이 없습니다.
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
