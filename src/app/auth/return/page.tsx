/**
 * OAuth 후 복귀 페이지
 *
 * /auth/callback에서 세션 교환이 끝난 뒤 이 페이지로 이동됩니다.
 * sessionStorage('post-auth-next')에 저장된 경로로 replace하며,
 * 값이 없거나 외부 URL이면 홈('/')으로 이동합니다.
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { STORAGE_KEYS } from '@/lib/constants'

export default function AuthReturnPage() {
  const router = useRouter()

  useEffect(() => {
    let target = '/'
    try {
      const raw = sessionStorage.getItem(STORAGE_KEYS.POST_AUTH_NEXT)
      sessionStorage.removeItem(STORAGE_KEYS.POST_AUTH_NEXT)
      if (raw && raw.startsWith('/') && !raw.startsWith('//')) {
        target = raw
      }
    } catch {}
    router.replace(target)
  }, [router])

  return null
}
