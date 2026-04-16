/**
 * 현재 다크모드 여부를 반환하는 훅
 *
 * <html> 요소의 class 속성('dark')을 MutationObserver로 감시하여
 * ThemeProvider가 테마를 변경할 때 즉시 반응합니다.
 * CandleChart의 차트 테마 색상 결정에 사용됩니다.
 */

'use client';

import { useEffect, useState } from 'react';

export function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    const update = () => setIsDark(document.documentElement.classList.contains('dark'));

    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, { attributeFilter: ['class'] });

    return () => mo.disconnect();
  }, []);

  return isDark;
}
