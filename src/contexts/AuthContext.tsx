/**
 * AuthContext
 *
 * Supabase Auth 상태를 앱 전역에서 공유하는 Context입니다.
 *
 * 제공 값:
 *   - user     : 현재 로그인한 Supabase User 객체 (비로그인 시 null)
 *   - nickname : profiles 테이블에서 조회한 닉네임
 *   - loading  : 초기 세션 확인 중 여부
 *   - signInWithGoogle : Google OAuth 로그인 실행
 *   - signOut  : 로그아웃 실행
 *
 * layout.tsx에서 AuthProvider로 감싸며,
 * onAuthStateChange 리스너로 세션 변경을 실시간 추적합니다.
 */

'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { STORAGE_KEYS } from '@/lib/constants'

type AuthContextType = {
  user: User | null
  nickname: string | null
  loading: boolean
  signInWithGoogle: (next?: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [nickname, setNickname] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  /** profiles 테이블에서 닉네임을 조회해 상태에 반영합니다. 프로필이 없으면 null. */
  async function fetchNickname(userId: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('id', userId)
      .single()
    setNickname(data?.nickname ?? null)
  }

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) fetchNickname(data.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchNickname(session.user.id)
      } else {
        setNickname(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  /**
   * Google OAuth 로그인 시작.
   *
   * `next` 는 로그인 성공 후 돌아갈 내부 경로입니다. 지정하지 않으면 현재 위치로 복귀합니다.
   * `/auth/*` 자체에서 호출된 경우 루프 방지를 위해 홈(`/`)으로 돌려보냅니다.
   *
   * 복귀 경로는 `redirectTo` 쿼리에 넣지 않고 sessionStorage에 저장합니다.
   * Supabase가 허용하는 리다이렉트 URL은 정확 일치로 검증되기 때문에 쿼리 파라미터가
   * 붙으면 매칭에 실패해 Site URL(로컬호스트 등)로 폴백되는 문제가 있기 때문입니다.
   * 실제 복귀는 `/auth/return` 페이지가 sessionStorage를 읽어 처리합니다.
   *
   * `safeNext` 는 `//evil.com` 같은 프로토콜 상대 URL을 차단해 open-redirect를 막습니다.
   */
  const signInWithGoogle = async (next?: string) => {
    const supabase = createClient()
    const current = `${location.pathname}${location.search}${location.hash}`
    const target = next ?? (location.pathname.startsWith('/auth/') ? '/' : current)
    const safeNext = target.startsWith('/') && !target.startsWith('//') ? target : '/'
    try {
      sessionStorage.setItem(STORAGE_KEYS.POST_AUTH_NEXT, safeNext)
    } catch {}
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    })
  }

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setNickname(null)
  }

  return (
    <AuthContext.Provider value={{ user, nickname, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
