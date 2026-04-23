'use client';

/**
 * BottomBar
 *
 * 모바일 전용 하단 고정 바입니다. 데스크톱에서는 숨김.
 *
 *   - 검색 입력 (StockSearch 재사용)
 *   - 메뉴 토글 버튼 (LeftNav 드로어 열기/닫기)
 *
 * 높이는 h-16(64px) + iOS safe-area-inset-bottom.
 * 콘텐츠가 가리지 않도록 body/main에 동일한 크기의 bottom padding 필요.
 */

import { Menu, X } from 'lucide-react';
import StockSearch from '@/components/stock/StockSearch';
import { useSidebar } from '@/contexts/SidebarContext';

export default function BottomBar() {
  const { isOpen, toggle } = useSidebar();

  return (
    <div
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex h-16 items-center gap-2 px-3">
        <div className="min-w-0 flex-1">
          <StockSearch />
        </div>
        <button
          onClick={toggle}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label={isOpen ? '메뉴 닫기' : '메뉴 열기'}
          aria-expanded={isOpen}
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
    </div>
  );
}
