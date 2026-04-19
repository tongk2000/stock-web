/**
 * RankingTable
 *
 * 랭킹 페이지에서 공용으로 쓰는 종목 리스트 테이블입니다.
 * 서버 컴포넌트에서 import해 그대로 렌더링할 수 있도록 'use client' 없이 작성됩니다.
 *
 * 컬럼 구성:
 *   #순위 | 종목명(코드/시장) | 메트릭(우측, tabular-nums) | 보조 지표들...
 *
 * 행 클릭 시 `/stocks/[code]`로 이동.
 */

import Link from 'next/link';
import { cn } from '@/lib/utils';

export type RankingTableRow = {
  code: string;
  name: string;
  market: 'KOSPI' | 'KOSDAQ';
  metric: string;                 // 포맷팅된 메트릭 문자열 (예: "+12.34%", "1.23조")
  metricTone?: 'up' | 'down' | 'neutral';
  secondary?: { label: string; value: string }[];
};

interface Props {
  rows: RankingTableRow[];
  metricHeader: string;           // 메트릭 컬럼 헤더 (예: "거래대금", "등락률")
  emptyMessage?: string;
}

export default function RankingTable({
  rows,
  metricHeader,
  emptyMessage = '데이터가 없습니다.',
}: Props) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-card/50 px-4 py-10 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/50">
      <div className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 border-b border-border bg-muted/30 px-4 py-2 text-xs font-semibold text-muted-foreground">
        <span>#</span>
        <span>종목</span>
        <span className="text-right">{metricHeader}</span>
      </div>

      <ul>
        {rows.map((row, idx) => (
          <li key={row.code}>
            <Link
              href={`/stocks/${row.code}`}
              className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 border-b border-border/60 px-4 py-3 transition-colors last:border-b-0 hover:bg-accent/50"
            >
              <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                {idx + 1}
              </span>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-foreground">
                    {row.name}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold',
                      row.market === 'KOSPI'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
                    )}
                  >
                    {row.market}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {row.code}
                  </span>
                </div>
                {row.secondary && row.secondary.length > 0 && (
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                    {row.secondary.map((s) => (
                      <span key={s.label}>
                        <span className="opacity-70">{s.label} </span>
                        <span className="tabular-nums text-foreground/80">{s.value}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <span
                className={cn(
                  'shrink-0 text-right text-sm font-semibold tabular-nums',
                  row.metricTone === 'up' && 'text-red-500',
                  row.metricTone === 'down' && 'text-blue-500',
                  (!row.metricTone || row.metricTone === 'neutral') && 'text-foreground',
                )}
              >
                {row.metric}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
