# `src/app/` 라우트와 API

위: [src 입구](../CLAUDE.md) → [저장소 규칙](../../CLAUDE.md). 위 문서의 규칙은 여기서 되풀이하지 않는다.

## 이 폴더

App Router의 라우트다. 페이지(`page.tsx`)는 서버 컴포넌트가 기본이고 `lib/supabase/server.ts`로 읽은 데이터를 클라이언트 컴포넌트에 넘긴다(`'use client'` 페이지는 `auth/return`, `auth/setup`뿐). Route Handler는 `api/**`와 `auth/callback`. 루트에는 `layout.tsx`, `sitemap.ts`, `robots.ts`, `globals.css`. 화면 부품은 [components](../components/CLAUDE.md), 랭킹 쿼리와 `naver.ts`는 [lib](../lib/CLAUDE.md), 전역 상태·훅·타입은 [src 입구](../CLAUDE.md).

## 어디를 볼까

| 하려는 일 | 볼 곳 | 관련 |
| --- | --- | --- |
| 홈(관심 종목 시세와 토론) | `page.tsx`의 `Home` | 데이터는 클라이언트 `FavoriteStockPrices`·`FavoriteDiscussionFeed`가 가져온다 |
| 검색(종목과 토론글) | `search/page.tsx`의 `SearchPage` | stocks, posts, profiles. 상한 `LIMITS.SEARCH_STOCKS`·`SEARCH_POSTS` |
| 종목 상세(주소 stocks/코드) | `stocks/[code]/page.tsx`의 `StockPage`, `generateMetadata` | stocks, discussion_rooms. 스켈레톤 `stocks/[code]/loading.tsx` |
| 토론 목록·검색(주소 discussions) | `discussions/page.tsx`의 `DiscussionsPage` | `DiscussionFeed`가 무한 스크롤 |
| 토론 글 상세(주소 discussions/ID) | `discussions/[id]/page.tsx`의 `PostDetailPage`, `fetchPostWithStock`, `isIndexable`, `generateMetadata` | posts, stocks. SEO는 '지킬 것' |
| 랭킹 허브(주소 rankings) | `rankings/page.tsx`의 `RankingsHubPage`, `HubCard` | 네 랭킹 미리보기 |
| 거래대금·급증(주소 rankings/volume) | `rankings/volume/page.tsx`의 `VolumeRankingPage` | `getVolumeRanking`, 뷰 v_daily_change·v_volume_surge |
| 등락률·52주(주소 rankings/movers) | `rankings/movers/page.tsx`의 `MoversRankingPage`, `TABS`, `VALID` | `getMoversRanking`, 뷰 v_daily_change·v_52w_extremes |
| 가치·시총(주소 rankings/valuation) | `rankings/valuation/page.tsx`의 `ValuationRankingPage`, `HEADERS` | `getValuationRanking`, 뷰 v_latest_financials |
| 토론 핫 종목(주소 rankings/trending) | `rankings/trending/page.tsx`의 `TrendingRankingPage` | `getTrendingRanking`, posts. `RANKING.TRENDING_WINDOW_HOURS` |
| 유동물량 대비 거래량(주소 rankings/float-volume) | `rankings/float-volume/page.tsx`의 `FloatVolumeRankingPage` | `getFloatVolumeRanking`, 뷰 v_float_volume_ranking |
| 섹터와 드릴다운(주소 rankings/sectors, rankings/sectors/이름) | `rankings/sectors/page.tsx`의 `SectorsRankingPage`, `rankings/sectors/[name]/page.tsx`의 `SectorDetailPage` | `getSectorRanking`·`getSectorConstituents`, 뷰 v_sector_ranking |
| 로그인 콜백·복귀·닉네임(주소 auth/callback, auth/return, auth/setup) | `auth/callback/route.ts`의 `GET`, `auth/return/page.tsx`의 `AuthReturnPage`, `auth/setup/page.tsx`의 `SetupPage`, `consumeNextPath` | '지킬 것'의 인증 흐름 |
| 여러 종목 오늘 시세(Naver 직접) | `api/stock/today/route.ts`의 `GET`, `fetchPrice` | Naver basic, `LIMITS.BATCH_PRICE_CODES`. 쓰는 곳 `FavoriteStockPrices` |
| 한 종목 오늘 캔들(Naver 직접) | `api/stock/today/[code]/route.ts`의 `GET`, `getInfoNum`, `parseTradeDateOrToday` | Naver basic과 integration. 쓰는 곳 `useTodayCandle` |
| 기업정보 탭(Supabase + Naver 보강) | `api/stocks/[code]/company-info/route.ts`의 `GET`, `fetchNaverSupplement`, `okData` | stocks, v_latest_financials, candles |
| 시세·수급·뉴스·공시 탭(Naver 프록시) | `api/stocks/[code]/quote/route.ts`, `api/stocks/[code]/flow/route.ts`, `api/stocks/[code]/news/route.ts`, `api/stocks/[code]/disclosures/route.ts`의 `GET` | `lib/naver.ts`의 `fetchNaverJson`, `isStockCode`. 쓰는 곳 `useStockTabData` |
| 색인 기준, 사이트맵, robots | `constants.ts`의 `ENGAGEMENT_THRESHOLD`, `sitemap.ts`의 `sitemap`, `robots.ts`의 `robots` | 글 상세 `isIndexable`과 같은 상수 |
| Provider 순서, 테마 스크립트, 기본 메타데이터 | `layout.tsx`의 `RootLayout`, `scriptStr`, `metadata` | '지킬 것' |

