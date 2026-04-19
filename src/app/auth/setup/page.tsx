/**
 * 온보딩 — 닉네임 설정 페이지
 *
 * 신규 가입 시 /auth/callback에서 리다이렉트됩니다.
 * 닉네임(2~20자)을 입력받아 profiles 테이블에 저장하고
 * onboarded=true로 업데이트한 뒤 ?next= 경로(없으면 홈)로 이동합니다.
 *
 * 에러 처리:
 *   - 닉네임 길이 검증 (2~20자)
 *   - 중복 닉네임 (PostgreSQL unique violation: 23505)
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function consumeNextPath(): string {
  if (typeof window === 'undefined') return '/'
  let raw: string | null = null
  try {
    raw = sessionStorage.getItem('post-auth-next')
    sessionStorage.removeItem('post-auth-next')
  } catch {}
  const target = raw ?? '/'
  // open redirect 방지 — 내부 경로만 허용
  return target.startsWith('/') && !target.startsWith('//') ? target : '/'
}

export default function SetupPage() {
  const router = useRouter()
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmed = nickname.trim()
    if (trimmed.length < 2) {
      setError('닉네임은 2글자 이상이어야 해요.')
      return
    }
    if (trimmed.length > 20) {
      setError('닉네임은 20글자 이하여야 해요.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.replace(consumeNextPath())
      return
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ nickname: trimmed, onboarded: true })
      .eq('id', user.id)

    if (updateError) {
      if (updateError.code === '23505') {
        setError('이미 사용 중인 닉네임이에요.')
      } else {
        setError('오류가 발생했어요. 다시 시도해주세요.')
      }
      setLoading(false)
      return
    }

    router.replace(consumeNextPath())
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-2xl font-bold">닉네임 설정</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          서비스에서 사용할 닉네임을 정해주세요.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임 입력 (2~20자)"
              maxLength={20}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none ring-offset-background transition-colors placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              autoFocus
            />
            {error && (
              <p className="mt-1.5 text-xs text-red-500">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || nickname.trim().length < 2}
            className="w-full rounded-lg bg-foreground py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            {loading ? '저장 중...' : '시작하기'}
          </button>
        </form>
      </div>
    </div>
  )
}
