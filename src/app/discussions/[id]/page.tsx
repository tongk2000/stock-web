/**
 * 토론 게시글 상세 페이지 (서버 컴포넌트)
 *
 * URL: /discussions/[id]
 *
 * SEO 인덱싱용 영속 링크. 좋아요·댓글이 많이 붙은 글만 색인되도록
 * generateMetadata에서 engagement 임계값(ENGAGEMENT_THRESHOLD) 미만이면
 * noindex를 반환합니다. 댓글은 기존 클라이언트 컴포넌트를 재사용해 상호작용을 유지합니다.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CommentSection from '@/components/discussion/CommentSection';
import PostLikeButtons from '@/components/discussion/PostLikeButtons';
import { formatRelativeTime } from '@/lib/format';

// 좋아요 또는 댓글이 이 값 이상이어야 검색엔진 색인 허용
const ENGAGEMENT_THRESHOLD = 3;

interface Props {
  params: Promise<{ id: string }>;
}

type PostRow = {
  id: string;
  content: string;
  created_at: string;
  like_count: number;
  dislike_count: number;
  comment_count: number;
  stock_code: string;
  user_id: string;
  profiles:
    | { nickname: string; is_premium: boolean }
    | { nickname: string; is_premium: boolean }[]
    | null;
};

function firstOrNull<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

async function fetchPostWithStock(id: string) {
  const supabase = await createClient();
  const { data: post } = await supabase
    .from('posts')
    .select(
      'id, content, created_at, like_count, dislike_count, comment_count, stock_code, user_id, ' +
        'profiles!posts_user_id_fkey(nickname, is_premium)',
    )
    .eq('id', id)
    .maybeSingle();

  if (!post) return null;
  const row = post as unknown as PostRow;

  const { data: stock } = await supabase
    .from('stocks')
    .select('name, market')
    .eq('code', row.stock_code)
    .maybeSingle();

  return { post: row, stock: (stock as { name: string; market: string } | null) ?? null };
}

function isIndexable(post: PostRow) {
  return post.like_count >= ENGAGEMENT_THRESHOLD || post.comment_count >= ENGAGEMENT_THRESHOLD;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const result = await fetchPostWithStock(id);
  if (!result) {
    return { title: '게시글을 찾을 수 없음', robots: { index: false, follow: false } };
  }
  const { post, stock } = result;
  const profile = firstOrNull(post.profiles);
  const preview = post.content.slice(0, 140).replace(/\s+/g, ' ');
  const stockLabel = stock?.name ?? post.stock_code;
  const nickname = profile?.nickname ?? '';

  return {
    title: `${stockLabel} 토론 — ${nickname}`,
    description: preview,
    alternates: { canonical: `/discussions/${post.id}` },
    robots: isIndexable(post)
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      type: 'article',
      title: `${stockLabel} 토론 — ${nickname}`,
      description: preview,
      publishedTime: post.created_at,
    },
  };
}

export default async function PostDetailPage({ params }: Props) {
  const { id } = await params;
  const result = await fetchPostWithStock(id);
  if (!result) notFound();
  const { post, stock } = result;
  const profile = firstOrNull(post.profiles);

  return (
    <main className="min-h-screen bg-background px-2 py-6 sm:px-6 sm:py-8 font-sans">
      <div className="mx-auto max-w-2xl">
        <nav aria-label="breadcrumb" className="mb-4 text-xs text-muted-foreground">
          <Link href="/discussions" className="hover:text-foreground">
            토론방
          </Link>
          <span className="mx-1.5">›</span>
          <Link href={`/stocks/${post.stock_code}`} className="hover:text-foreground">
            {stock?.name ?? post.stock_code}
          </Link>
        </nav>

        <article className="rounded-xl border border-border bg-card/50 p-5">
          <header className="mb-4 flex flex-wrap items-center gap-2">
            <Link
              href={`/stocks/${post.stock_code}`}
              className="shrink-0 rounded bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80"
            >
              {stock?.name ?? post.stock_code}
            </Link>
            <h1 className="text-sm font-medium text-foreground">
              {profile?.nickname ?? '알 수 없음'}
            </h1>
            {profile?.is_premium && (
              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400 ring-1 ring-amber-500/30">
                PRO
              </span>
            )}
            <time className="text-xs text-muted-foreground" dateTime={post.created_at}>
              {formatRelativeTime(post.created_at)}
            </time>
          </header>

          <p className="whitespace-pre-wrap break-words text-base text-foreground">
            {post.content}
          </p>

          <PostLikeButtons
            postId={post.id}
            authorId={post.user_id}
            initialLikes={post.like_count}
            initialDislikes={post.dislike_count}
            initialComments={post.comment_count}
          />

          <CommentSection postId={post.id} />
        </article>
      </div>
    </main>
  );
}
