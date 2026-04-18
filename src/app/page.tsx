/**
 * 홈페이지 — 최근 토론 게시글과 검색 폼.
 * 검색 제출 시 `/discussions?q=...`로 이동해 URL 북마크가 가능합니다.
 */

import DiscussionFeed from '@/components/discussion/DiscussionFeed';
import DiscussionSearchForm from '@/components/discussion/DiscussionSearchForm';

export default function Home() {
  return (
    <main className="min-h-screen bg-background px-2 py-6 sm:px-6 sm:py-8 font-sans">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold text-foreground">토론방</h1>
        <DiscussionSearchForm />
        <DiscussionFeed />
      </div>
    </main>
  );
}
