/**
 * OAuth 콜백 Route Handler
 *
 * Google OAuth 인증 후 리다이렉트되는 엔드포인트입니다.
 *
 * 흐름:
 *   1. URL의 `code` 파라미터로 Supabase 세션 교환
 *   2. 신규 가입(onboarded=false)이면 /auth/setup으로 리다이렉트
 *   3. 기존 유저면 /auth/return(sessionStorage에 저장된 경로로 복귀)으로 리다이렉트
 *   4. 인증 실패 시 /?error=auth로 리다이렉트
 *
 * 참고: 복귀 경로는 client의 sessionStorage('post-auth-next')에 저장되어 있음
 * (redirectTo에 쿼리를 붙이면 Supabase 허용 URL 매칭에서 제외될 수 있어 분리)
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  const code = new URL(request.url).searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarded')
          .eq('id', user.id)
          .single()

        // 온보딩 미완료(신규 가입)면 닉네임 설정 페이지로
        if (!profile?.onboarded) {
          return NextResponse.redirect(`${origin}/auth/setup`)
        }
      }

      // 기존 유저 — 클라이언트가 sessionStorage에서 복귀 경로를 읽어 이동
      return NextResponse.redirect(`${origin}/auth/return`)
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`)
}
