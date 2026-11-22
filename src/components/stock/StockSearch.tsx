/**
 * StockSearch (헤더 검색창)
 *
 * AppHeader 에 고정되는 통합 검색 폼입니다.
 *
 * 동작:
 *   - Enter(또는 폼 submit) 시 `/search?q=...` 로 이동
 *   - 통합 검색 페이지에서 종목과 토론글을 함께 보여줌
 *   - `/search` 방문 시 현재 쿼리를 입력창에 반영
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

/** compact: 데스크톱 헤더(h-14)용 낮은 입력창. 모바일 하단바는 손가락 크기를 위해 기본값 */
export default function StockSearch({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setIsNavigating(false);
    if (pathname === '/search' && typeof window !== 'undefined') {
      setQuery(new URLSearchParams(window.location.search).get('q') ?? '');
    }
  }, [pathname]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setIsNavigating(true);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={handleSubmit} role="search" className="relative w-full max-w-xl">
      <Search
        size={18}
        aria-hidden
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="search"
        name="q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={isNavigating ? '검색 중...' : '종목 · 토론글 검색'}
        disabled={isNavigating}
        className={cn(
          'w-full rounded-xl border border-input bg-card pl-11 pr-10',
          compact ? 'py-2' : 'py-3',
          'text-foreground placeholder:text-muted-foreground outline-none',
          'focus:border-ring focus:ring-1 focus:ring-ring',
          compact ? 'text-sm' : 'text-base',
          'transition-colors',
          isNavigating && 'cursor-wait opacity-70',
        )}
        autoComplete="off"
        spellCheck={false}
        aria-label="종목 및 토론글 검색"
      />
      {isNavigating && (
        <div className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      )}
    </form>
  );
}
