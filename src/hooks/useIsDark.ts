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
