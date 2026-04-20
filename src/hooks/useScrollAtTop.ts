'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * 미세한 스크롤 떨림에 헤더가 반응하지 않도록 두는 데드존(px).
 * 이 값보다 큰 변위일 때만 위/아래 판정을 내립니다.
 */
const SCROLL_THRESHOLD = 5;

/**
 * 스크롤 방향에 따라 헤더 표시 여부를 반환합니다.
 * - 최상단: 항상 표시
 * - 위로 스크롤: 표시
 * - 아래로 스크롤: 숨김
 */
export function useScrollAtTop(): boolean {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const diff = currentY - lastScrollY.current;

      if (currentY <= 0) {
        setIsVisible(true);
      } else if (diff < -SCROLL_THRESHOLD) {
        setIsVisible(true);
      } else if (diff > SCROLL_THRESHOLD) {
        setIsVisible(false);
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return isVisible;
}
