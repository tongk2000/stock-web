/**
 * QueryProvider
 *
 * TanStack Query의 QueryClientProvider를 클라이언트 컴포넌트로 래핑합니다.
 * layout.tsx에서 LeftNav·페이지 영역을 감싸며, DevTools는 개발 모드에서만 표시됩니다.
 */

"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { getQueryClient } from "@/lib/query-client";

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
