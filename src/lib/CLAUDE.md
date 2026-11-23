# `src/lib/` 어댑터·순수 유틸·상수·서버 조회

위: [src 입구](../CLAUDE.md) → [저장소 규칙](../../CLAUDE.md). 위 문서의 규칙은 여기서 되풀이하지 않는다.

## 이 폴더

화면을 그리지 않는 코드다. 화면은 `src/components/`, 라우트·API는 `src/app/`, 전역 상태는 `src/contexts/`, 훅은 `src/hooks/`.

| 구분 | 파일 | 서버 전용? |
| --- | --- | --- |
| 라이브러리 어댑터 | `supabase/client.ts`, `supabase/server.ts`, `supabase/normalize.ts`, `query-client.ts`(TanStack Query), `utils.ts`(`cn`) | `supabase/server.ts`만(`next/headers`) |
| 순수 유틸 | `format.ts`, `indicators.ts`, `short-credit.ts`, `parsers.ts`, `time.ts` | 아니다 |
| 상수 | `constants.ts` | 아니다 |
| 서버 전용 조회 | `rankings.ts`(`supabase/server`), `market.ts`(`next/cache`) | 그렇다. 클라이언트 컴포넌트에서 import하지 않는다 |
| 외부 호출 | `naver.ts`(네이버 증권, Route Handler에서만), `post-reactions.ts`(클라이언트를 인자로 받는 좋아요 쓰기) | `naver.ts`는 서버 |

TanStack Query는 `components/layout/query-provider.tsx`가 `QueryClientProvider`(`getQueryClient`, staleTime 5분)를 `app/layout.tsx`에 올리지만 `grep -rn useQuery src`는 0건이다. `useMutation`·`useInfiniteQuery`도 없다. 데이터는 `useEffect`의 `fetch`와 Supabase 호출로 가져온다.

## 어디를 볼까

| 하려는 일 | 볼 곳 | 관련 |
| --- | --- | --- |
| 토론 피드 페이지 크기 | `constants.ts` `PAGE_SIZE` | `DEFAULT`는 전체 피드, `ROOM`은 종목방, `FAVORITES`는 즐겨찾기 피드 |
| SEO 색인 기준(좋아요·댓글 수) | `constants.ts` `ENGAGEMENT_THRESHOLD` | `app/sitemap.ts`, `app/discussions/[id]/page.tsx`가 쓴다. `robots.ts`는 안 쓴다 |
| 스토리지 키 | `constants.ts` `STORAGE_KEYS` | THEME·FAVORITES·INDICATORS·POST_AUTH_NEXT. '지킬 것' |
| 차트 이평선 기본 기간 | `constants.ts` `MA_PERIODS` | `components/stock/StockChartSection.tsx`만 쓴다 |
| 랭킹 상수(표 크기, 허브 미리보기, 급증 평균 일수, 토론 핫 창) | `constants.ts` `RANKING` | `rankings.ts`, `app/rankings/**` |
| 검색·사이트맵·기업정보·일괄 시세 상한 | `constants.ts` `LIMITS` | `app/search/page.tsx`, `app/sitemap.ts`, `app/api/stock/today/route.ts` |
| 오늘 봉 폴링 주기 | `constants.ts` `LIVE_CANDLE_POLL_MS` | `hooks/useTodayCandle.ts` |
| 상대 시간·원화 축약·퍼센트·천단위 | `format.ts` `formatRelativeTime`, `formatKRWCompact`, `formatPercent`, `formatNumber` | 값이 없으면 `-` |
| KST 날짜·요일, 네이버 날짜 문자열 | `time.ts` `kstNow`, `kstToday`, `isKstWeekend`, `parseTradeDate` | '지킬 것' |
| 이평선·볼린저·RSI·OBV | `indicators.ts` `calcMA`, `calcBB`, `calcRSI`, `calcOBV` | `components/chart/CandleChart.tsx` |
| 일봉을 주·월봉으로 묶기 | `indicators.ts` `aggregateCandles`, `candleGroupKey` | `mergeCandles`는 이 폴더가 아니라 `components/stock/StockChartSection.tsx` 안에 있다 |
| 차트 공매도·신용잔고 점(정규화, 주·월봉 집계) | `short-credit.ts` `normalizeShortSales`, `normalizeCreditBalances`, `alignShortSales`, `alignCreditBalances`, `toNum` | 주·월봉 공매도 비중 = 기간 합계 수량 ÷ 봉 거래량(통합 모드는 합산 거래량이 분모), 신용잔고율 = 기간 마지막 값 |
| 랭킹: 거래대금·거래량 급증 | `rankings.ts` `getVolumeRanking` | 뷰 `v_daily_change`, `v_volume_surge` |
| 랭킹: 등락률, 52주 신고·신저가 | `rankings.ts` `getMoversRanking` | 뷰 `v_daily_change`, `v_52w_extremes` |
| 랭킹: 토론 핫 종목 | `rankings.ts` `getTrendingRanking` | `posts`를 24시간 창으로 집계. 점수 = 글 수 + 좋아요 x 0.5 |
| 랭킹: 유동물량 대비 거래량 | `rankings.ts` `getFloatVolumeRanking` | 뷰 `v_float_volume_ranking` |
| 랭킹: 섹터, 섹터 구성 종목 | `rankings.ts` `getSectorRanking`, `getSectorConstituents` | 뷰 `v_sector_ranking`, `v_daily_change` |
| 랭킹: 시총·PER·PBR·ROE | `rankings.ts` `getValuationRanking` | 뷰 `v_latest_financials` |
| 장 운영일 판정 | `market.ts` `getIsTradingDay` | 부르는 곳이 없다 |
| 네이버 시세·뉴스·공시·수급 호출 | `naver.ts` `fetchNaverJson`, `isStockCode` | `app/api/stocks/[code]/{quote,flow,news,disclosures}` |
| 네이버 응답 문자열을 숫자로 | `parsers.ts` `parseInt0`, `parseFloat0`, `parseDecimalOrNull`, `parseKrwAmount` | `app/api/stock/today/**`, `app/api/stocks/[code]/**` |
| 좋아요·싫어요 행 쓰기 | `post-reactions.ts` `addReaction`, `removeReaction` | `discussion/DiscussionSection.tsx`, `PostLikeButtons.tsx`. 토글 규칙은 호출부 |
| Supabase 클라이언트, 조인 결과 정규화 | `supabase/server.ts` `createClient`, `supabase/client.ts` `createClient`, `supabase/normalize.ts` `firstOrNull` | '지킬 것' |

