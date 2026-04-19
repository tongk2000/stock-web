<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# 에이전트 작업 가이드

이 파일은 AI 에이전트/신규 기여자가 본 레포에서 **무엇을 어디에서 바꿔야 하는지** 빠르게 찾아낼 수 있도록 정리한 맵입니다. 코드 변경 전에 한 번은 훑어보세요.

## 아키텍처 한눈에 보기

```
Next.js 16 (App Router, RSC 기본)
├─ 서버 컴포넌트
│   ├─ 페이지 (app/**/page.tsx): 데이터 조회 + 메타데이터
│   └─ lib/supabase/server.ts: cookies() 기반 Supabase 세션
└─ 클라이언트 컴포넌트
    ├─ 실시간 UI, 폼, 차트
    ├─ 전역 Context: Auth / Favorites / Sidebar / Theme
    ├─ TanStack Query: 5분 staleTime (lib/query-client.ts)
    └─ lib/supabase/client.ts: browser 싱글톤
```

- **페이지 기본은 서버 컴포넌트.** 상호작용이 필요한 하위 트리에만 `'use client'`를 붙입니다.
- **동적 세그먼트 params는 Promise.** `params`/`searchParams`는 `await` 해서 사용합니다 (Next.js 15+).
- **메타데이터는 `generateMetadata`로.** 참여도 낮은 글은 `noindex, follow` (SEO 참고).

## 디렉토리 규약

| 경로 | 용도 |
|---|---|
| `src/app/**` | 라우트. 서버 컴포넌트 기본. |
| `src/components/layout/` | 앱 쉘 (헤더/사이드바/프로바이더). |
| `src/components/{stock,chart,discussion,search,ui}/` | 기능별 UI 컴포넌트. |
| `src/contexts/` | React Context Provider + `useXxx` 훅. |
| `src/hooks/` | 재사용 훅. 브라우저 전용이면 `'use client'`. |
| `src/lib/` | 외부 라이브러리 어댑터 + 순수 유틸 + 상수. |
| `src/types/` | DB 테이블과 1:1 대응되는 타입 선언. |
| `supabase/migrations/` | SQL 마이그레이션 (시간 prefix 순서로 적용). |
| `stock-collector/` | Python 배치 스크립트 (프런트엔드와 독립). |

## 공통 상수는 `src/lib/constants.ts`

다음을 수정할 때는 각 파일 대신 상수 파일을 바꾸세요:

| 상수 | 설명 |
|---|---|
| `PAGE_SIZE.DEFAULT` / `.ROOM` / `.FAVORITES` | 토론 피드 페이지네이션 크기 (화면별 다름) |
| `ENGAGEMENT_THRESHOLD` | SEO 색인 기준 (좋아요/댓글 수) — sitemap + generateMetadata 공용 |
| `STORAGE_KEYS.THEME/FAVORITES/INDICATORS/POST_AUTH_NEXT` | localStorage / sessionStorage 키 |
| `MA_PERIODS` | 차트 이평선 기본 기간 배열 |

> ⚠️ `STORAGE_KEYS`의 값은 이미 배포된 사용자의 브라우저 저장소에 박혀 있으므로 **리터럴을 바꾸지 마세요.** 상수 이름만 리팩토링하세요.

## 데이터 흐름

### 1. 인증
```
로그인 버튼 → AuthContext.signInWithGoogle(next?)
  sessionStorage[POST_AUTH_NEXT] = 복귀할 내부 경로
  Supabase OAuth redirect
/auth/callback (route handler)
  세션 교환 → profiles.onboarded 확인
    true  → /auth/return (sessionStorage의 경로로 replace)
    false → /auth/setup (닉네임 설정 → onboarded=true)
```

### 2. 즐겨찾기 (이중 저장소)
```
비로그인: localStorage[FAVORITES]
로그인 시점: localStorage → Supabase upsert → localStorage 비움
로그인 중: 모든 CRUD를 Supabase favorites 테이블에 기록
```

