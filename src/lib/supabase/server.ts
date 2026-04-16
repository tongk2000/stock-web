/**
 * 서버 컴포넌트 / Route Handler용 Supabase 클라이언트
 *
 * Next.js의 cookies()를 통해 요청별 세션을 읽고 쓸 수 있습니다.
 * setAll의 try-catch는 서버 컴포넌트(읽기 전용)에서 쿠키 쓰기가
 * 불가능한 경우를 무시하기 위한 것입니다.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // 서버 컴포넌트에서 set 호출 시 무시
          }
        },
      },
    }
  );
}
