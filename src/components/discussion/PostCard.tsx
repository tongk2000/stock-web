/**
 * PostCard
 *
 * 토론글 피드 한 행. /discussions, /search, 즐겨찾기 피드에서 공통으로 사용됩니다.
 *
 * - 이 컴포넌트는 마크업/스타일만 담당하며 데이터 fetch나 상호작용은 부모 책임.
 * - 부모가 stock 이름 / profile 정보를 미리 조회해 props로 넘겨주는 형태로 결합도를 낮춤.
 */

import Link from 'next/link';
import { ThumbsUp } from 'lucide-react';
import { formatRelativeTime } from '@/lib/format';

export interface PostCardData {
  id: string;
  content: string;
  created_at: string;
  like_count: number;
  stock_code: string;
  user_id: string;
}

export interface PostCardProfile {
  nickname: string;
  is_premium: boolean;
}

interface Props {
  post: PostCardData;
  /** 종목명 (없으면 코드를 그대로 노출) */
  stockName?: string;
  /** 작성자 프로필 (없으면 "알 수 없음") */
  profile?: PostCardProfile;
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
          {profile?.is_premium && (
            <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400 ring-1 ring-amber-500/30">
              PRO
            </span>
          )}
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