### 3. 토론방 실시간 업데이트
```
DiscussionSection 마운트
  → supabase.channel('posts:room=<id>')
  → postgres_changes INSERT/UPDATE/DELETE 구독
  → 로컬 state 증분 반영 (리페치 없음)
```

### 4. 차트
```
StockChartSection (클라이언트)
  Supabase에서 KRX + NXT 일봉 fetch
  → 거래소 토글 따라 mergeCandles / 원본 / NXT 선택
  → CandleType 따라 aggregateCandles (주봉/월봉)
  → CandleChart (dynamic import, ssr:false) 렌더
  메모 모달 ↔ chart_memos 테이블 (upsert/delete, 낙관적 업데이트)
```

## Supabase 클라이언트 선택

| 호출 위치 | 사용할 모듈 | 특징 |
|---|---|---|
| 서버 컴포넌트 / Route Handler | `@/lib/supabase/server` | `await createClient()`. cookies() 기반 세션. |
| 클라이언트 컴포넌트 | `@/lib/supabase/client` | `createClient()` (동기). 내부적으로 싱글톤. |

> 서버에서 세션이 필요한데 읽기 전용 컨텍스트(서버 컴포넌트)에서는 쿠키 쓰기가 실패할 수 있어 `setAll` try/catch로 감쌉니다. 정상 동작이니 건드리지 마세요.

## 스타일링 규약

- **Tailwind v4** + **shadcn/ui**. `tailwind.config`는 없음 (v4는 CSS-first).
- 클래스 병합은 `cn()` 유틸 (`@/lib/utils`).
- 다크 모드는 `<html class="dark">` 토글. `ThemeProvider`에 위임하고 직접 DOM을 만지지 마세요.
- **FOUC 방지**는 `app/layout.tsx`의 `<head>` 인라인 스크립트가 담당합니다. 이 스크립트는 `STORAGE_KEYS.THEME`을 통해 주입되므로 키가 바뀌면 자동 반영됩니다.

## SEO

- 참여도 낮은 글은 `noindex, follow` (스팸/저품질로 도메인 평판 하락 방지).
- `sitemap.ts` / `robots.ts` / `generateMetadata`는 모두 `ENGAGEMENT_THRESHOLD`를 공유합니다.
- 절대 URL은 `NEXT_PUBLIC_SITE_URL` 환경변수를 사용하세요.

## 변경 시 체크리스트

- [ ] 페이지네이션/임계값/스토리지 키를 추가하거나 바꿀 땐 `src/lib/constants.ts`에서.
- [ ] 새 테이블/컬럼이 필요하면 `supabase/migrations/`에 새 마이그레이션 파일 추가.
- [ ] RSC에서 Supabase를 사용할 땐 `lib/supabase/server.ts`, 클라이언트는 `client.ts`.
- [ ] 새 전역 상태는 Context를 하나 더 만들기 전에 기존 Context에 들어갈 수 있는지 먼저 확인.
- [ ] 사용자 데이터 스토리지 키(`stock-favorites`, `vite-ui-theme` 등)의 **리터럴 값**은 변경 금지.
- [ ] `'use client'`는 정말 필요한 최소 범위의 컴포넌트에만.

## 자주 밟는 함정

1. **`params`/`searchParams`를 await 하지 않음** — Next.js 15+에서는 Promise입니다.
2. **실시간 구독 해제 누락** — `useEffect` cleanup에서 `supabase.removeChannel(...)` 호출.
3. **클라이언트에서 SUPABASE_SERVICE_ROLE_KEY 사용** — 절대 금지. 공개 번들에 포함됩니다.
4. **테마 플래시** — `ThemeProvider`만 쓰지 말고 `layout.tsx`의 인라인 스크립트가 켜져 있는지 확인.
5. **즐겨찾기 localStorage 마이그레이션** — 로그인 전환 시점에서 서버에 upsert가 성공해야만 localStorage를 비웁니다. 실패 시 다음 로그인 때 재시도됩니다.
