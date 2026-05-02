'use client';

import { useEffect, useState, useRef } from 'react';
import type { Candle } from '@/types/stock';

const POLL_MS = 60_000;

function kstNow() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

function isTradingDay(): boolean {
  const day = kstNow().getUTCDay(); // 0=Sun, 6=Sat
  return day !== 0 && day !== 6;
}

export function isMarketOpen(): boolean {
  if (!isTradingDay()) return false;
  const kst = kstNow();
  const mins = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  return mins >= 9 * 60 && mins < 15 * 60 + 30;
}

export function useTodayCandle(code: string): Candle | null {
  const [candle, setCandle] = useState<Candle | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isTradingDay()) return;

    const todayStr = kstNow().toISOString().slice(0, 10);

    async function fetch_() {
      try {
        const res = await fetch(`/api/stock/today/${code}`);
        if (!res.ok) return;
        const data = await res.json();
        // 응답 날짜가 오늘이 아니면 공휴일 — live 데이터로 취급하지 않음
        if (data.date !== todayStr) return;
        setCandle(data);
      } catch {
        // network error — keep previous value
      }
    }

    fetch_();

    timerRef.current = setInterval(() => {
      if (isMarketOpen()) fetch_();
    }, POLL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [code]);

  return candle;
}
