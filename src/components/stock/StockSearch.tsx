'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { Stock } from '@/types/stock';

type SearchResult = Pick<Stock, 'code' | 'name' | 'market'>;

export default function StockSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      const supabase = createClient();
      supabase
        .from('stocks')
        .select('code, name, market')
        .or(`name.ilike.%${q}%,code.ilike.%${q}%`)
        .limit(10)
        .then(({ data }) => {
          setResults(data ?? []);
          setIsOpen(true);
          setActiveIndex(-1);
          setLoading(false);
        });
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  const selectStock = useCallback(
    (code: string) => {
      setIsOpen(false);
      setQuery('');
      setIsNavigating(true);
      router.push(`/stocks/${code}`);
    },
    [router],
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = activeIndex >= 0 ? results[activeIndex] : results[0];
      if (target) selectStock(target.code);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <div className="relative flex items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={isNavigating ? '종목 불러오는 중...' : '종목명 또는 종목코드 검색'}
          disabled={isNavigating}
          className={cn(
            'w-full rounded-xl border border-input bg-card px-5 py-3.5',
            'text-foreground placeholder:text-muted-foreground outline-none',
            'focus:border-ring focus:ring-1 focus:ring-ring',
            'text-base transition-colors',
            isNavigating && 'cursor-wait opacity-70',
          )}
          autoComplete="off"
          spellCheck={false}
        />
        {(loading || isNavigating) && (
          <div className="absolute right-4 h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-foreground" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <ul className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          {results.map((stock, i) => (
            <li key={stock.code}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectStock(stock.code);
                }}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                  i === activeIndex
                    ? 'bg-accent text-accent-foreground'
                    : 'text-foreground hover:bg-accent/60',
                )}
              >
                <span className="font-medium">{stock.name}</span>
                <span className="text-sm text-muted-foreground">{stock.code}</span>
                <span
                  className={cn(
                    'ml-auto rounded px-1.5 py-0.5 text-xs font-semibold',
                    stock.market === 'KOSPI'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
                  )}
                >
                  {stock.market}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {isOpen && !loading && results.length === 0 && query.trim().length > 0 && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-xl">
          검색 결과가 없습니다.
        </div>
      )}
    </div>
  );
}
