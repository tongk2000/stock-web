'use client';

/**
 * DiscussionFeed
 *
 * 모든 종목의 최근 토론 게시글 피드 (무한 스크롤).
 *
 * - 검색어(`query` prop)는 URL 쿼리에서 전달됩니다. prop이 바뀌면 커서를 리셋하고 다시 로드합니다.
 * - 최신순으로 PAGE_SIZE.DEFAULT씩 불러오고, 스크롤이 끝에 닿으면 다음 페이지를 이어 붙입니다.
 * - 카드 클릭 시 토론글 상세 페이지(/discussions/[id])로 이동합니다.
 *
 * 커서/IntersectionObserver/맵 누적 로직은 `useInfinitePosts` 훅으로 추출되어 있고,
 * 카드 렌더링은 `PostCard` 컴포넌트와 공유합니다.
 */

import { useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { escapeIlike } from '@/lib/utils';
import { PAGE_SIZE } from '@/lib/constants';
import { useInfinitePosts, type FetchPageResult } from '@/hooks/useInfinitePosts';
import PostCard from './PostCard';
import type { PostListItem } from '@/types/discussion';

export default function DiscussionFeed({ query = '' }: { query?: string }) {
  // 한 페이지 조회 (cursor = 마지막으로 본 게시글의 created_at, 없으면 첫 페이지)
  const fetchPage = useCallback(
    async (cursor: string | null): Promise<FetchPageResult> => {
      const supabase = createClient();
      let q = supabase
        .from('posts')
        .select('id, content, created_at, like_count, stock_code, user_id')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE.DEFAULT);
      if (cursor) q = q.lt('created_at', cursor);
      if (query) q = q.ilike('content', `%${escapeIlike(query)}%`);

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

  const { posts, stockMap, profileMap, loading, loadingMore, hasMore, sentinelRef } =
    useInfinitePosts({ pageSize: PAGE_SIZE.DEFAULT, fetchPage });

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
