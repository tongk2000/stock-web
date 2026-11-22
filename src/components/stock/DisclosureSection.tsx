/**
 * DisclosureSection
 *
 * 종목 상세의 "공시" 탭 본문입니다. `/api/stocks/[code]/disclosures`의 최근 공시를
 * 목록으로 보여주고, 항목을 누르면 네이버 공시 상세를 새 탭으로 엽니다.
 */

'use client';

import { useStockTabData } from '@/hooks/useStockTabData';
import TabStatus from '@/components/stock/TabStatus';

interface DisclosureItem {
  id: number;
  title: string;
  source: string;
  publishedAt: string;
  url: string;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul',
  });
}

export default function DisclosureSection({ stockCode }: { stockCode: string }) {
  const { data, loading, error } = useStockTabData<DisclosureItem>(
    `/api/stocks/${stockCode}/disclosures`,
  );

  if (loading) return <TabStatus text="불러오는 중..." />;
  if (error || !data) return <TabStatus text="공시를 불러오지 못했습니다." />;
  if (data.length === 0) return <TabStatus text="최근 공시가 없습니다." />;

  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card">
      {data.map((item) => (
        <li key={item.id}>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-3 py-3 transition-colors hover:bg-muted/40"
          >
            <p className="text-sm font-medium text-foreground">{item.title}</p>
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">
              {item.source} · {formatDateTime(item.publishedAt)}
            </p>
          </a>
        </li>
      ))}
    </ul>
  );
}
