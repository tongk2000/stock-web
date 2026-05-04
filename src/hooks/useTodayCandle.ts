'use client';

import { useEffect, useState, useRef } from 'react';
import type { Candle } from '@/types/stock';

const POLL_MS = 30_000;

function kstNow() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

export function isMarketOpen(): boolean {
  const kst = kstNow();
  const day = kst.getUTCDay();
  if (day === 0 || day === 6) return false;
  const mins = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  return mins >= 9 * 60 && mins < 15 * 60 + 30;
}

function isBeforeBatchCollection(): boolean {
  const kst = kstNow();
  const day = kst.getUTCDay();
  if (day === 0 || day === 6) return false;
  const mins = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  return mins >= 9 * 60 && mins < 16 * 60 + 20;
}

export function useTodayCandle(code: string): Candle | null {
  const [candle, setCandle] = useState<Candle | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setCandle(null);

    function stopPolling() {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    async function fetch_(): Promise<boolean> {
      try {
        const res = await fetch(`/api/stock/today/${code}`);
        if (!res.ok) return false;
        const data = await res.json();
        const todayStr = kstNow().toISOString().slice(0, 10);
        if (data.date !== todayStr) return false;
        setCandle(data);
        // 장 종료 확인 → 더 이상 가격이 안 바뀌므로 폴링 중단
        if (!isMarketOpen()) stopPolling();
        return true;
      } catch {
        // network error — keep previous value
        return false;
      }
    }

    // 초기 fetch 후 장중/마감 직후 배치 수집 전까지 30초마다 재확인
    fetch_().then(() => {
      if (isBeforeBatchCollection()) {
        timerRef.current = setInterval(() => {
          if (isBeforeBatchCollection()) {
            fetch_();
          } else {
            stopPolling();
          }
        }, POLL_MS);
      }
    });

    return () => stopPolling();
  }, [code]);

  return candle;
}
