/**
 * TanStack Query 클라이언트 설정
 *
 * - staleTime: `STALE_TIME_MS` (5분). 실시간성이 낮은 종목/캔들 데이터에 적합.
 * - 서버: 매 요청마다 새 인스턴스 생성 (SSR 간 데이터 격리).
 * - 브라우저: 싱글톤으로 유지 (앱 수명 동안 캐시 공유).
 */

import { QueryClient } from "@tanstack/react-query";
import { STALE_TIME_MS } from "@/lib/constants";

/** 새 QueryClient 를 만듭니다. SSR 경로에서는 매 요청마다 이 함수로 새 인스턴스를 얻어야 합니다. */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * 현재 환경에 맞는 QueryClient를 반환합니다.
 *
 * - 서버(RSC/Route Handler): 매번 새 인스턴스 (요청 간 캐시 격리).
 * - 브라우저: 모듈 스코프 싱글톤 (앱 전체가 동일 캐시를 공유).
 *
 * QueryProvider 에서만 호출합니다. 다른 곳에서 직접 import하지 않아도 됩니다.
 */
export function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
