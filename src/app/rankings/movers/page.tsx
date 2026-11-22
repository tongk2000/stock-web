/**
 * 등락률 랭킹 (서버 컴포넌트)
 *
 * 탭:
 *   - gainers  : 상승률 TOP
 *   - losers   : 하락률 TOP
 *   - high_52w : 52주 신고가
 *   - low_52w  : 52주 신저가
 */

import RankingTable from '@/components/stock/RankingTable';
import RankingTabs from '@/components/stock/RankingTabs';
import { getMoversRanking } from '@/lib/rankings';
import type { MoversTab } from '@/types/ranking';

export const metadata = { title: '등락률 랭킹' };
export const revalidate = 60;

const TABS: { value: MoversTab; label: string }[] = [
  { value: 'gainers', label: '상승률' },
  { value: 'losers', label: '하락률' },
  { value: 'high_52w', label: '52주 신고가' },
  { value: 'low_52w', label: '52주 신저가' },
];

const VALID = new Set<MoversTab>(['gainers', 'losers', 'high_52w', 'low_52w']);

export default async function MoversRankingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const current: MoversTab = VALID.has(tab as MoversTab) ? (tab as MoversTab) : 'gainers';
  const rows = await getMoversRanking(current);

  const isExtreme = current === 'high_52w' || current === 'low_52w';

  return (
    <main className="min-h-screen bg-background px-3 py-6 sm:px-6 sm:py-8 font-sans">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-1 text-2xl font-bold text-foreground">등락률 랭킹</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          {current === 'gainers' && '오늘 등락률이 가장 높은 종목.'}
          {current === 'losers' && '오늘 등락률이 가장 낮은 종목.'}
          {current === 'high_52w' && '최근 52주(252영업일) 최고가를 경신한 종목.'}
          {current === 'low_52w' && '최근 52주(252영업일) 최저가를 갱신한 종목.'}
        </p>

        <RankingTabs basePath="/rankings/movers" current={current} tabs={TABS} />
        <RankingTable
          rows={rows}
          metricHeader={isExtreme ? (current === 'high_52w' ? '신고가' : '신저가') : '등락률'}
        />
      </div>
    </main>
  );
}
