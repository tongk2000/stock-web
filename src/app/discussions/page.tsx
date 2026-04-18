/**
 * 토론방 피드 페이지
 *
 * 모든 종목의 최근 게시글을 검색/목록 형태로 제공합니다.
 * 홈(`/`)과 동일한 `DiscussionFeed` 컴포넌트를 재사용합니다.
 */

import DiscussionFeed from '@/components/discussion/DiscussionFeed';

export const metadata = { title: '토론방' };

export default function DiscussionsPage() {
  return (
    <main className="min-h-screen bg-background px-2 py-6 sm:px-6 sm:py-8 font-sans">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold text-foreground">토론방</h1>
        <DiscussionFeed />
      </div>
    </main>
  );
}
