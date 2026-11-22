'use client';

/**
 * AppHeader
 *
 * 데스크톱 전용 상단 헤더입니다. 모바일에서는 숨겨지고, 검색·메뉴는
 * 하단 BottomBar로, 로그인/로그아웃은 LeftNav 내부로 이동했습니다.
 *
 * 높이는 h-14(56px)로 고정. LeftNav의 sticky top 값과 맞춰야 합니다.
 */

import Link from 'next/link';
import { TrendingUp } from 'lucide-react';
import StockSearch from '@/components/stock/StockSearch';
import { useScrollAtTop } from '@/hooks/useScrollAtTop';

export default function AppHeader() {
  const isAtTop = useScrollAtTop();

  return (
    <header
      className={`hidden sm:block sticky top-0 z-50 h-14 border-b border-border bg-background/95 backdrop-blur-sm transition-transform duration-150 ease-in-out${isAtTop ? '' : ' -translate-y-full'}`}
    >
      <div className="flex h-full items-center">
        {/* LeftNav(w-64) 바로 위 칸. 모바일 드로어 머리의 브랜드와 같은 모양 */}
        <Link
          href="/"
          className="flex h-full w-64 shrink-0 items-center gap-2 px-5 font-bold text-foreground transition-colors hover:text-foreground/80"
        >
          <TrendingUp className="size-5 text-sidebar-primary" />
          <span className="text-lg">주식 앱</span>
        </Link>
        <div className="min-w-0 flex-1 px-4">
          <StockSearch compact />
        </div>
      </div>
    </header>
  );
}
