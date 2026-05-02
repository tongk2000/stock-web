'use client';

import { useEffect, useState, useRef } from 'react';
import type { Candle } from '@/types/stock';

const POLL_MS = 60_000;

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

// isTradingDay: 서버에서 판별 후 내려온 값. false면 fetch 자체를 하지 않음
export function useTodayCandle(code: string, isTradingDay: boolean): Candle | null {
  const [candle, setCandle] = useState<Candle | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isTradingDay) return;

    const todayStr = kstNow().toISOString().slice(0, 10);

    function stopPolling() {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    async function fetch_() {
      try {
        const res = await fetch(`/api/stock/today/${code}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.date !== todayStr) return;
        setCandle(data);
        // 장 종료 확인 → 더 이상 가격이 안 바뀌므로 폴링 중단
        if (!isMarketOpen()) stopPolling();
      } catch {
        // network error — keep previous value
      }
    }

    // 초기 fetch 후 장이 열려있을 때만 폴링 시작
    fetch_().then(() => {
      if (isMarketOpen()) {
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
  }, [code, isTradingDay]);

  return candle;
}
