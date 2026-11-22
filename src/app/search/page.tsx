/**
 * 통합 검색 페이지 (서버 컴포넌트)
 *
 * `?q=...` 쿼리 파라미터로 종목과 토론글을 동시에 검색합니다.
 *
 *   - 종목: stocks 테이블의 name / code 를 ILIKE 로 조회 (최대 LIMITS.SEARCH_STOCKS)
 *   - 토론글: posts 테이블의 content 를 ILIKE 로 조회 (최대 LIMITS.SEARCH_POSTS, 최신순)
 *
 * 토론글이 상한에 도달하면 `/discussions?q=...`로 넘겨 무한 스크롤을 이용합니다.
 */

import Link from 'next/link';
import { ThumbsUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { LIMITS } from '@/lib/constants';
import SearchForm from '@/components/search/SearchForm';

export const metadata = { title: '검색' };

type StockRow = { code: string; name: string; market: 'KOSPI' | 'KOSDAQ' };
type PostRow = {
  id: string;
  content: string;
  created_at: string;
  like_count: number;
  stock_code: string;
  user_id: string;
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';

  if (!query) {
    return (
      <main className="min-h-screen bg-background px-3 py-6 sm:px-6 sm:py-8 font-sans">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-6 text-2xl font-bold text-foreground">검색</h1>
          <SearchForm defaultValue="" />
          <p className="py-16 text-center text-sm text-muted-foreground">
            종목명, 종목코드, 또는 토론글 내용을 검색해보세요.
          </p>
        </div>
      </main>
    );
  }

  const supabase = await createClient();
  const escaped = query.replace(/([\\%_])/g, '\\$1');

  const [stocksRes, postsRes] = await Promise.all([
    supabase
      .from('stocks')
      .select('code, name, market')
      .or(`name.ilike.%${escaped}%,code.ilike.%${escaped}%`)
      .limit(LIMITS.SEARCH_STOCKS),
    supabase
      .from('posts')
      .select('id, content, created_at, like_count, stock_code, user_id')
      .ilike('content', `%${escaped}%`)
      .order('created_at', { ascending: false })
      .limit(LIMITS.SEARCH_POSTS),
  ]);

  const stocks = (stocksRes.data ?? []) as StockRow[];
  const posts = (postsRes.data ?? []) as PostRow[];

  const stockCodes = [...new Set(posts.map((p) => p.stock_code))];
  const userIds = [...new Set(posts.map((p) => p.user_id))];

  const [stockNameRes, profilesRes] = await Promise.all([
    stockCodes.length
      ? supabase.from('stocks').select('code, name').in('code', stockCodes)
      : Promise.resolve({ data: [] as { code: string; name: string }[] }),
    userIds.length
      ? supabase.from('profiles').select('id, nickname, is_premium').in('id', userIds)
      : Promise.resolve({ data: [] as { id: string; nickname: string; is_premium: boolean }[] }),
  ]);

  const stockNameMap = new Map((stockNameRes.data ?? []).map((s) => [s.code, s.name]));
  const profileMap = new Map(
    (profilesRes.data ?? []).map((p) => [
      p.id,
      { nickname: p.nickname, is_premium: p.is_premium },
    ]),
  );

  const hasMorePosts = posts.length === LIMITS.SEARCH_POSTS;

  return (
    <main className="min-h-screen bg-background px-3 py-6 sm:px-6 sm:py-8 font-sans">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold text-foreground">
          검색
          <span className="ml-2 text-base font-normal text-muted-foreground">
            &quot;{query}&quot; 결과
          </span>
        </h1>

        <SearchForm defaultValue={query} />

        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            종목
            {stocks.length > 0 && (
              <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                {stocks.length}
              </span>
            )}
          </h2>
          {stocks.length === 0 ? (
            <p className="rounded-xl border border-border bg-card/50 px-4 py-6 text-center text-sm text-muted-foreground">
              일치하는 종목이 없습니다.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {stocks.map((s) => (
                <li key={s.code}>
                  <Link
                    href={`/stocks/${s.code}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card/50 px-4 py-3 transition-colors hover:bg-accent/50"
                  >
                    <span className="font-medium text-foreground">{s.name}</span>
                    <span className="text-sm text-muted-foreground">{s.code}</span>
                    <span
                      className={cn(
                        'ml-auto rounded px-1.5 py-0.5 text-xs font-semibold',
                        s.market === 'KOSPI'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
                      )}
                    >
                      {s.market}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            토론글
            {posts.length > 0 && (
              <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                {posts.length}
                {hasMorePosts ? '+' : ''}
              </span>
            )}
          </h2>
          {posts.length === 0 ? (
            <p className="rounded-xl border border-border bg-card/50 px-4 py-6 text-center text-sm text-muted-foreground">
              일치하는 게시글이 없습니다.
            </p>
          ) : (
            <div className="space-y-2">
              {posts.map((post) => {
                const profile = profileMap.get(post.user_id);
                return (
                  <Link
                    key={post.id}
                    href={`/discussions/${post.id}`}
                    className="block rounded-xl border border-border bg-card/50 p-4 transition-colors hover:bg-accent/50"
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="shrink-0 rounded bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                          {stockNameMap.get(post.stock_code) ?? post.stock_code}
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
              {hasMorePosts && (
                <Link
                  href={`/discussions?q=${encodeURIComponent(query)}`}
                  className="block rounded-xl border border-border bg-card/50 px-4 py-3 text-center text-sm text-muted-foreground transition-colors hover:bg-accent/50"
                >
                  더 많은 토론글 보기 →
                </Link>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
