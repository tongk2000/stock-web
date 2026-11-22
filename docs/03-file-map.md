# 3. 원하는 화면에서 파일 찾기

[목차](README.md) · [이전](02-reading-code.md) · [다음: 데이터 흐름](04-data-flows.md)

## 폴더는 담당 업무별 서랍이다

```text
stock-web/                    ← 현재 작업 공간
├─ docs/                      ← 설명서 위치 안내
└─ source/stock-web/           ← 실제 앱·Git 저장소, npm 실행 위치
   ├─ package.json            ← 설치할 도구와 실행 명령
   ├─ package-lock.json       ← 재현 가능한 설치를 위한 정확한 의존성 기록
   ├─ src/
   │  ├─ app/                 ← 주소별 페이지와 서버 API
   │  ├─ components/          ← 여러 화면 조각
   │  ├─ contexts/            ← 로그인·즐겨찾기 등 공유 상태
   │  ├─ hooks/               ← 재사용하는 React 동작
   │  ├─ lib/                 ← 계산·포맷·외부 연결 등 도우미
   │  └─ types/               ← 데이터 모양 약속
   ├─ public/                 ← URL로 제공할 이미지 등의 정적 파일
   ├─ stock-collector/        ← Python 자료 수집·계산
   ├─ supabase/migrations/    ← DB 구조·권한 변경 SQL 이력
   ├─ .github/workflows/      ← 자동 작업 예약표
   └─ docs/                   ← 지금 읽고 있는 설명서
```

`node_modules/`는 설치한 외부 라이브러리, `.next/`는 Next.js 실행·빌드 결과입니다. 설치·실행하면 생기며 평소 화면 수정 대상이 아닙니다.

## 페이지 주소와 담당 파일

| 주소 | 하는 일 | 시작 파일 |
|---|---|---|
| `/` | 내 관심 종목과 토론 | [홈](../src/app/page.tsx) |
| `/search` | 검색 결과 | [검색 페이지](../src/app/search/page.tsx) |
| `/stocks/005930` | 코드에 해당하는 종목 상세 | [종목 페이지](../src/app/stocks/%5Bcode%5D/page.tsx) |
| `/discussions` | 전체 토론 피드 | [토론 목록](../src/app/discussions/page.tsx) |
| `/discussions/글ID` | 하나의 글과 댓글 | [글 상세](../src/app/discussions/%5Bid%5D/page.tsx) |
| `/rankings` | 여러 랭킹 미리보기 | [랭킹 홈](../src/app/rankings/page.tsx) |
| `/rankings/volume` | 거래량·거래대금 | [거래량 랭킹](../src/app/rankings/volume/page.tsx) |
| `/rankings/movers` | 등락·신고가·신저가 | [등락 랭킹](../src/app/rankings/movers/page.tsx) |
| `/rankings/valuation` | 기업가치 | [기업가치 랭킹](../src/app/rankings/valuation/page.tsx) |
| `/rankings/trending` | 토론이 활발한 종목 | [토론 랭킹](../src/app/rankings/trending/page.tsx) |
| `/rankings/float-volume` | 유동물량 대비 거래량 | [유동물량 랭킹](../src/app/rankings/float-volume/page.tsx) |
| `/rankings/sectors` | 업종별 랭킹 | [섹터 목록](../src/app/rankings/sectors/page.tsx) |
| `/rankings/sectors/업종명` | 업종에 속한 종목 | [섹터 상세](../src/app/rankings/sectors/%5Bname%5D/page.tsx) |
| `/auth/setup` | 첫 로그인 닉네임 설정 | [닉네임 페이지](../src/app/auth/setup/page.tsx) |

주소 뒤의 `?q=검색어` 같은 부분은 **쿼리 문자열**입니다. 경로는 같은 검색 페이지를 선택하고, 쿼리는 그 페이지에서 무엇을 찾을지 전달합니다.

## 화면 배치 지도

```text
데스크톱                     모바일
┌─────────────────────┐      ┌──────────────────┐
│ AppHeader 검색      │      │ 현재 페이지      │
├────────┬────────────┤      │                  │
│LeftNav │현재 페이지 │      │ 메뉴를 열면      │
│로그인  │{children}  │      │ LeftNav 표시     │
│메뉴    │            │      ├──────────────────┤
│관심종목│            │      │BottomBar 검색·메뉴│
└────────┴────────────┘      └──────────────────┘
```

전체 조립은 [layout.tsx](../src/app/layout.tsx)에서 합니다. 로그인·로그아웃 UI는 [LeftNav](../src/components/layout/LeftNav.tsx)에서 찾습니다. 모바일 아래쪽은 [BottomBar](../src/components/layout/BottomBar.tsx), 데스크톱 상단은 [AppHeader](../src/components/layout/AppHeader.tsx)입니다.

공유 기능은 Theme → Auth → Favorites → Sidebar 순서로 감싸져 있고, QueryProvider는 LeftNav와 페이지 영역을 감쌉니다. Favorites가 Auth 안에 있는 것은 로그인 사용자에 따라 즐겨찾기 저장소를 선택하기 때문입니다.

