/**
 * 통합 검색 페이지 (서버 컴포넌트)
 *
 * `?q=...` 쿼리 파라미터로 종목과 토론글을 동시에 검색합니다.
 *
 *   - 종목: stocks 테이블의 name / code 를 ILIKE 로 조회 (최대 STOCK_LIMIT)
 *   - 토론글: posts 테이블의 content 를 ILIKE 로 조회 (최대 POST_LIMIT, 최신순)
 *
 * 토론글은 상위 POST_LIMIT개만 보여주고, 더 많이 필요하면
 * `/discussions?q=...`로 넘겨 무한 스크롤을 이용합니다.
 */

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { escapeIlike } from '@/lib/utils';
import { PAGE_SIZE } from '@/lib/constants';
import SearchForm from '@/components/search/SearchForm';
import PostCard from '@/components/discussion/PostCard';
import { MarketBadge } from '@/components/ui/badges';
import type { PostListItem } from '@/types/discussion';

export const metadata = { title: '검색' };

const STOCK_LIMIT = 10;
// 검색 결과의 토론글 최대 표시 수 — 무한 스크롤 피드와 수를 맞춥니다.
const POST_LIMIT = PAGE_SIZE.DEFAULT;

type StockRow = { code: string; name: string; market: 'KOSPI' | 'KOSDAQ' };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';

  if (!query) {
    return (
      <main className="min-h-screen bg-background px-2 py-6 sm:px-6 sm:py-8 font-sans">
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
  const escaped = escapeIlike(query);

  const [stocksRes, postsRes] = await Promise.all([
    supabase
      .from('stocks')
      .select('code, name, market')
      .or(`name.ilike.%${escaped}%,code.ilike.%${escaped}%`)
      .limit(STOCK_LIMIT),
    supabase
      .from('posts')
      .select('id, content, created_at, like_count, stock_code, user_id')
      .ilike('content', `%${escaped}%`)
      .order('created_at', { ascending: false })
      .limit(POST_LIMIT),
  ]);

  const stocks = (stocksRes.data ?? []) as StockRow[];
  const posts = (postsRes.data ?? []) as PostListItem[];

  const stockCodes = [...new Set(posts.map((p) => p.stock_code))];
  const userIds = [...new Set(posts.map((p) => p.user_id))];

  // 토론글 카드에 붙일 메타(종목명·작성자 프로필)를 병렬로 조회합니다.
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

  const hasMorePosts = posts.length === POST_LIMIT;

  return (
    <main className="min-h-screen bg-background px-2 py-6 sm:px-6 sm:py-8 font-sans">
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
                    <MarketBadge market={s.market} className="ml-auto" />
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
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  stockName={stockNameMap.get(post.stock_code)}
                  profile={profileMap.get(post.user_id)}
                />
              ))}
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
