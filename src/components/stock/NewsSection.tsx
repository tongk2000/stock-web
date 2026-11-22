/**
 * NewsSection
 *
 * 종목 상세의 "뉴스" 탭 본문입니다. `/api/stocks/[code]/news`의 최근 종목 뉴스를
 * 목록으로 보여주고, 항목을 누르면 원문(네이버 뉴스)을 새 탭으로 엽니다.
 */

'use client';

import { formatRelativeTime } from '@/lib/format';
import { useStockTabData } from '@/hooks/useStockTabData';
import TabStatus from '@/components/stock/TabStatus';

interface NewsItem {
  id: string;
  title: string;
  summary: string | null;
  press: string;
  publishedAt: string;
  imageUrl: string | null;
  url: string;
}

export default function NewsSection({ stockCode }: { stockCode: string }) {
  const { data, loading, error } = useStockTabData<NewsItem>(`/api/stocks/${stockCode}/news`);

  if (loading) return <TabStatus text="불러오는 중..." />;
  if (error || !data) return <TabStatus text="뉴스를 불러오지 못했습니다." />;
  if (data.length === 0) return <TabStatus text="관련 뉴스가 없습니다." />;

  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card">
      {data.map((item) => (
        <li key={item.id}>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-3 px-3 py-3 transition-colors hover:bg-muted/40"
          >
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-medium text-foreground">{item.title}</p>
              {item.summary && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.summary}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {item.press} · {formatRelativeTime(item.publishedAt)}
              </p>
            </div>
            {item.imageUrl && (
              // 외부 뉴스 썸네일 — next/image 원격 도메인 설정 없이 그대로 표시
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt=""
                loading="lazy"
                className="h-16 w-24 shrink-0 rounded object-cover"
              />
            )}
          </a>
        </li>
      ))}
    </ul>
  );
}