## 지킬 것

- **인증 흐름.** 로그인 → `AuthContext.signInWithGoogle(next?)`가 복귀 경로(내부 경로만, `/auth/*`에서는 `/`)를 sessionStorage `POST_AUTH_NEXT`에 두고 OAuth로 보낸다 → `/auth/callback`이 세션을 교환하고 profiles의 `onboarded`를 본다 → true면 `/auth/return`(저장된 경로로 `replace`), false면 `/auth/setup`(닉네임 2~20자, 중복은 코드 23505, `onboarded=true`). 복귀 경로를 `redirectTo` 쿼리에 붙이지 않는다: Supabase 허용 URL 매칭에서 빠져 Site URL로 폴백될 수 있다. `return`·`setup`은 `/`로 시작하고 `//`로 시작하지 않는 경로만 따른다(open redirect 방지).
- 교환 실패는 `/?error=auth`로 가는데 이 쿼리를 읽는 코드는 찾지 못했다. 사용자에게 안내가 안 뜬다.
- **`params`·`searchParams`는 Promise다.** 페이지·Route Handler·`generateMetadata` 모두 `await` 한다.
- **SEO.** 참여도 낮은 글은 `noindex, follow`(저품질 글이 도메인 평판을 깎지 않게). 기준은 좋아요 또는 댓글 수가 `ENGAGEMENT_THRESHOLD`(3) 이상. `sitemap.ts`와 `discussions/[id]/page.tsx`의 `isIndexable`이 같은 상수를 쓰니 한쪽만 바꾸지 않는다. 글이 없으면 `noindex, nofollow`. 글 상세만 `canonical`·`openGraph`를 둔다.
- 종목 상세·검색·토론 목록·랭킹에는 `robots` 지정이 없다(색인 허용). 랭킹은 sitemap에 없다. robots.txt는 `/auth/`만 막는다.
- **절대 URL은 `NEXT_PUBLIC_SITE_URL`**(기본 `http://localhost:3000`). 지금 `layout.tsx`·`sitemap.ts`·`robots.ts`가 각자 `SITE_URL`을 정의하니 새로 쓸 때 같은 식으로 맞춘다.
- **테마 플래시.** `<head>`의 인라인 스크립트 `scriptStr`이 하이드레이션 전에 localStorage의 `STORAGE_KEYS.THEME`을 읽어 `<html>`에 `light`/`dark`를 붙인다. `ThemeProvider`만 믿지 말고 이 스크립트가 살아 있는지 본다. 키는 상수로 주입되고 `<html>`에 `suppressHydrationWarning`이 있다. 리터럴은 바꾸지 않는다.
- **Provider 순서**(`RootLayout`): `ThemeProvider` → `AuthProvider` → `FavoritesProvider`(`useAuth`를 쓰니 Auth 안쪽) → `SidebarProvider` → `AppHeader`, `QueryProvider`(안에 `LeftNav`와 `children`), `BottomBar`. `QueryProvider`는 헤더·하단바 밖이다.
- **외부 API 실패 처리가 라우트마다 다르다.** `quote`·`flow`·`news`·`disclosures`는 `fetchNaverJson`(3초 타임아웃, `next.revalidate` 60·60·300·300초)이 `null`이면 502 `upstream failed`, 코드가 6자리 숫자가 아니면 400. `company-info`는 Naver를 1.2초 타임아웃으로 보강에만 쓰고 실패해도 응답하며, Supabase `select`가 실패하면 컬럼을 줄여 한 번 더 조회한다. `api/stock/today*`는 `cache: 'no-store'`.
- `api/stock/today/[code]`는 `code`를 검증하지 않고 Naver URL에 넣고 타임아웃도 없다. 새 라우트는 `isStockCode`로 먼저 거른다.
- 랭킹 페이지는 `export const revalidate`(valuation 300, 나머지 60)를 두지만 데이터를 `createClient()`(`cookies()`)로 읽는다. 실제로 캐시되는지는 확인 못 함.
- 종목이 없으면 `stocks/[code]/page.tsx`는 `notFound()`가 아니라 안내 문구를 200으로 그린다.
- Next.js 16은 학습 데이터와 다를 수 있다. 라우트 규약이 헷갈리면 `node_modules/next/dist/docs/`를 먼저 본다.

