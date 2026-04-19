/**
 * 토론 핫 종목 (서버 컴포넌트)
 *
 * 최근 N시간 동안 토론글 수와 좋아요 합계를 가중 합산해 순위를 매깁니다.
 * (RANKING.TRENDING_WINDOW_HOURS 시간 윈도우)
 */

import RankingTable from '@/components/stock/RankingTable';
import { getTrendingRanking } from '@/lib/rankings';
import { RANKING } from '@/lib/constants';

export const metadata = { title: '토론 핫 종목' };
export const revalidate = 60;

export default async function TrendingRankingPage() {
  const rows = await getTrendingRanking();

  return (
    <main className="min-h-screen bg-background px-2 py-6 sm:px-6 sm:py-8 font-sans">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-1 text-2xl font-bold text-foreground">토론 핫 종목</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          최근 {RANKING.TRENDING_WINDOW_HOURS}시간 토론글 수 + 좋아요 가중치 기준.
        </p>

        <RankingTable
          rows={rows}
          metricHeader="글 수"
          emptyMessage={`최근 ${RANKING.TRENDING_WINDOW_HOURS}시간 동안 작성된 글이 없습니다.`}
        />
      </div>
    </main>
  );
}
