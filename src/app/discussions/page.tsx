/**
 * 토론방 피드 페이지 (서버 컴포넌트)
 *
 * 모든 종목의 최근 게시글을 역순으로 50개까지 표시합니다.
 * 각 게시글 카드를 클릭하면 해당 종목 상세 페이지(/stocks/[code])로 이동합니다.
 */

import Link from 'next/link';
import { ThumbsUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatRelativeTime } from '@/lib/format';

export const metadata = { title: '토론방' };

export default async function DiscussionsPage() {
  const supabase = await createClient();

  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, content, created_at, like_count, stock_code, user_id')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) console.error('[discussions] posts query error:', error);

  const stockCodes = [...new Set((posts ?? []).map((p) => p.stock_code))];
  const userIds = [...new Set((posts ?? []).map((p) => p.user_id))];

  const [{ data: stocks }, { data: profiles }] = await Promise.all([
    stockCodes.length
      ? supabase.from('stocks').select('code, name').in('code', stockCodes)
      : Promise.resolve({ data: [] }),
    userIds.length
      ? supabase.from('profiles').select('id, nickname, is_premium').in('id', userIds)
      : Promise.resolve({ data: [] }),
  ]);

  const stockMap = new Map((stocks ?? []).map((s) => [s.code, s.name]));
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return (
    <main className="min-h-screen bg-background px-2 py-6 sm:px-6 sm:py-8 font-sans">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold text-foreground">토론방</h1>

        {!posts || posts.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            아직 게시글이 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            {posts.map((post) => {
              const profile = profileMap.get(post.user_id);
              return (
                <Link
                  key={post.id}
                  href={`/stocks/${post.stock_code}`}
                  className="block rounded-xl border border-border bg-card/50 p-4 transition-colors hover:bg-accent/50"
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0 rounded bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                        {stockMap.get(post.stock_code) ?? post.stock_code}
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
            })}
          </div>
        )}
      </div>
    </main>
  );
}
