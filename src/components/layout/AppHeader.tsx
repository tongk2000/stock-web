'use client';

/**
 * AppHeader
 *
 * 모든 페이지 상단에 표시되는 공통 헤더입니다.
 * layout.tsx에서 렌더링되며 세 가지 역할을 담당합니다.
 *
 *   - 햄버거 버튼 (모바일 전용): SidebarContext.toggle()로 LeftNav 개폐
 *   - 검색창: 종목 검색 후 /stocks/[code] 이동 (StockSearch 재사용)
 *   - 테마 토글: 다크/라이트 전환
 *
 * 높이는 h-14(56px)로 고정. LeftNav의 sticky top 값과 맞춰야 합니다.
 */

import { Menu, Moon, Sun } from 'lucide-react';
import StockSearch from '@/components/stock/StockSearch';
import { useTheme } from '@/components/theme-provider';
import { useSidebar } from '@/contexts/SidebarContext';
import { useScrollAtTop } from '@/hooks/useScrollAtTop';

export default function AppHeader() {
  const { theme, setTheme } = useTheme();
  const { toggle } = useSidebar();
  const isAtTop = useScrollAtTop();

  return (
    <header
      className={`sticky top-0 z-50 h-14 border-b border-border bg-background/95 backdrop-blur-sm transition-transform duration-300 ease-in-out${isAtTop ? '' : ' -translate-y-full'}`}
    >
      <div className="mx-auto flex h-full max-w-none items-center gap-2 px-3 sm:px-4">
        {/* 햄버거 버튼: 모바일에서만 표시 */}
        <button
          onClick={toggle}
          className="sm:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label="메뉴 열기/닫기"
        >
          <Menu size={20} />
        </button>

        {/* 검색창 */}
        <div className="min-w-0 flex-1">
          <StockSearch />
        </div>

        {/* 테마 토글 */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label="테마 전환"
        >
          <Moon className="hidden size-5 dark:block" />
          <Sun className="block size-5 dark:hidden" />
        </button>
      </div>
    </header>
  );
}
