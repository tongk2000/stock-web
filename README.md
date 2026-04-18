# 주식 사이트

차트와 토론방을 한 곳에서. 차트 메모/뉴스 연동, 가격 예측 랭킹, 품질 필터링 토론방.

## 기술 스택

| 분류 | 기술 |
|---|---|
| 프레임워크 | Next.js 16 (App Router, RSC) |
| 언어 | TypeScript |
| 스타일링 | Tailwind CSS v4 + shadcn/ui |
| 데이터 페칭 | TanStack Query v5 |
| 백엔드/DB | Supabase (PostgreSQL + Auth + RLS) |
| 차트 | TradingView Lightweight Charts v5 |
| 결제 | Stripe (예정) |
| 배포 | Vercel (예정) |

## 프로젝트 구조

```
src/
├── app/                            # Next.js App Router
│   ├── layout.tsx                  # 루트 레이아웃
│   │                               #   ThemeProvider > AuthProvider > FavoritesProvider > SidebarProvider
│   │                               #   AppHeader + LeftNav + {children}
│   ├── page.tsx                    # 홈 (검색 안내 페이지)
│   ├── sitemap.ts                  # 동적 sitemap.xml (종목 + 참여도 높은 토론글)
│   ├── robots.ts                   # robots.txt (+ sitemap 참조, /auth 차단)
│   ├── auth/
│   │   ├── callback/route.ts       # OAuth 콜백 (세션 교환 + 온보딩 분기)
│   │   └── setup/page.tsx          # 닉네임 설정 (신규 가입 온보딩)
│   ├── discussions/
│   │   ├── page.tsx                # 토론방 피드 (전체 최신글, 무한 스크롤)
│   │   └── [id]/page.tsx           # 토론글 상세 (SSR, SEO용 영속 링크)
│   └── stocks/[code]/
│       ├── page.tsx                # 종목 상세 (차트 + 즐겨찾기 + 토론방)
│       └── loading.tsx             # 로딩 스켈레톤
├── components/
│   ├── layout/
│   │   ├── AppHeader.tsx           # 공통 상단 헤더 (햄버거·검색창·로그인)
│   │   ├── LeftNav.tsx             # 왼쪽 사이드바 (네비·즐겨찾기·테마)
│   │   └── query-provider.tsx      # TanStack Query 클라이언트 provider
│   ├── chart/
│   │   └── CandleChart.tsx         # TradingView Lightweight Charts 래퍼
│   ├── discussion/
│   │   └── DiscussionSection.tsx   # 종목별 토론방 (실시간 구독)
│   ├── stock/
│   │   ├── StockSearch.tsx         # 종목 검색 자동완성
│   │   ├── StockChartSection.tsx   # 차트 영역 (가격·컨트롤·메모 모달)
│   │   └── FavoriteButton.tsx      # 즐겨찾기 토글 버튼
│   └── ui/                         # shadcn/ui 컴포넌트
├── contexts/
│   ├── AuthContext.tsx             # Supabase Auth 전역 상태
│   ├── FavoritesContext.tsx        # 즐겨찾기 (로그인: Supabase / 비로그인: localStorage)
│   └── SidebarContext.tsx          # 사이드바 열림 상태 (AppHeader ↔ LeftNav 공유)
├── hooks/
│   ├── useIsDark.ts               # 다크모드 여부 (MutationObserver)
│   └── useScrollAtTop.ts          # 스크롤 방향 기반 헤더 표시 제어
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # 클라이언트 컴포넌트용 Supabase 클라이언트
│   │   └── server.ts              # 서버 컴포넌트용 Supabase 클라이언트
│   ├── format.ts                  # 공통 포맷 유틸 (상대 시간 등)
│   ├── indicators.ts              # 기술적 지표 계산 (MA, BB, RSI, OBV, 봉 집계)
│   ├── query-client.ts            # TanStack Query 설정 (staleTime 5분)
│   └── utils.ts                   # cn() 등 범용 유틸
└── types/
    ├── stock.ts                   # Stock, Candle, CandleType
    └── discussion.ts              # Post, DiscussionRoom

stock-collector/                    # Python 데이터 수집 스크립트
├── collect_candles.py              # 일봉 수집 (FinanceDataReader → Supabase)
├── collect_financials.py           # 분기 재무 수집 (DART OpenAPI → Supabase)
└── requirements.txt

supabase/
└── migrations/                     # DB 마이그레이션 (순서대로 적용)
    ├── 20260413000001_init_schema.sql       # 초기 스키마 + RLS
    ├── 20260413000002_add_financials.sql    # 재무 정보 테이블
    ├── 20260414000001_add_exchange_to_candles.sql  # 거래소(KRX/NXT) 컬럼
    ├── 20260415000001_add_public_chart_notes.sql   # 차트 메모 프로토타입용 수정
    ├── 20260416000001_add_onboarded.sql     # 온보딩 플래그
    ├── 20260416000002_favorites_and_memo_fix.sql   # 즐겨찾기 테이블 + 메모 unique
    └── 20260416000003_discussion_setup.sql  # 토론방 자동 생성 + 좋아요 + Realtime
```

