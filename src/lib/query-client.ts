/**
 * TanStack Query 클라이언트 설정
 *
 * - staleTime 5분: 캔들/종목 데이터가 실시간이 아니므로 적절한 캐시 유지
 * - 서버: 매 요청마다 새 인스턴스 생성 (SSR 간 데이터 격리)
 * - 브라우저: 싱글톤으로 유지 (앱 수명 동안 캐시 공유)
 */

import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
