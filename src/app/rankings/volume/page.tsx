/**
 * 거래량 랭킹 (서버 컴포넌트)
 *
 * 탭:
 *   - value : 거래대금 TOP (close * volume)
 *   - surge : 거래량 급증 (오늘 / 직전 N일 평균)
 */

import RankingTable from '@/components/stock/RankingTable';
import RankingTabs from '@/components/stock/RankingTabs';
import { getVolumeRanking } from '@/lib/rankings';
import { RANKING } from '@/lib/constants';
import type { VolumeTab } from '@/types/ranking';

export const metadata = { title: '거래량 랭킹' };
export const revalidate = 60;

const TABS: { value: VolumeTab; label: string }[] = [
  { value: 'value', label: '거래대금' },
  { value: 'surge', label: '거래량 급증' },
];

export default async function VolumeRankingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const current: VolumeTab = tab === 'surge' ? 'surge' : 'value';
  const rows = await getVolumeRanking(current);

  return (
    <main className="min-h-screen bg-background px-2 py-6 sm:px-6 sm:py-8 font-sans">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-1 text-2xl font-bold text-foreground">거래량 랭킹</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          {current === 'value'
            ? '오늘 거래대금(종가 × 거래량)이 큰 종목 순.'
            : `오늘 거래량 ÷ 직전 ${RANKING.VOLUME_SURGE_LOOKBACK_DAYS}영업일 평균이 높은 순.`}
        </p>

        <RankingTabs basePath="/rankings/volume" current={current} tabs={TABS} />
        <RankingTable
          rows={rows}
          metricHeader={current === 'value' ? '거래대금' : '평균 대비'}
        />
      </div>
    </main>
  );
}
