'use client';

/**
 * FavoriteDiscussionFeed
 *
 * 즐겨찾기한 종목들의 최근 토론글을 최신순으로 보여줍니다.
 * 무한 스크롤·카드 렌더링은 각각 `useInfinitePosts` 훅과 `PostCard` 컴포넌트로 공유합니다.
 * 즐겨찾기가 없으면 안내 문구만 표시합니다.
 */

import { useCallback } from 'react';
import { Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useFavorites } from '@/contexts/FavoritesContext';
import { PAGE_SIZE } from '@/lib/constants';
import { useInfinitePosts, type FetchPageResult } from '@/hooks/useInfinitePosts';
import PostCard from './PostCard';
import type { PostListItem } from '@/types/discussion';

export default function FavoriteDiscussionFeed() {
  const { favorites } = useFavorites();
  // 즐겨찾기 목록이 바뀌었을 때 `fetchPage` identity를 바꿔
  // useInfinitePosts가 커서를 리셋하도록 코드 배열을 문자열로 만들어 deps에 사용합니다.
  const codesKey = favorites.map((f) => f.code).join(',');

  const fetchPage = useCallback(
    async (cursor: string | null): Promise<FetchPageResult> => {
      const codes = codesKey ? codesKey.split(',') : [];
      if (codes.length === 0) {
        return { list: [], stocks: [], profiles: [] };
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
      const list = (postsData ?? []) as PostListItem[];
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
    [codesKey],
  );

  const { posts, stockMap, profileMap, loading, loadingMore, hasMore, sentinelRef } =
    useInfinitePosts({
      pageSize: PAGE_SIZE.FAVORITES,
      fetchPage,
      enabled: favorites.length > 0,
    });

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
