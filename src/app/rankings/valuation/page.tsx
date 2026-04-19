/**
 * 가치/시총 랭킹 (서버 컴포넌트)
 *
 * 탭:
 *   - market_cap : 시가총액 TOP
 *   - low_per    : 저PER (PER > 0 필터)
 *   - low_pbr    : 저PBR (PBR > 0 필터)
 *   - high_roe   : 고ROE
 *
 * 데이터 출처는 v_latest_financials view (종목별 가장 최근 분기).
 */

import RankingTable from '@/components/stock/RankingTable';
import RankingTabs from '@/components/stock/RankingTabs';
import { getValuationRanking } from '@/lib/rankings';
import type { ValuationTab } from '@/types/ranking';

export const metadata = { title: '가치·시총 랭킹' };
export const revalidate = 300; // 재무는 자주 안 바뀌므로 5분

const TABS: { value: ValuationTab; label: string }[] = [
  { value: 'market_cap', label: '시가총액' },
  { value: 'low_per', label: '저PER' },
  { value: 'low_pbr', label: '저PBR' },
  { value: 'high_roe', label: '고ROE' },
];

const VALID = new Set<ValuationTab>(['market_cap', 'low_per', 'low_pbr', 'high_roe']);
const HEADERS: Record<ValuationTab, string> = {
  market_cap: '시총',
  low_per: 'PER',
  low_pbr: 'PBR',
  high_roe: 'ROE',
};

export default async function ValuationRankingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const current: ValuationTab = VALID.has(tab as ValuationTab)
    ? (tab as ValuationTab)
    : 'market_cap';
  const rows = await getValuationRanking(current);

  return (
    <main className="min-h-screen bg-background px-2 py-6 sm:px-6 sm:py-8 font-sans">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-1 text-2xl font-bold text-foreground">가치·시총 랭킹</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          종목별 가장 최근 분기 재무를 기준으로 정렬합니다.
        </p>

        <RankingTabs basePath="/rankings/valuation" current={current} tabs={TABS} />
        <RankingTable rows={rows} metricHeader={HEADERS[current]} />
      </div>
    </main>
  );
}
