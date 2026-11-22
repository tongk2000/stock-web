/**
 * 랭킹 허브 (서버 컴포넌트)
 *
 * 4개 대표 랭킹의 미리보기를 카드 형태로 보여줍니다.
 *   - 거래대금 TOP
 *   - 등락률 TOP (상승)
 *   - 토론 핫 종목
 *   - 시가총액 TOP
 *
 * 각 카드 헤더의 링크로 상세 페이지로 이동합니다.
 */

import Link from 'next/link';
import { ArrowRight, BarChart3, Flame, MessageSquareText, TrendingUp } from 'lucide-react';
import RankingTable from '@/components/stock/RankingTable';
import {
  getMoversRanking,
  getTrendingRanking,
  getValuationRanking,
  getVolumeRanking,
} from '@/lib/rankings';
import { RANKING } from '@/lib/constants';

export const metadata = { title: '랭킹' };
export const revalidate = 60; // 1분 캐시

export default async function RankingsHubPage() {
  const previewSize = RANKING.HUB_PREVIEW_SIZE;
  const [volume, gainers, trending, marketCap] = await Promise.all([
    getVolumeRanking('value', previewSize),
    getMoversRanking('gainers', previewSize),
    getTrendingRanking(previewSize),
    getValuationRanking('market_cap', previewSize),
  ]);

  return (
    <main className="min-h-screen bg-background px-3 py-6 sm:px-6 sm:py-8 font-sans">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-2xl font-bold text-foreground">랭킹</h1>

        <div className="grid gap-4 sm:grid-cols-2">
          <HubCard
            href="/rankings/volume"
            title="거래대금 TOP"
            icon={BarChart3}
            metricHeader="거래대금"
            rows={volume}
          />
          <HubCard
            href="/rankings/movers"
            title="등락률 TOP"
            icon={TrendingUp}
            metricHeader="등락률"
            rows={gainers}
          />
          <HubCard
            href="/rankings/trending"
            title="토론 핫 종목"
            icon={Flame}
            metricHeader={`최근 ${RANKING.TRENDING_WINDOW_HOURS}h 글`}
            rows={trending}
          />
          <HubCard
            href="/rankings/valuation"
            title="시가총액 TOP"
            icon={MessageSquareText}
            metricHeader="시총"
            rows={marketCap}
          />
        </div>
      </div>
    </main>
  );
}

function HubCard({
  href,
  title,
  icon: Icon,
  metricHeader,
  rows,
}: {
  href: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  metricHeader: string;
  rows: Awaited<ReturnType<typeof getVolumeRanking>>;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="size-4 text-muted-foreground" />
          {title}
        </h2>
        <Link
          href={href}
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <span>전체 보기</span>
          <ArrowRight size={12} />
        </Link>
      </div>
      <RankingTable rows={rows} metricHeader={metricHeader} />
    </section>
  );
}
