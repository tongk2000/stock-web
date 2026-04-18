/**
 * 홈페이지 — 전체 종목의 최근 토론 피드와 검색을 제공합니다.
 */

import DiscussionFeed from '@/components/discussion/DiscussionFeed';

export default function Home() {
  return (
    <main className="min-h-screen bg-background px-2 py-6 sm:px-6 sm:py-8 font-sans">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold text-foreground">토론방</h1>
        <DiscussionFeed />
      </div>
    </main>
  );
}
