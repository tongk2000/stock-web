'use client';

/**
 * FavoriteStockPrices
 *
 * 즐겨찾기한 종목의 최근 주가 현황을 카드 그리드로 보여줍니다.
 * 각 종목의 최신 2개 일봉(KRX)으로 현재가와 등락률을 계산합니다.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Star, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useFavorites } from '@/contexts/FavoritesContext';
import { cn } from '@/lib/utils';

const POLL_MS = 30_000;

type PriceInfo = {
  close: number;
  change: number;
  changeRate: number;
  date: string;
};

export default function FavoriteStockPrices() {
  const { favorites } = useFavorites();
  const [priceMap, setPriceMap] = useState<Map<string, PriceInfo>>(new Map());
  const [loading, setLoading] = useState(true);

  const codes = useMemo(() => favorites.map((f) => f.code), [favorites]);
  const codesKey = codes.join(',');

  useEffect(() => {
    if (codes.length === 0) {
      setPriceMap(new Map());
      setLoading(false);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    setLoading(true);

    async function fetchDbPrices() {
      const supabase = createClient();
      const { data } = await supabase
        .from('candles')
        .select('stock_code, date, close')
        .in('stock_code', codes)
        .eq('exchange', 'KRX')
        .eq('candle_type', 'daily')
        .order('date', { ascending: false });

      if (cancelled) return;

      const grouped = new Map<string, { date: string; close: number }[]>();
      for (const row of data ?? []) {
        const list = grouped.get(row.stock_code) ?? [];
        if (list.length < 2) {
          list.push({ date: row.date, close: row.close });
          grouped.set(row.stock_code, list);
        }
      }

      const next = new Map<string, PriceInfo>();
      for (const [code, rows] of grouped) {
        const latest = rows[0];
        const prev = rows[1];
        if (!latest) continue;
        const change = prev ? latest.close - prev.close : 0;
        const changeRate = prev ? (change / prev.close) * 100 : 0;
        next.set(code, { close: latest.close, change, changeRate, date: latest.date });
      }
      if (cancelled) return;
      setPriceMap((prev) => new Map([...next, ...prev]));
    }

    async function fetchLivePrices() {
      try {
        const res = await fetch(`/api/stock/today?codes=${encodeURIComponent(codesKey)}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        const prices = data.prices as Record<string, PriceInfo> | undefined;
        if (!prices) return;
        if (cancelled) return;
        setPriceMap((prev) => new Map([...prev, ...Object.entries(prices)]));
      } catch {
        // keep the latest known prices
      }
    }

    (async () => {
      await fetchDbPrices();
      if (cancelled) return;
      await fetchLivePrices();
      if (cancelled) return;
      setLoading(false);
      timer = setInterval(fetchLivePrices, POLL_MS);
    })();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [codes, codesKey]);

  if (favorites.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/30 px-6 py-10 text-center">
        <Star className="mx-auto mb-3 size-6 text-amber-500" />
        <p className="text-sm font-medium text-foreground">즐겨찾기한 종목이 없습니다</p>
        <p className="mt-1 text-xs text-muted-foreground">
          <Link href="/rankings" className="text-blue-500 hover:underline">
            랭킹 페이지
          </Link>
          에서 관심 종목을 찾아 별표를 눌러보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {favorites.map((stock) => {
        const price = priceMap.get(stock.code);
        const isUp = (price?.change ?? 0) > 0;
        const isDown = (price?.change ?? 0) < 0;
        const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
        const colorClass = isUp
          ? 'text-red-500'
          : isDown
            ? 'text-blue-500'
            : 'text-muted-foreground';

        return (
          <Link
            key={stock.code}
            href={`/stocks/${stock.code}`}
            className="group rounded-xl border border-border bg-card/50 p-3 transition-colors hover:bg-accent/50"
          >
            <div className="mb-1 flex items-center justify-between gap-1">
              <span className="truncate text-sm font-semibold text-foreground">
                {stock.name}
              </span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {stock.code}
              </span>
            </div>

            {loading ? (
              <div className="space-y-1.5 pt-1">
                <div className="h-5 w-20 animate-pulse rounded bg-muted" />
                <div className="h-3 w-16 animate-pulse rounded bg-muted" />
              </div>
            ) : price ? (
              <>
                <p className="text-lg font-bold tabular-nums text-foreground">
                  {price.close.toLocaleString()}
                  <span className="ml-0.5 text-xs font-medium text-muted-foreground">원</span>
                </p>
                <div className={cn('mt-0.5 flex items-center gap-1 text-xs tabular-nums', colorClass)}>
                  <Icon size={12} />
                  <span>
                    {isUp ? '+' : ''}
                    {price.change.toLocaleString()}
                  </span>
                  <span className="opacity-80">
                    ({isUp ? '+' : ''}
                    {price.changeRate.toFixed(2)}%)
                  </span>
                </div>
              </>
            ) : (
              <p className="pt-1 text-xs text-muted-foreground">가격 정보 없음</p>
            )}
          </Link>
        );
      })}
    </div>
  );
}
