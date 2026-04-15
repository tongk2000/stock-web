'use client';

import { useState, useEffect } from 'react';

/**
 * 페이지가 최상단(scrollY === 0)인지 여부를 반환합니다.
 */
export function useScrollAtTop(): boolean {
  const [isAtTop, setIsAtTop] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setIsAtTop(window.scrollY === 0);
    };

    // 초기 상태 동기화
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return isAtTop;
}