## 파일

파일을 더하거나 지우면 이 표를 고치고 저장소 루트에서 `python3 docs/check-index.py`로 확인한다.

| 파일 | 내용 |
| --- | --- |
| `favicon.ico` | 사이트 아이콘(App Router 규약으로 자동 연결) |
| `globals.css` | Tailwind v4 진입, 라이트·다크 색 토큰(`:root`, `.dark`), `@custom-variant dark`, iOS 입력 줌 방지, 차트 패널 구분선 |
| `layout.tsx` | 루트 레이아웃(서버). `lang="ko"`, Geist 폰트(라틴)와 Pretendard CDN 스타일시트(한글, 글꼴 순서는 `globals.css`의 `--font-sans`), 기본 `metadata`, 테마 FOUC 스크립트, Provider 중첩, `AppHeader`·`LeftNav`·`BottomBar` 배치 |
| `page.tsx` | 홈(서버). `FavoriteStockPrices`·`FavoriteDiscussionFeed`를 그리고 직접 읽는 데이터는 없다 |
| `robots.ts` | `/robots.txt`. 전체 허용, `/auth/` 차단, sitemap 주소는 `NEXT_PUBLIC_SITE_URL` |
| `sitemap.ts` | `/sitemap.xml`. 홈·토론 목록·stocks 전체·참여도(`ENGAGEMENT_THRESHOLD`) 넘는 posts(`LIMITS.SITEMAP_MAX_POSTS`까지) |

### `api/stock/today/`

| 파일 | 내용 |
| --- | --- |
| `route.ts` | `GET ?codes=`. 6자리 코드만 받아 `LIMITS.BATCH_PRICE_CODES`개로 자르고 Naver basic에서 종가·등락·날짜를 모아 `{ prices }`로 답한다. 실패 종목은 키가 빠진다 |

### `api/stock/today/[code]/`

| 파일 | 내용 |
| --- | --- |
| `route.ts` | `GET`. 한 종목의 오늘 캔들을 Naver basic으로 만든다. 빈 필드는 integration `totalInfos`로, 그래도 없으면 시가·종가 min/max로 메운다 |

### `api/stocks/[code]/company-info/`

| 파일 | 내용 |
| --- | --- |
| `route.ts` | `GET`. 기업정보 탭: stocks 메타, v_latest_financials, KRX 일봉 252개(5·20일·52주 고저), Naver integration 보강 |

### `api/stocks/[code]/disclosures/`

| 파일 | 내용 |
| --- | --- |
| `route.ts` | `GET`. Naver 공시 20건(300초 캐시)을 `{ id, title, source, publishedAt, url }`로 |

### `api/stocks/[code]/flow/`

| 파일 | 내용 |
| --- | --- |
| `route.ts` | `GET`. Naver 투자자별 순매수 20영업일(60초 캐시). 전일대비 부호를 방향 코드로 맞춘다 |

### `api/stocks/[code]/news/`

