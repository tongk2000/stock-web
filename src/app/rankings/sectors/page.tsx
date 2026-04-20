/**
 * 섹터 랭킹 (서버 컴포넌트)
 *
 * KRX 업종분류 기준으로 섹터별 등락/거래대금을 집계합니다.
 *
 * 탭:
 *   - weighted_change : 거래대금 가중 등락률 (기본) — 대형주 영향 반영
 *   - total_value     : 거래대금 합계          — 자금 쏠림 중심
 *
 * 각 행 클릭 시 `/rankings/sectors/[name]` 드릴다운으로 이동.
 */

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import RankingTabs from '@/components/stock/RankingTabs';
import { getSectorRanking, type SectorSort } from '@/lib/rankings';
import { formatKRWCompact, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

export const metadata = { title: '섹터 랭킹' };
export const revalidate = 60;

const TABS: { value: SectorSort; label: string }[] = [
  { value: 'weighted_change', label: '가중 등락률' },
  { value: 'total_value', label: '거래대금' },
];

const VALID = new Set<SectorSort>(['weighted_change', 'total_value']);

export default async function SectorsRankingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const current: SectorSort = VALID.has(tab as SectorSort)
    ? (tab as SectorSort)
    : 'weighted_change';
  const rows = await getSectorRanking(current);

  return (
    <main className="min-h-screen bg-background px-2 py-6 sm:px-6 sm:py-8 font-sans">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-1 text-2xl font-bold text-foreground">섹터 랭킹</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          KRX 업종분류 기준. 섹터를 누르면 소속 종목을 볼 수 있습니다.
        </p>

        <RankingTabs basePath="/rankings/sectors" current={current} tabs={TABS} />

        {rows.length === 0 ? (
          <p className="rounded-xl border border-border bg-card/50 px-4 py-10 text-center text-sm text-muted-foreground">
            섹터 데이터가 없습니다.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card/50">
            <div className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 border-b border-border bg-muted/30 px-4 py-2 text-xs font-semibold text-muted-foreground">
              <span>#</span>
              <span>섹터</span>
              <span className="text-right">
                {current === 'weighted_change' ? '가중 등락률' : '거래대금'}
              </span>
            </div>

            <ul>
              {rows.map((r, idx) => {
                const primary =
                  current === 'weighted_change'
                    ? formatPercent(r.weighted_change)
                    : formatKRWCompact(r.total_value);
                const tone =
                  current === 'weighted_change'
                    ? (r.weighted_change ?? 0) > 0
                      ? 'text-red-500'
                      : (r.weighted_change ?? 0) < 0
                        ? 'text-blue-500'
                        : 'text-foreground'
                    : 'text-foreground';

                return (
                  <li key={r.sector}>
                    <Link
                      href={`/rankings/sectors/${encodeURIComponent(r.sector)}`}
                      className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 border-b border-border/60 px-4 py-3 transition-colors last:border-b-0 hover:bg-accent/50"
                    >
                      <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                        {idx + 1}
                      </span>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium text-foreground">
                            {r.sector}
                          </span>
                          <ChevronRight className="size-3 text-muted-foreground/60" />
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                          <span>
                            <span className="opacity-70">종목 </span>
                            <span className="tabular-nums text-foreground/80">
                              {r.stock_count}
                            </span>
                          </span>
                          <span className="tabular-nums">
                            <span className="text-red-500">▲{r.up_count}</span>
                            <span className="mx-1 opacity-40">·</span>
                            <span className="text-blue-500">▼{r.down_count}</span>
                          </span>
                          {current !== 'total_value' && (
                            <span>
                              <span className="opacity-70">거래대금 </span>
                              <span className="tabular-nums text-foreground/80">
                                {formatKRWCompact(r.total_value)}
                              </span>
                            </span>
                          )}
                          {current === 'total_value' && (
                            <span>
                              <span className="opacity-70">가중등락 </span>
                              <span className="tabular-nums text-foreground/80">
                                {formatPercent(r.weighted_change)}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>

                      <span
                        className={cn(
                          'shrink-0 text-right text-sm font-semibold tabular-nums',
                          tone,
                        )}
                      >
                        {primary}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
