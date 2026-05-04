/**
 * useTodayCandle
 *
 * 종목코드를 받아 "오늘의 캔들"(시가/고가/저가/종가/거래량 + 'YYYY-MM-DD' 날짜)을 폴링합니다.
 * 차트와 종목 상세에서 장중 실시간 표시에 쓰입니다.
 *
 * 폴링 정책:
 *  - 마운트 직후 1회 호출 → 그 후 장중 + 마감 직후 배치 수집(16:20 KST) 전까지만 30초 주기.
 *  - 16:20 이후엔 백엔드 배치가 candles 테이블에 일봉을 넣어 주므로 폴링 불필요.
 *  - 장 마감 시각(15:30)을 넘으면 더 이상 가격이 변하지 않아 즉시 폴링 중단.
 *
 * 네트워크 오류는 조용히 무시하고 직전 값을 유지합니다 (UX 보호).
 */
'use client';

import { useEffect, useState, useRef } from 'react';
import type { Candle } from '@/types/stock';
import { kstNow, kstToday } from '@/lib/time';
import { LIVE_CANDLE_POLL_MS } from '@/lib/constants';

/** KST 09:00–15:30 사이면 true (= 정규장 개장 중) */
export function isMarketOpen(): boolean {
  const kst = kstNow();
  const day = kst.getUTCDay();
  if (day === 0 || day === 6) return false;
  const mins = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  return mins >= 9 * 60 && mins < 15 * 60 + 30;
}

/**
 * KST 09:00–16:20 사이면 true.
 * 16:20은 백엔드 배치가 일봉을 collect 하기 직전의 cutoff 입니다.
 * 그 시각 전까지는 Naver 실시간 가격이 더 신선하므로 폴링을 유지합니다.
 */
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
        // 응답 날짜가 오늘이 아니면 (직전 영업일 캐시) 무시
        if (data.date !== kstToday()) return false;
        setCandle(data);
        // 장 종료 확인 → 더 이상 가격이 안 바뀌므로 폴링 중단
        if (!isMarketOpen()) stopPolling();
        return true;
      } catch {
        // 네트워크 오류 — 직전 값을 유지하고 다음 폴링을 기다림
        return false;
      }
    }

    // 초기 fetch 후 장중/마감 직후 배치 수집 전까지 LIVE_CANDLE_POLL_MS 주기로 재확인
    fetch_().then(() => {
      if (isBeforeBatchCollection()) {
        timerRef.current = setInterval(() => {
          if (isBeforeBatchCollection()) {
            fetch_();
          } else {
            stopPolling();
          }
        }, LIVE_CANDLE_POLL_MS);
      }
    });

    return () => stopPolling();
  }, [code]);

  return candle;
}