| 파일 | 내용 |
| --- | --- |
| `route.ts` | `GET`. Naver 뉴스 20묶음에서 묶음별 첫 기사만(300초 캐시) |

### `api/stocks/[code]/quote/`

| 파일 | 내용 |
| --- | --- |
| `route.ts` | `GET`. Naver 일별 시세 20영업일(60초 캐시)을 숫자로 정규화 |

### `auth/callback/`

| 파일 | 내용 |
| --- | --- |
| `route.ts` | OAuth 콜백 `GET`. 세션 교환 뒤 `onboarded`로 `/auth/setup`·`/auth/return`에 보낸다. 실패는 `/?error=auth` |

### `auth/return/`

| 파일 | 내용 |
| --- | --- |
| `page.tsx` | 클라이언트. `POST_AUTH_NEXT`를 지우고 내부 경로면 그곳으로, 아니면 `/`로 `router.replace` |

### `auth/setup/`

| 파일 | 내용 |
| --- | --- |
| `page.tsx` | 클라이언트. 닉네임(2~20자)을 profiles에 `onboarded=true`와 함께 쓴다. 중복(23505) 안내, 끝나면 복귀 경로로 이동 |

### `discussions/`

| 파일 | 내용 |
| --- | --- |
| `page.tsx` | 토론 목록·검색(서버). `?q=`를 `DiscussionSearchForm`·`DiscussionFeed`에 넘긴다 |

### `discussions/[id]/`

| 파일 | 내용 |
| --- | --- |
| `page.tsx` | 글 상세(서버). posts·작성자 profiles·stocks를 읽어 `PostLikeButtons`·`CommentSection`을 그린다. `generateMetadata`가 index 여부를 정하고 글이 없으면 `notFound()` |

### `rankings/`

| 파일 | 내용 |
| --- | --- |
| `page.tsx` | 랭킹 허브. 거래대금·상승률·토론 핫·시총 5개씩 미리보기(`RANKING.HUB_PREVIEW_SIZE`), `revalidate` 60 |

### `rankings/float-volume/`

| 파일 | 내용 |
| --- | --- |
| `page.tsx` | 유동물량 대비 거래량. 뷰 v_float_volume_ranking, 유동비율 없는 종목은 빠진다 |

### `rankings/movers/`

| 파일 | 내용 |
| --- | --- |
| `page.tsx` | 등락률. `?tab=` gainers·losers·high_52w·low_52w(그 밖은 gainers) |

### `rankings/sectors/`

| 파일 | 내용 |
| --- | --- |
| `page.tsx` | 섹터 순위. `?tab=` weighted_change·total_value, 행은 섹터 상세로 링크 |

### `rankings/sectors/[name]/`

| 파일 | 내용 |
| --- | --- |
| `page.tsx` | 섹터 상세. `[name]`을 `decodeURIComponent`해 소속 종목의 오늘 등락률 |

### `rankings/trending/`

| 파일 | 내용 |
| --- | --- |
| `page.tsx` | 토론 핫 종목. 최근 `RANKING.TRENDING_WINDOW_HOURS`시간 글 수와 좋아요 가중 |

### `rankings/valuation/`

| 파일 | 내용 |
| --- | --- |
| `page.tsx` | 시총·저PER·저PBR·고ROE. `?tab=`(기본 market_cap), `revalidate` 300 |

### `rankings/volume/`

| 파일 | 내용 |
| --- | --- |
| `page.tsx` | 거래대금·거래량 급증. `?tab=surge`면 급증, 그 밖은 거래대금 |

### `search/`

| 파일 | 내용 |
| --- | --- |
| `page.tsx` | 통합 검색(서버). `?q=`로 stocks(이름·코드)와 posts(내용)를 ILIKE 조회(`%`·`_`·`\` 이스케이프). 글이 상한이면 `/discussions?q=`로 안내 |

### `stocks/[code]/`

| 파일 | 내용 |
| --- | --- |
| `loading.tsx` | 종목 상세 로딩 스켈레톤 |
| `page.tsx` | 종목 상세(서버). stocks와 공식 discussion_rooms를 읽고 `StockChartSection`·`FavoriteButton`·`StockDetailTabs`를 그린다. `generateMetadata` 제목 `이름 (코드)` |
