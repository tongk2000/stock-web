/**
 * 홈페이지 — 즐겨찾기한 종목의 주가 현황과 최근 토론글.
 *
 * - 상단: 즐겨찾기 종목 주가 카드 그리드
 * - 하단: 즐겨찾기 종목의 최근 토론글 피드 (무한 스크롤)
 */

import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import FavoriteStockPrices from '@/components/stock/FavoriteStockPrices';
import FavoriteDiscussionFeed from '@/components/discussion/FavoriteDiscussionFeed';

export default function Home() {
  return (
    <main className="min-h-screen bg-background px-2 py-6 sm:px-6 sm:py-8 font-sans">
      <div className="mx-auto max-w-4xl">
        <section className="mb-10">
          <h1 className="mb-4 text-2xl font-bold text-foreground">내 관심 종목</h1>
          <FavoriteStockPrices />
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between gap-2">
            <h2 className="text-xl font-bold text-foreground">관심 종목 토론</h2>
            <Link
              href="/discussions"
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <MessageSquare size={12} />
              <span>전체 토론 보기</span>
            </Link>
          </div>
          <FavoriteDiscussionFeed />
        </section>
      </div>
    </main>
  );
}