## 레이아웃 구조

```
┌─────────────────────────────────────┐  ← AppHeader (h-14, sticky top-0)
│  ☰  [종목 검색창]     [프로필/로그인] │    모바일 ☰ → SidebarContext.toggle()
├──────────┬──────────────────────────┤
│          │                          │
│  LeftNav │  page content            │
│  (w-64)  │                          │
│          │                          │
└──────────┴──────────────────────────┘

모바일: LeftNav 기본 숨김, ☰ 버튼으로 슬라이드 인/아웃
데스크탑(sm+): LeftNav 항상 표시, ☰ 버튼 숨김
```

## 인증 흐름

```
[로그인 버튼] → Google OAuth → /auth/callback
  ├── 기존 유저 (onboarded=true)  → 원래 페이지로 리다이렉트
  └── 신규 가입 (onboarded=false) → /auth/setup (닉네임 설정) → 홈
```

- Google OAuth를 통한 소셜 로그인
- 가입 시 Supabase trigger로 profiles 자동 생성
- 닉네임 설정 완료 후 서비스 이용 가능

## DB 스키마

| 테이블 | 설명 |
|---|---|
| `profiles` | 유저 프로필, 점수, 프리미엄 여부. 가입 시 자동 생성 |
| `stocks` | 종목 코드/이름/시장 (KOSPI, KOSDAQ) |
| `candles` | 일봉/주봉/월봉 OHLCV 데이터 |
| `discussion_rooms` | 공식방 + 프리미엄 유저 개설방, 태그 지원 |
| `posts` | 토론방 게시글 (최대 1000자) |
| `favorites` | 유저별 즐겨찾기 종목 (RLS: 본인만 접근) |
| `chart_memos` | 날짜별 차트 메모 (무료 종목당 5개 제한은 앱 레벨 처리) |
| `financials` | 분기별 재무 정보 (매출/영업이익/순이익/EPS 등) |
| `price_predictions` | 가격 예측 + 만기 실제가 저장 (랭킹 재료) |
| `post_likes` | 게시글 좋아요 (트리거로 posts.like_count 자동 동기화) |
| `user_blocks` | 유저 차단 목록 |

RLS(Row Level Security) 적용 완료. 주요 정책:
- 종목/캔들: 전체 읽기 전용
- 토론방 개설: 프리미엄 유저만
- 메모/차단: 본인 데이터만 접근

## 데이터 수집 전략

- **캔들 데이터**: 평일 장 마감 후 GitHub Actions 스케줄로 FinanceDataReader 배치 수집 → Supabase 저장 (KRX/NXT 별도)
- **재무 데이터**: DART OpenAPI로 최근 4분기 연결재무제표 수집 (수동 실행)
- **토론방**: Supabase Realtime(postgres_changes) 구독으로 실시간 게시글 반영
- **실시간 현재가**: 초기에는 미구현, 트래픽/니즈 증가 시 추가 예정

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example`을 복사해 `.env.local` 작성:

```bash
cp .env.example .env.local
```

[supabase.com](https://supabase.com) 에서 프로젝트 생성 후 `Settings > API`에서 키 복사:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 3. DB 마이그레이션 적용

```bash
supabase link --project-ref <프로젝트-ref>
supabase db push
```

프로젝트 ref는 대시보드 URL에서 확인: `https://supabase.com/dashboard/project/<ref>`

### 4. 개발 서버 실행

```bash
npm run dev
```

## 구독 모델

| 플랜 | 가격 | 차이 |
|---|---|---|
| 무료 | 0원 | 차트 메모 종목당 5개, 토론방 개설 불가 |
| 프리미엄 | 월 $1 / 연 $10 | 메모 무제한, 토론방 개설 가능 |

## SEO

검색엔진 색인/노출을 위한 구조:

- **개별 토론글 영속 URL** — `/discussions/[id]` SSR 라우트. 피드 카드 클릭 시 이 페이지로 이동하여 딥 링크·공유·색인이 가능합니다.
- **조건부 색인** — `generateMetadata`에서 좋아요 또는 댓글 수가 `ENGAGEMENT_THRESHOLD`(기본 3) 이상인 글만 `index: true`. 그 외는 `noindex, follow` 처리해 저품질·스팸 글이 도메인 평판을 떨어뜨리지 않도록 합니다.
- **`app/sitemap.ts`** — 홈·토론방 목록 + 전체 종목(`/stocks/[code]`) + 참여도 임계값 이상의 토론글을 포함하는 동적 sitemap.
- **`app/robots.ts`** — `/auth/` 차단, sitemap 참조, `host` 지정.
- **canonical / OpenGraph** — 상세 페이지에서 절대 경로 canonical과 `og:type=article`, `publishedTime` 메타를 제공합니다.
- **`NEXT_PUBLIC_SITE_URL`** — sitemap·robots·canonical이 사용할 절대 URL. 배포 환경변수에 반드시 설정하세요 (예: `https://example.com`).
