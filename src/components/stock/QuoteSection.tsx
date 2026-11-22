/**
 * QuoteSection
 *
 * 종목 상세의 "시세" 탭 본문입니다. `/api/stocks/[code]/quote`의 최근 20영업일
 * 일별 시세(종가/전일비/등락률/시가/고가/저가/거래량)를 표로 보여줍니다.
 */

'use client';

import { cn } from '@/lib/utils';
import { useStockTabData } from '@/hooks/useStockTabData';
import TabStatus, { signed, toneClass } from '@/components/stock/TabStatus';

interface QuoteRow {
  date: string;
  close: number;
  change: number;
  changeRate: number;
  open: number;
  high: number;
  low: number;
  volume: number;
}

export default function QuoteSection({ stockCode }: { stockCode: string }) {
  const { data, loading, error } = useStockTabData<QuoteRow>(`/api/stocks/${stockCode}/quote`);

  if (loading) return <TabStatus text="불러오는 중..." />;
  if (error || !data) return <TabStatus text="시세를 불러오지 못했습니다." />;
  if (data.length === 0) return <TabStatus text="시세 데이터가 없습니다." />;

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[640px] text-sm tabular-nums">
        <thead className="bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">일자</th>
            <th className="px-3 py-2 text-right font-medium">종가</th>
            <th className="px-3 py-2 text-right font-medium">전일비</th>
            <th className="px-3 py-2 text-right font-medium">등락률</th>
            <th className="px-3 py-2 text-right font-medium">시가</th>
            <th className="px-3 py-2 text-right font-medium">고가</th>
            <th className="px-3 py-2 text-right font-medium">저가</th>
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
              <td className={cn('px-3 py-2 text-right', toneClass(row.changeRate))}>
                {row.changeRate > 0 ? '+' : ''}
                {row.changeRate.toFixed(2)}%
              </td>
              <td className="px-3 py-2 text-right">{row.open.toLocaleString('ko-KR')}</td>
              <td className="px-3 py-2 text-right">{row.high.toLocaleString('ko-KR')}</td>
              <td className="px-3 py-2 text-right">{row.low.toLocaleString('ko-KR')}</td>
              <td className="px-3 py-2 text-right">{row.volume.toLocaleString('ko-KR')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
