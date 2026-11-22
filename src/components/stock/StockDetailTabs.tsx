/**
 * StockDetailTabs
 *
 * 종목 상세 페이지(/stocks/[code])의 하단 탭 컨테이너입니다.
 * 기본 활성 탭은 '토론방' — 사용자가 종목에 들어왔을 때 가장 자주 보는 영역.
 *
 * roomId가 없으면 토론방 탭은 안내 문구만 표시합니다 (공식 토론방 미생성 종목).
 */

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import DiscussionSection from '@/components/discussion/DiscussionSection';
import CompanyInfoSection from '@/components/stock/CompanyInfoSection';
import DisclosureSection from '@/components/stock/DisclosureSection';
import FlowSection from '@/components/stock/FlowSection';
import NewsSection from '@/components/stock/NewsSection';
import QuoteSection from '@/components/stock/QuoteSection';

type TabId = 'info' | 'quote' | 'discussion' | 'news' | 'disclosure' | 'flow';

const TABS: { id: TabId; label: string }[] = [
  { id: 'info', label: '기업정보' },
  { id: 'quote', label: '시세' },
  { id: 'discussion', label: '토론방' },
  { id: 'news', label: '뉴스' },
  { id: 'disclosure', label: '공시' },
  { id: 'flow', label: '수급현황' },
];

interface Props {
  stockCode: string;
  roomId: string | null;
}

export default function StockDetailTabs({ stockCode, roomId }: Props) {
  const [active, setActive] = useState<TabId>('discussion');

  return (
    <section className="mt-6">
      <div className="border-b border-border">
        <div className="-mb-px flex gap-1 overflow-x-auto scrollbar-none">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className={cn(
                'shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                active === tab.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {active === 'info' ? (
          <CompanyInfoSection stockCode={stockCode} />
        ) : active === 'discussion' ? (
          roomId ? (
            <DiscussionSection roomId={roomId} stockCode={stockCode} />
          ) : (
            <Placeholder text="공식 토론방이 없습니다." />
          )
        ) : active === 'quote' ? (
          <QuoteSection stockCode={stockCode} />
        ) : active === 'news' ? (
          <NewsSection stockCode={stockCode} />
        ) : active === 'disclosure' ? (
          <DisclosureSection stockCode={stockCode} />
        ) : (
          <FlowSection stockCode={stockCode} />
        )}
      </div>
    </section>
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-dashed border-border bg-card text-sm text-muted-foreground">
      {text}
    </div>
  );
}