테스트는 test/lib/<이름>.test.ts에 있다: constants, format, indicators, naver, parsers, short-credit, time, supabase/normalize. 아직 없는 것은 `rankings.ts`, `market.ts`, `post-reactions.ts`, `query-client.ts`, `utils.ts`, `supabase/client.ts`, `supabase/server.ts`다. 순수 함수를 고치면 그 테스트도 고친다.

## 지킬 것

- 페이지 크기, 임계값, 스토리지 키, 결과 상한처럼 여럿이 같이 쓰는 값은 사용처에 리터럴로 쓰지 말고 `constants.ts`에서 바꾼다. 새 값도 여기에 둔다.
- `STORAGE_KEYS`의 값(리터럴)은 바꾸지 않는다. 이미 배포된 사용자 브라우저에 그 이름으로 들어 있어 바꾸면 테마·즐겨찾기·지표 설정·로그인 복귀 경로가 사라진다. 상수 이름만 정리한다. `THEME`이 `vite-ui-theme`인 것은 shadcn 초기 템플릿(Vite)에서 온 이름이라 그대로 둔다. 차트 패널 높이 키(`pane-h-*`)는 `STORAGE_KEYS`가 아니라 `components/chart/CandleChart.tsx`의 `PANE_KEYS`에 있다.
- `RANKING.VOLUME_SURGE_LOOKBACK_DAYS`(20)는 `supabase/migrations/20261122000002_volume_surge_view.sql`의 20일과 같아야 한다. 상수만 바꿔서는 뷰가 안 바뀐다.
- Supabase 클라이언트: 서버 컴포넌트·Route Handler·서버 전용 조회는 `@/lib/supabase/server`의 `await createClient()`(`cookies()`가 비동기). 클라이언트 컴포넌트는 `@/lib/supabase/client`의 `createClient()`(동기). `createBrowserClient`가 싱글톤을 돌려주므로 여러 곳에서 불러도 같은 인스턴스다. `server.ts`의 `setAll` try/catch는 서버 컴포넌트(읽기 전용)에서 쿠키 쓰기가 실패해서 둔 것이다. 정상이니 건드리지 않는다. `server.ts`를 클라이언트 컴포넌트에서 import하면 빌드가 깨진다.
- 클라이언트 코드에서 `SUPABASE_SERVICE_ROLE_KEY`를 쓰지 않는다. 공개 번들에 들어간다. 지금 `src/`에 이 키를 읽는 코드는 없다. 클라이언트는 `NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_ANON_KEY`만 쓴다.
- 랭킹 뷰 `v_daily_change`, `v_52w_extremes`, `v_volume_surge`는 머티리얼라이즈드 뷰다(`supabase/migrations/20261122000001_ranking_materialized_views.sql`, `20261122000002_volume_surge_view.sql`). 일봉 수집 뒤 `refresh_ranking_views()`가 돌아야 새 값이 보인다. `rankings.ts` 머리 주석의 `20260419000001_add_ranking_views.sql`은 옛 정의다. `rankings.ts`가 `components/stock/RankingTable`에서 `import type`으로 가져오는 `RankingTableRow`는 타입뿐이라 괜찮다.
- `kstNow()`의 `Date`는 KST 시각을 UTC인 척 담은 값이라 `getUTCHours()`·`getUTCDay()`로 읽는다. `getHours()`로 읽으면 어긋난다.
- `parseInt0`·`parseFloat0`은 실패하면 0이다. 0과 '값 없음'을 구분할 지표(PER·PBR 등)는 `parseDecimalOrNull`.
- `getIsTradingDay`(`market.ts`)는 평일에 삼성전자 `localTradedAt`이 오늘인지로 판정하고, 확인하지 못하면 영업일(`true`)로 본다. 머리 주석은 즐겨찾기 화면이 쓴다고 하나 지금 부르는 곳이 없다(죽은 코드).
- `getSectorConstituents`는 포맷된 문자열 `metric`을 `parseFloat`해 정렬한다. `formatPercent`의 표시 형식을 바꾸면 정렬이 깨진다.

