/**
 * 클라이언트 컴포넌트용 Supabase 클라이언트
 *
 * createBrowserClient는 내부적으로 싱글톤으로 동작하므로
 * 여러 곳에서 createClient()를 호출해도 동일 인스턴스를 반환합니다.
 */

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
