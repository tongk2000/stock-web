'use client';

/**
 * SidebarContext
 *
 * 모바일에서 LeftNav의 열림/닫힘 상태를 전역으로 관리합니다.
 * AppHeader의 햄버거 버튼과 LeftNav가 같은 상태를 공유해야 하므로
 * Context로 분리합니다.
 *
 * 사용처:
 *   - AppHeader  : toggle() 호출로 사이드바 열기/닫기
 *   - LeftNav    : isOpen 읽기, close() 호출로 항목 클릭 시 닫기
 */

import { createContext, useContext, useState } from 'react';

interface SidebarContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
  isOpen: false,
  open: () => {},
  close: () => {},
  toggle: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen((v) => !v),
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => useContext(SidebarContext);
