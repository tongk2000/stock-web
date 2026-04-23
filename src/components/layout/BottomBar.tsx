'use client';

/**
 * BottomBar
 *
 * 모바일 전용 하단 고정 바입니다. 데스크톱에서는 숨김.
 *
 *   - 검색 입력 (StockSearch 재사용)
 *   - 메뉴 토글 버튼 (LeftNav 드로어 열기/닫기)
 *   - 스크롤 방향에 따라 자동 표시/숨김
 *   - 가상 키보드가 올라오면 바가 키보드 위로 이동 (visualViewport 기반)
 *
 * 높이는 h-16(64px) + iOS safe-area-inset-bottom.
 * 콘텐츠가 가리지 않도록 body/main에 동일한 크기의 bottom padding 필요.
 */

import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import StockSearch from '@/components/stock/StockSearch';
import { useSidebar } from '@/contexts/SidebarContext';
import { useScrollAtTop } from '@/hooks/useScrollAtTop';

export default function BottomBar() {
  const { isOpen, toggle } = useSidebar();
  const isVisible = useScrollAtTop();
  // 키보드가 올라왔을 때 바가 가려지지 않도록 visualViewport 기반 오프셋 계산
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return;
    const update = () => {
      // layout viewport 하단과 visual viewport 하단의 차이 = 키보드 높이
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardOffset(offset);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  // 키보드가 떠 있거나 메뉴가 열려 있을 땐 항상 표시
  const hidden = !isVisible && keyboardOffset === 0 && !isOpen;

  return (
    <div
      className={
        'sm:hidden fixed inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm transition-transform duration-200 ease-in-out ' +
        (hidden ? 'translate-y-full' : 'translate-y-0')
      }
      style={{
        bottom: keyboardOffset,
        paddingBottom: keyboardOffset === 0 ? 'env(safe-area-inset-bottom)' : 0,
      }}
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
