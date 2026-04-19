/**
 * OAuth 콜백 Route Handler
 *
 * Google OAuth 인증 후 리다이렉트되는 엔드포인트입니다.
 *
 * 흐름:
 *   1. URL의 `code` 파라미터로 Supabase 세션 교환
 *   2. 신규 가입(onboarded=false)이면 /auth/setup(닉네임 설정)으로 리다이렉트
 *   3. 기존 유저면 `next` 파라미터(기본 /)로 리다이렉트
 *   4. 인증 실패 시 /?error=auth로 리다이렉트
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/'
  // open redirect 방지 — 내부 경로만 허용
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/'

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

        // 온보딩 미완료(신규 가입)면 닉네임 설정 페이지로 (복귀 경로 전달)
        if (!profile?.onboarded) {
          const setupUrl = new URL('/auth/setup', origin)
          setupUrl.searchParams.set('next', next)
          return NextResponse.redirect(setupUrl.toString())
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`)
}
