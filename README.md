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
| 차트 | TradingView Lightweight Charts (예정) |
| 결제 | Stripe (예정) |
| 배포 | Vercel (예정) |

## 프로젝트 구조

```
src/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # 루트 레이아웃 (QueryProvider 포함)
│   └── page.tsx
├── components/
│   ├── layout/
│   │   └── query-provider.tsx  # TanStack Query 클라이언트 provider
│   ├── chart/                  # 차트 관련 컴포넌트
│   ├── discussion/             # 토론방 관련 컴포넌트
│   ├── stock/                  # 종목 관련 컴포넌트
│   └── ui/                     # shadcn/ui 컴포넌트
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # 클라이언트 컴포넌트용 Supabase 클라이언트
│   │   └── server.ts           # 서버 컴포넌트용 Supabase 클라이언트
│   ├── query-client.ts         # TanStack Query 설정 (staleTime 5분)
│   └── utils.ts
└── types/
    ├── stock.ts                # Stock, Candle, CandleType 타입
    └── discussion.ts           # Post, DiscussionRoom 타입

supabase/
└── migrations/
    └── 20260413000001_init_schema.sql  # 초기 DB 스키마
```

## DB 스키마

| 테이블 | 설명 |
|---|---|
| `profiles` | 유저 프로필, 점수, 프리미엄 여부. 가입 시 자동 생성 |
| `stocks` | 종목 코드/이름/시장 (KOSPI, KOSDAQ) |
| `candles` | 일봉/주봉/월봉 OHLCV 데이터 |
| `discussion_rooms` | 공식방 + 프리미엄 유저 개설방, 태그 지원 |
| `posts` | 토론방 게시글 (최대 1000자) |
| `chart_memos` | 날짜별 차트 메모 (무료 종목당 5개 제한은 앱 레벨 처리) |
| `price_predictions` | 가격 예측 + 만기 실제가 저장 (랭킹 재료) |
| `user_blocks` | 유저 차단 목록 |

RLS(Row Level Security) 적용 완료. 주요 정책:
- 종목/캔들: 전체 읽기 전용
- 토론방 개설: 프리미엄 유저만
- 메모/차단: 본인 데이터만 접근

## 데이터 수집 전략

- **캔들 데이터**: 매일 장 마감(15:30) 후 KIS API 배치 수집 → Supabase 저장
- **토론방 현재가**: 실시간 WebSocket 대신 15~30초 폴링으로 처리 (인프라 단순화)
- **실시간 기능**: 초기에는 미구현, 트래픽/니즈 증가 시 추가 예정

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