## 파일

파일을 더하거나 지우면 이 표를 고치고 저장소 루트에서 `python3 docs/check-index.py`로 확인한다.

| 파일 | 내용 |
| --- | --- |
| `constants.ts` | 전역 상수: `PAGE_SIZE`, `ENGAGEMENT_THRESHOLD`, `STORAGE_KEYS`, `MA_PERIODS`, `RANKING`, `LIMITS`, `LIVE_CANDLE_POLL_MS` |
| `format.ts` | 표시 포맷: 상대 시간, 원화 축약(만·억·조), 부호 퍼센트, 천단위 |
| `indicators.ts` | 순수 지표 계산(MA, 볼린저, RSI, OBV)과 `aggregateCandles`, 묶음 키 `candleGroupKey` |
| `market.ts` | 서버 전용. KRX 영업일 판정 `getIsTradingDay`(`unstable_cache` 1시간). 호출처 없음 |
| `naver.ts` | 서버 전용. 네이버 모바일 증권 JSON 호출 `fetchNaverJson`(3초 타임아웃, 실패는 `null`), 종목코드 검사 |
| `parsers.ts` | 네이버 응답 문자열 파싱: 정수, 실수, 조·억 금액, 값 없음은 `null` |
| `post-reactions.ts` | 좋아요·싫어요 행 추가·삭제. 카운트는 DB 트리거가 올린다 |
| `query-client.ts` | TanStack `QueryClient` 생성. 서버는 매번 새로, 브라우저는 싱글톤 |
| `rankings.ts` | 서버 전용. 랭킹 페이지용 조회 7종이 `RankingTableRow[]`(섹터 순위는 `SectorRankingRow[]`)를 돌려준다 |
| `short-credit.ts` | 차트 공매도·신용잔고 패널용: DB 행 숫자 정규화, 봉 날짜에 맞춘 점(주·월봉 집계) |
| `time.ts` | KST 헬퍼(`kstNow`, `kstToday`, `isKstWeekend`)와 `parseTradeDate` |
| `utils.ts` | `cn`(clsx + tailwind-merge) |

### `supabase/`

| 파일 | 내용 |
| --- | --- |
| `client.ts` | 브라우저용 `createClient`(동기, 싱글톤) |
| `normalize.ts` | 조인 결과(객체·1개 배열·null)를 하나로 `firstOrNull` |
| `server.ts` | 서버용 `createClient`(async, `cookies()` 세션) |
