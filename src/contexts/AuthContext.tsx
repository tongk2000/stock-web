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

type AuthContextType = {
  user: User | null
  nickname: string | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [nickname, setNickname] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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

  const signInWithGoogle = async () => {
    const supabase = createClient()
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
