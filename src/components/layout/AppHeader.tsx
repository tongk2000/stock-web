'use client';

/**
 * AppHeader
 *
 * 데스크톱 전용 상단 헤더입니다. 모바일에서는 숨겨지고, 검색·메뉴는
 * 하단 BottomBar로, 로그인/로그아웃은 LeftNav 내부로 이동했습니다.
 *
 * 높이는 h-14(56px)로 고정. LeftNav의 sticky top 값과 맞춰야 합니다.
 */

import StockSearch from '@/components/stock/StockSearch';
import { useScrollAtTop } from '@/hooks/useScrollAtTop';

export default function AppHeader() {
  const isAtTop = useScrollAtTop();

  return (
    <header
      className={`hidden sm:block sticky top-0 z-50 h-14 border-b border-border bg-background/95 backdrop-blur-sm transition-transform duration-150 ease-in-out${isAtTop ? '' : ' -translate-y-full'}`}
    >
      <div className="mx-auto flex h-full max-w-none items-center gap-2 px-4 pl-64">
        <div className="min-w-0 flex-1">
          <StockSearch />
        </div>
      </div>
    </header>
  );
}
