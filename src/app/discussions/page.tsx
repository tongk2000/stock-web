/**
 * 토론방 검색 페이지 (서버 컴포넌트)
 *
 * `?q=...` 쿼리 파라미터를 읽어 `DiscussionFeed`에 prop으로 전달합니다.
 * 무한 스크롤은 `DiscussionFeed`(클라이언트)에서 처리합니다.
 */

import DiscussionFeed from '@/components/discussion/DiscussionFeed';
import DiscussionSearchForm from '@/components/discussion/DiscussionSearchForm';

export const metadata = { title: '토론방' };

export default async function DiscussionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';

  return (
    <main className="min-h-screen bg-background px-3 py-6 sm:px-6 sm:py-8 font-sans">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold text-foreground">
          토론방
          {query && (
            <span className="ml-2 text-base font-normal text-muted-foreground">
              &quot;{query}&quot; 검색 결과
            </span>
          )}
        </h1>
        <DiscussionSearchForm defaultValue={query} />
        <DiscussionFeed query={query} />
      </div>
    </main>
  );
}
