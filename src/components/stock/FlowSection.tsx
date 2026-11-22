/**
 * FlowSection
 *
 * 종목 상세의 "수급현황" 탭 본문입니다. `/api/stocks/[code]/flow`의 최근 20영업일
 * 투자자별 순매수량(개인/외국인/기관)과 외국인 보유율을 표로 보여줍니다.
 */

'use client';

import { cn } from '@/lib/utils';
import { useStockTabData } from '@/hooks/useStockTabData';
import TabStatus, { signed, toneClass } from '@/components/stock/TabStatus';

interface FlowRow {
  date: string;
  close: number;
  change: number;
  volume: number;
  individual: number;
  foreign: number;
  institution: number;
  foreignHoldRatio: number;
}

export default function FlowSection({ stockCode }: { stockCode: string }) {
  const { data, loading, error } = useStockTabData<FlowRow>(`/api/stocks/${stockCode}/flow`);

  if (loading) return <TabStatus text="불러오는 중..." />;
  if (error || !data) return <TabStatus text="수급 정보를 불러오지 못했습니다." />;
  if (data.length === 0) return <TabStatus text="수급 데이터가 없습니다." />;

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[640px] text-sm tabular-nums">
        <thead className="bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">일자</th>
            <th className="px-3 py-2 text-right font-medium">종가</th>
            <th className="px-3 py-2 text-right font-medium">전일비</th>
            <th className="px-3 py-2 text-right font-medium">개인</th>
            <th className="px-3 py-2 text-right font-medium">외국인</th>
            <th className="px-3 py-2 text-right font-medium">기관</th>
            <th className="px-3 py-2 text-right font-medium">외국인 보유율</th>
            <th className="px-3 py-2 text-right font-medium">거래량</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((row) => (
            <tr key={row.date}>
              <td className="px-3 py-2 text-muted-foreground">{row.date.replace(/-/g, '.')}</td>
              <td className={cn('px-3 py-2 text-right font-medium', toneClass(row.change))}>
                {row.close.toLocaleString('ko-KR')}
              </td>
              <td className={cn('px-3 py-2 text-right', toneClass(row.change))}>{signed(row.change)}</td>
              <td className={cn('px-3 py-2 text-right', toneClass(row.individual))}>{signed(row.individual)}</td>
              <td className={cn('px-3 py-2 text-right', toneClass(row.foreign))}>{signed(row.foreign)}</td>
              <td className={cn('px-3 py-2 text-right', toneClass(row.institution))}>{signed(row.institution)}</td>
              <td className="px-3 py-2 text-right">{row.foreignHoldRatio.toFixed(2)}%</td>
              <td className="px-3 py-2 text-right">{row.volume.toLocaleString('ko-KR')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
        순매수 수량 기준(주). 출처: 네이버 증권
      </p>
    </div>
  );
}
