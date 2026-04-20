/**
 * PostCard
 *
 * 토론 피드/검색 결과에서 공통으로 쓰는 게시글 카드입니다.
 * 클릭 시 `/discussions/[id]` 상세 페이지로 이동합니다.
 *
 * DiscussionFeed · FavoriteDiscussionFeed · 검색 페이지에서
 * 동일한 마크업이 반복되던 것을 이 컴포넌트로 통합했습니다.
 * 서버 컴포넌트에서도 import할 수 있도록 `'use client'` 를 두지 않습니다.
 */

import Link from 'next/link';
import { ThumbsUp } from 'lucide-react';
import { formatRelativeTime } from '@/lib/format';
import { PremiumBadge } from '@/components/ui/badges';
import type { PostListItem, ProfileInfo } from '@/types/discussion';

interface Props {
  post: PostListItem;
  /** 종목 코드 → 종목명. 조회 실패 시 카드에는 코드가 그대로 노출됩니다. */
  stockName?: string;
  /** 작성자 프로필. 닉네임이 없으면 '알 수 없음'으로 표시합니다. */
  profile?: ProfileInfo;
}

export default function PostCard({ post, stockName, profile }: Props) {
  return (
    <Link
      href={`/discussions/${post.id}`}
      className="block rounded-xl border border-border bg-card/50 p-4 transition-colors hover:bg-accent/50"
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 rounded bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
            {stockName ?? post.stock_code}
          </span>
          <span className="truncate text-sm font-medium text-foreground">
            {profile?.nickname ?? '알 수 없음'}
          </span>
          {profile?.is_premium && <PremiumBadge />}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatRelativeTime(post.created_at)}
        </span>
      </div>

      <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm text-foreground">
        {post.content}
      </p>

      {post.like_count > 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <ThumbsUp size={11} />
          <span>{post.like_count}</span>
        </div>
      )}
    </Link>
  );
}