## “이걸 바꾸고 싶다”로 찾기

| 바꾸려는 것 | 먼저 볼 파일 | 확인할 연결 |
|---|---|---|
| 홈 제목·영역 순서 | [app/page.tsx](../src/app/page.tsx) | 실제 카드 내용은 하위 컴포넌트 |
| 홈 주가 카드 | [FavoriteStockPrices](../src/components/stock/FavoriteStockPrices.tsx) | DB 주가와 오늘 시세 API |
| 검색 자동완성 | [StockSearch](../src/components/stock/StockSearch.tsx) | 검색 결과 페이지와 별도 |
| 종목 아래 탭 | [StockDetailTabs](../src/components/stock/StockDetailTabs.tsx) | `TABS`, 기본 `active` |
| 차트 버튼·메모 창 | [StockChartSection](../src/components/stock/StockChartSection.tsx) | 데이터 조회·조합 담당 |
| 차트 선·축·마우스 반응 | [CandleChart](../src/components/chart/CandleChart.tsx) | 차트 라이브러리 조작 담당 |
| 이동평균·주봉 계산 | [indicators.ts](../src/lib/indicators.ts) | 실제 숫자가 바뀌므로 계산 확인 필요 |
| 기업정보 표 | [CompanyInfoSection](../src/components/stock/CompanyInfoSection.tsx) | 기업정보 API도 함께 확인 |
| 종목 토론 입력·실시간 목록 | [DiscussionSection](../src/components/discussion/DiscussionSection.tsx) | `posts`, Realtime |
| 전체 토론 피드 | [DiscussionFeed](../src/components/discussion/DiscussionFeed.tsx) | 종목 토론방과 다른 컴포넌트 |
| 댓글·답글 | [CommentSection](../src/components/discussion/CommentSection.tsx) | `comments`, DB 트리거 |
| 즐겨찾기 저장 | [FavoritesContext](../src/contexts/FavoritesContext.tsx) | 비로그인/로그인 양쪽 |
| 로그인 처리 | [AuthContext](../src/contexts/AuthContext.tsx) | callback·setup·return 경로 |
| 랭킹 기준 | [rankings.ts](../src/lib/rankings.ts) | SQL view의 계산도 확인 |
| 색상·공통 스타일 | [globals.css](../src/app/globals.css) | 각 컴포넌트의 `className` |
| 숫자·날짜 표시 | [format.ts](../src/lib/format.ts), [time.ts](../src/lib/time.ts) | 표시 형식과 실제 값을 구분 |
| 목록 개수·지표 기본값 | [constants.ts](../src/lib/constants.ts) | 실제 사용처도 검색 |
| 검색엔진 정보 | [sitemap.ts](../src/app/sitemap.ts), [robots.ts](../src/app/robots.ts) | 각 상세 페이지 `generateMetadata` |

## 데이터만 응답하는 주소

| 주소 | 소스 | 역할 |
|---|---|---|
| `/api/stock/today/005930` | [단일 시세](../src/app/api/stock/today/%5Bcode%5D/route.ts) | 네이버 오늘 캔들을 정리해 반환 |
| `/api/stock/today?codes=005930,000660` | [여러 종목 시세](../src/app/api/stock/today/route.ts) | 여러 종목 가격 일괄 조회 |
| `/api/stocks/005930/company-info` | [기업정보](../src/app/api/stocks/%5Bcode%5D/company-info/route.ts) | DB와 외부 자료를 모아 반환 |
| `/auth/callback` | [로그인 콜백](../src/app/auth/callback/route.ts) | 인증 코드를 세션으로 교환 후 이동 |

`stock` 단수와 `stocks` 복수가 섞여 있습니다. 오타처럼 보여도 현재 실제 경로이므로 수정할 때 호출하는 쪽까지 함께 확인해야 합니다. API의 **JSON** 응답은 화면 디자인 없이 키와 값으로 전달하는 데이터입니다.

## 설정 파일은 언제 열까?

| 파일 | 열어볼 상황 |
|---|---|
| [package.json](../package.json) | 실행 명령, 사용하는 라이브러리 확인 |
| [next.config.ts](../next.config.ts) | Next.js 프로젝트 설정 확인 |
| [tsconfig.json](../tsconfig.json) | TypeScript 검사·경로 별칭 설정 |
| [eslint.config.mjs](../eslint.config.mjs) | 코드 규칙 검사 설정 |
| [.env.example](../.env.example) | 연결 주소·키 이름 확인. 실제 값은 `.env.local` |
| [AGENTS.md](../AGENTS.md) | 이 저장소에서 AI가 지켜야 할 수정 규칙 |

전체 파일을 처음부터 읽을 필요는 없습니다. **주소 → page → 컴포넌트 → 데이터 요청 → DB/외부 서비스** 순서로 따라가면 됩니다.
