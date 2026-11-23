# 프로젝트 색인

에이전트와 개발자가 "어느 파일인지 모르는" 기능·API·DB 테이블·설정값을 찾는 입구다. 이 문서는 통째로 읽지 않는다: `grep -n '찾는 낱말' docs/INDEX.md`로 그 줄만 본다. 한 기능은 한 줄이고, 줄이 길어도 같은 줄에 한국어 이름과 코드 이름이 함께 있다.

- 작업 규칙: [CLAUDE.md](../CLAUDE.md). 문서 폴더의 규칙: [docs/CLAUDE.md](CLAUDE.md)
- 폴더 목록: [코드 지도](CODEMAP.md). 파일별 설명과 그 폴더의 규칙은 폴더마다의 `CLAUDE.md`에 있다
- 지난 작업과 그때의 결정: [작업 기록 색인](history/README.md). 사용자가 말로 정한 것: [결정과 일하는 방식](decisions.md)
- 기준일: 2026-11-22
- 스택: Next.js 16(App Router, RSC) + React 19 + TypeScript + Tailwind v4 + Supabase(Postgres·Auth·Realtime) + lightweight-charts. 수집은 Python 3.10(GitHub Actions). 배포는 Vercel(`main` push). 테스트는 Vitest
- 색인 점검: `python3 docs/check-index.py`
- 소스 목차: `python3 docs/outline.py <파일> [낱말]` (함수·컴포넌트의 줄 범위와 주석 첫 문장. 폴더를 주면 파일 목록)
- 검사(타입·린트·테스트): `sh tool/check.sh`
- 경로 표기: 표의 `src/` 아래 파일은 `src/`를 뺀 경로(`components/stock/StockChartSection.tsx`)로 쓰고, 기호(함수·상수 이름)는 파일 뒤에 둔다. 마이그레이션·수집 스크립트·워크플로는 저장소 루트 기준이다

## 지켜야 할 규칙

| 규칙 | 내용 |
| --- | --- |
| 서비스 롤 키 | `SUPABASE_SERVICE_ROLE_KEY`는 서버·수집기에서만 쓴다. 지금은 `stock-collector/_utils.py`의 `get_supabase`와 GitHub secrets에서만 읽는다(2026-11-22 grep: `src/`에서는 읽지 않는다). 브라우저 번들에 들어가면 RLS가 뚫리니 클라이언트 컴포넌트에서 쓰지 않는다 |
| Supabase 클라이언트 선택 | 서버 컴포넌트·Route Handler는 `lib/supabase/server.ts`의 `createClient`(`await`, cookies 기반 세션). 클라이언트 컴포넌트는 `lib/supabase/client.ts`의 `createClient`(동기, 싱글톤). 서버 쪽 `setAll`의 try/catch는 읽기 전용 컨텍스트 때문이니 지우지 않는다 |
| `STORAGE_KEYS` 리터럴 | `lib/constants.ts`의 `STORAGE_KEYS` 값(`vite-ui-theme`, `stock-favorites`, `stock-indicators`, `post-auth-next`)은 이미 배포된 사용자의 브라우저에 저장돼 있어 바꾸면 테마·즐겨찾기·지표 설정이 사라진다. 상수 이름만 리팩터링한다. `test/lib/constants.test.ts`가 값을 고정한다. 예외: 차트 서브 패널 높이 키(`pane-h-vol`, `pane-h-rsi`, `pane-h-obv`, `pane-h-short`, `pane-h-credit`)는 `components/chart/CandleChart.tsx`의 `PANE_KEYS`에 따로 있다 |
| 스키마 변경은 새 마이그레이션으로 | 테이블·컬럼·뷰·정책 변경은 `supabase/migrations/`에 새 파일을 더한다. 이미 적용된 파일을 고치지 않는다. `main`에 push하면 `.github/workflows/apply_migrations.yml`이 `supabase db push --remote`로 운영 DB에 적용한다 |
| 참여도 낮은 글은 `noindex` | 좋아요 또는 댓글이 `ENGAGEMENT_THRESHOLD`(3) 미만인 글은 `/discussions/[id]`에서 `noindex, follow`이고 sitemap에서 빠진다. 기준은 `lib/constants.ts` 한 곳이며 `app/sitemap.ts`와 `app/discussions/[id]/page.tsx`의 `isIndexable`이 같이 쓴다 |
| 도배 방지 | 설계 메모(옛 `AGENTS.md`)는 있었지만 2026-11-22 코드·마이그레이션 확인 결과 구현돼 있지 않다. 글·댓글은 클라이언트가 `supabase.from('posts').insert`, `supabase.from('comments').insert`로 직접 넣고, 서버·DB의 제한은 글 1000자·댓글 500자 check 제약뿐이다(`cooldown`, `content_hash`, rate 관련 SQL 없음). 만들 때 최종 차단은 서버 또는 DB(RPC·트리거)에 둔다. 버튼 비활성화는 UX일 뿐이다 |
| RLS를 바꿀 때 | 정책과 권한은 `supabase/migrations/`에 새 파일로만 고친다. 열 하나만 `revoke` 해서는 막히지 않는다(테이블 단위 권한이 남는다): `20261122000003_tighten_memo_and_profile_rls.sql`이 본보기다(2026-11-22에 `chart_memos`의 전체 공개 정책과 `profiles`의 열 제한 없는 update를 막았다) |
| 비밀값 | 키·토큰·서비스 롤 키를 출력하거나 커밋하지 않는다. 이름과 위치만 적는다. 수집 스크립트는 서비스 롤 키로 운영 DB에 쓰니 요청받지 않았으면 로컬에서 돌리지 않는다 |
| Next.js 16 | 학습 데이터와 다를 수 있다. `params`·`searchParams`는 Promise라 `await` 한다. 확인이 필요하면 `node_modules/next/dist/docs/`를 읽는다 |
| 실시간 구독 | `supabase.channel(...)`을 만들면 `useEffect` cleanup에서 `supabase.removeChannel(channel)`을 부른다(`components/discussion/DiscussionSection.tsx`, `components/discussion/CommentSection.tsx`, `components/discussion/PostLikeButtons.tsx`가 그렇게 한다) |

## 기능별 찾기

경로는 `src/` 기준이다. 테스트 칸은 `test/lib/`에 있는 것만 적었고(2026-11-23 `ls`: constants, format, indicators, naver, parsers, short-credit, time, supabase/normalize), 화면·훅·API는 아직 테스트가 없어 `-`다.

| 기능 | 주소 | 화면·컴포넌트 | API·lib | DB | 테스트 |
| --- | --- | --- | --- | --- | --- |
| 홈: 관심 종목 시세(내 관심 종목 카드, 30초마다 갱신) | `/` | `app/page.tsx`, `components/stock/FavoriteStockPrices.tsx` `fetchDbPrices`·`fetchLivePrices`·`POLL_MS` | `/api/stock/today?codes=`(`app/api/stock/today/route.ts`), `contexts/FavoritesContext.tsx` `useFavorites` | `candles`(KRX 일봉 최신 2개로 전일 대비 계산) | - |
| 홈: 관심 종목 토론(즐겨찾기 종목의 최신 글, 무한 스크롤) | `/` | `components/discussion/FavoriteDiscussionFeed.tsx`, `components/discussion/PostCard.tsx`, `hooks/useInfiniteScroll.ts` | `PAGE_SIZE.FAVORITES`(15) | `posts`, `stocks`, `profiles` | - |
| 종목 검색(헤더·하단 검색창. 입력 중 자동완성은 없고 Enter로 검색 페이지로 이동. 종목명·코드·토론글 통합 검색 `ILIKE`) | `/search?q=` | `components/stock/StockSearch.tsx`, `components/search/SearchForm.tsx`, `app/search/page.tsx`, `components/layout/AppHeader.tsx`(데스크톱), `components/layout/BottomBar.tsx`(모바일) | `LIMITS.SEARCH_STOCKS`(10), `LIMITS.SEARCH_POSTS`(20). 글이 상한이면 `/discussions?q=`로 넘긴다 | `stocks`, `posts`, `profiles` | - |
| 종목 상세 머리(종목명·코드·시장·즐겨찾기 별 버튼, 로딩 스켈레톤) | `/stocks/[code]` | `app/stocks/[code]/page.tsx`, `app/stocks/[code]/loading.tsx`, `components/stock/FavoriteButton.tsx` | `generateMetadata`(제목 "이름 (코드)") | `stocks`, `discussion_rooms`(공식방 id) | - |
| 차트(거래소 토글 통합·KRX·NXT, 일봉·주봉·월봉, 가격 헤더) | `/stocks/[code]` | `components/stock/StockChartSection.tsx` `EXCHANGES`·`CANDLE_TYPES`·`mergeCandles`, `components/chart/CandleChart.tsx`(lightweight-charts, `dynamic`·`ssr:false`) | `lib/indicators.ts` `aggregateCandles`(일봉을 브라우저에서 주봉·월봉으로 묶음). NXT 단독 버튼은 `disabled`("준비 중") | `candles`(`exchange` KRX/NXT, `candle_type`은 `daily`만 수집) | `test/lib/indicators.test.ts` |
| 차트 지표(이동평균선 5·20·60·120, 볼린저밴드 BB, 거래량 VOL, RSI, OBV, 공매도 비중, 신용잔고율, 툴팁, 서브 패널 높이 저장) | `/stocks/[code]` | `components/stock/StockChartSection.tsx` `DEFAULT_INDICATORS`·`toggleMA`·`toggleFlag`·`MA_COLORS`·`shortPoints`·`creditPoints`, `components/chart/CandleChart.tsx` `IndicatorOptions`·`PANE_KEYS` | `lib/indicators.ts` `calcMA`·`calcBB`·`calcRSI`·`calcOBV`, `lib/short-credit.ts` `alignShortSales`·`alignCreditBalances`(주·월봉: 공매도 비중 = 기간 합계 수량 ÷ 봉 거래량, 신용잔고율 = 기간 마지막 값), `MA_PERIODS`, 저장 `STORAGE_KEYS.INDICATORS`(토글 키 `short`·`credit`, 기본 꺼짐) | `short_sales`, `credit_balances`(패널이 켜졌을 때만 브라우저에서 종목별로 읽음) | `test/lib/indicators.test.ts`, `test/lib/short-credit.test.ts` |
| 오늘 봉(장중 현재가를 마지막 봉에 덧붙임, "15분 지연" 표시, 정규장 여부) | `/stocks/[code]` | `hooks/useTodayCandle.ts` `useTodayCandle`·`isMarketOpen`, `components/stock/StockChartSection.tsx` `allCandlesWithToday` | `/api/stock/today/[code]`(`app/api/stock/today/[code]/route.ts`), `LIVE_CANDLE_POLL_MS`(30초), `lib/time.ts` `kstToday` | - | `test/lib/time.test.ts` |
| 차트 메모: 비공개(로그인한 본인 메모만 불러오고 날짜 클릭으로 작성·삭제, 500자, 낙관적 갱신. 비로그인이 날짜를 누르면 로그인으로 보냄) | `/stocks/[code]` | `components/stock/StockChartSection.tsx` `handleDateClick`·`saveMemo`·`deleteMemo`, `components/chart/CandleChart.tsx` `onDateClick`·`memos`(롱프레스 `LP_MS`) | - | `chart_memos`(`user_id,stock_code,date` 유니크) | - |
| 차트 메모: 공개(타인의 메모 보기) | - | 없다. 코드는 `eq('user_id', userId)`로 본인 것만 읽고, DB 정책도 본인 행만 허용한다(`20261122000003_tighten_memo_and_profile_rls.sql`). 만들려면 select 정책부터 바꾼다 | - | `chart_memos` | - |
| 종목 상세 탭 틀(기업정보·시세·토론방·뉴스·공시·수급현황, 기본 탭은 토론방, 활성 탭만 마운트) | `/stocks/[code]` | `components/stock/StockDetailTabs.tsx` `TABS`·`TabId`, `components/stock/TabStatus.tsx` `TabStatus`·`toneClass`·`signed` | `hooks/useStockTabData.ts` `useStockTabData`(시세·수급·뉴스·공시 공통 fetch, 이전 요청 abort) | - | - |
| 시세 탭(최근 20영업일 일별 시세) | `/stocks/[code]` | `components/stock/QuoteSection.tsx` | `/api/stocks/[code]/quote`(`app/api/stocks/[code]/quote/route.ts`), `lib/naver.ts` `fetchNaverJson` | - | `test/lib/naver.test.ts`(`isStockCode`), `test/lib/parsers.test.ts` |
| 수급·공매도 탭(개인·외국인·기관 순매수와 외국인 보유율 20영업일 표 + KRX 공매도 종합정보 iframe 위젯) | `/stocks/[code]` | `components/stock/FlowSection.tsx` `FlowSection`·`ShortSellingWidget` | `/api/stocks/[code]/flow`(`app/api/stocks/[code]/flow/route.ts`). 공매도는 `data.krx.co.kr` 위젯을 그대로 임베드하며 `short_balances`는 읽지 않는다 | `short_balances`는 수집만 되고 `src/`에서 읽는 곳이 없음 | - |
| 뉴스 탭(묶음별 대표 기사 20개) | `/stocks/[code]` | `components/stock/NewsSection.tsx` | `/api/stocks/[code]/news`(`app/api/stocks/[code]/news/route.ts`) | - | - |
| 공시 탭(최근 20건, 본문은 네이버 모바일 공시 링크) | `/stocks/[code]` | `components/stock/DisclosureSection.tsx` | `/api/stocks/[code]/disclosures`(`app/api/stocks/[code]/disclosures/route.ts`) | - | - |
| 기업정보·재무 탭(기업개요, 액면가, 상장일, PER·PBR·ROE·EPS·BPS, 배당, 5일·20일·52주 고저) | `/stocks/[code]` | `components/stock/CompanyInfoSection.tsx` | `/api/stocks/[code]/company-info`(`app/api/stocks/[code]/company-info/route.ts`, DB 우선 + 네이버 `integration` 보강, 컬럼 누락 폴백 select), `lib/parsers.ts` `parseKrwAmount`·`parseDecimalOrNull`, `LIMITS.COMPANY_INFO_LOOKBACK_DAYS` | `stocks`, `v_latest_financials`, `candles` | `test/lib/parsers.test.ts` |
| 즐겨찾기(관심 종목. 비로그인은 localStorage, 로그인하면 서버 `favorites`에 기록, 로그인 순간 로컬을 upsert로 병합한 뒤 비움, 별 버튼, 사이드바 목록) | 종목 상세 머리, 좌측 내비 | `contexts/FavoritesContext.tsx` `FavoritesProvider`·`useFavorites`, `components/stock/FavoriteButton.tsx`, `components/layout/LeftNav.tsx` | `STORAGE_KEYS.FAVORITES` | `favorites` | `test/lib/constants.test.ts`(키 값) |
| 토론방: 글쓰기·삭제·목록(종목별 공식 토론방, 1000자, Ctrl+Enter 등록, 비로그인이 입력창을 누르면 로그인) | `/stocks/[code]` 토론방 탭 | `components/discussion/DiscussionSection.tsx` `handleSubmit`·`handleDelete`·`POST_SELECT`, `components/discussion/PostCard.tsx` | `PAGE_SIZE.ROOM`(30) | `discussion_rooms`, `posts`, `profiles` | - |
| 토론방 실시간(새 글·좋아요 수 변화 반영) | `/stocks/[code]` 토론방 탭 | `components/discussion/DiscussionSection.tsx`(채널 `room:` + roomId, `postgres_changes` INSERT·UPDATE·DELETE) | publication `supabase_realtime`에 `posts`·`post_likes`·`comments`·`post_dislikes`(`20260416000003_discussion_setup.sql`, `20260417000001_add_comments.sql`, `20260417000002_add_dislikes.sql`) | `posts` | - |
| 무한 스크롤(센티넬이 보이면 다음 페이지, 커서는 `created_at`) | 토론 피드 전부 | `hooks/useInfiniteScroll.ts` `useInfiniteScroll`, `components/discussion/DiscussionSection.tsx` `loadMore` | - | `posts` | - |
| 댓글·대댓글(최상위 + 1단계만, `@닉네임` 표시, 500자) | 토론방 탭, `/discussions/[id]` | `components/discussion/CommentSection.tsx`(채널 `comments:` + postId) | `reply_to_user_id`, 깊이 제한은 DB 트리거 `enforce_comment_depth` | `comments`, `posts.comment_count` | - |
| 좋아요·싫어요(상호 배타 토글, 낙관적 갱신, 본인 글은 비활성, 카운트는 DB 트리거가 갱신) | 토론방 탭, `/discussions/[id]` | `components/discussion/DiscussionSection.tsx` `handleLike`·`handleDislike`, `components/discussion/PostLikeButtons.tsx`(채널 `post-detail:` + postId) | `lib/post-reactions.ts` `addReaction`·`removeReaction` | `post_likes`, `post_dislikes`, `posts.like_count`·`dislike_count` | - |
| 토론 글 상세·SEO(영속 링크, canonical, OpenGraph, 참여도 낮으면 noindex) | `/discussions/[id]` | `app/discussions/[id]/page.tsx` `generateMetadata`·`isIndexable`·`fetchPostWithStock` | `lib/supabase/normalize.ts` `firstOrNull`, `ENGAGEMENT_THRESHOLD` | `posts`, `profiles`, `stocks` | `test/lib/supabase/normalize.test.ts` |
| 전체 토론 피드·토론 검색(`?q=` 본문 `ILIKE`) | `/discussions` | `app/discussions/page.tsx`, `components/discussion/DiscussionFeed.tsx`, `components/discussion/DiscussionSearchForm.tsx` | `PAGE_SIZE.DEFAULT`(20) | `posts`, `stocks`, `profiles` | - |
| 랭킹 허브(거래대금·상승률·토론 핫·시총 카드 4개, 카드마다 5행 미리보기) | `/rankings` | `app/rankings/page.tsx` `HubCard`, `components/stock/RankingTable.tsx` | `lib/rankings.ts`, `RANKING.HUB_PREVIEW_SIZE`, `revalidate = 60` | 아래 랭킹 줄 | - |
| 랭킹: 거래량·거래대금(탭 value·surge) | `/rankings/volume` | `app/rankings/volume/page.tsx`, `components/stock/RankingTabs.tsx` | `lib/rankings.ts` `getVolumeRanking`, `types/ranking.ts` `VolumeTab` | `v_daily_change`(거래대금 `today_value`), `v_volume_surge`(거래량 급증 `surge_ratio`), `stocks` | - |
| 랭킹: 등락률·52주 신고가·신저가(탭 gainers·losers·high_52w·low_52w) | `/rankings/movers` | `app/rankings/movers/page.tsx` | `lib/rankings.ts` `getMoversRanking`, `types/ranking.ts` `MoversTab` | `v_daily_change`, `v_52w_extremes`(`is_new_high`·`is_new_low`), `stocks` | - |
| 랭킹: 밸류에이션(시총·저PER·저PBR·고ROE) | `/rankings/valuation` | `app/rankings/valuation/page.tsx`(`revalidate = 300`) | `lib/rankings.ts` `getValuationRanking`, `types/ranking.ts` `ValuationTab` | `v_latest_financials`, `stocks` | - |
| 랭킹: 토론 트렌딩(토론 핫 종목, 최근 24시간 글 수 + 좋아요 x 0.5) | `/rankings/trending` | `app/rankings/trending/page.tsx` | `lib/rankings.ts` `getTrendingRanking`, `RANKING.TRENDING_WINDOW_HOURS` | `posts`, `stocks`(DB 뷰 없이 서버에서 집계) | - |
| 랭킹: 유동물량 대비 거래량(오늘 거래량 / 유동주식수) | `/rankings/float-volume` | `app/rankings/float-volume/page.tsx` | `lib/rankings.ts` `getFloatVolumeRanking` | `v_float_volume_ranking`(`volume_to_float`), `stocks.float_shares` | - |
| 랭킹: 섹터(KRX 업종, 가중 등락률·거래대금 합계)와 섹터 상세 | `/rankings/sectors`, `/rankings/sectors/[name]` | `app/rankings/sectors/page.tsx`, `app/rankings/sectors/[name]/page.tsx` | `lib/rankings.ts` `getSectorRanking`·`getSectorConstituents`, `SectorSort` | `v_sector_ranking`, `v_daily_change`, `stocks.sector` | - |
| 로그인(Google OAuth, 로그인 뒤 원래 페이지로 복귀) | `/auth/callback`, `/auth/return` | `contexts/AuthContext.tsx` `AuthProvider`·`useAuth`·`signInWithGoogle`, `app/auth/return/page.tsx`, `components/layout/LeftNav.tsx`(로그인·로그아웃 버튼) | `app/auth/callback/route.ts`(코드→세션 교환, `onboarded` 확인), 복귀 경로 `STORAGE_KEYS.POST_AUTH_NEXT`(sessionStorage) | `profiles`(`on_auth_user_created` 트리거가 가입 시 행 생성) | `test/lib/constants.test.ts`(키 값) |
| 온보딩(첫 로그인 닉네임 설정 2~20자, 중복이면 오류 23505, 끝나면 `onboarded = true`) | `/auth/setup` | `app/auth/setup/page.tsx` `consumeNextPath` | - | `profiles.nickname`·`profiles.onboarded` | - |
| 관리자 플래그 | - | `src/`에서 쓰는 곳이 없다(2026-11-22 grep) | - | `profiles.is_admin`(`20260506000001_add_profile_admin_flag.sql`, 사용자는 고칠 수 없다: `20261122000003_tighten_memo_and_profile_rls.sql`) | - |
| 프리미엄 배지(닉네임 옆 표시만. 결제·구독 흐름은 코드에 없음) | 글·댓글 목록 | `components/discussion/PostCard.tsx`, `components/discussion/CommentSection.tsx`, `components/discussion/DiscussionSection.tsx` | - | `profiles.is_premium` | - |
| 테마(라이트·다크·시스템, 첫 페인트 깜빡임 방지 인라인 스크립트) | 좌측 내비 하단 | `components/theme-provider.tsx` `ThemeProvider`·`useTheme`, `app/layout.tsx`의 `scriptStr`, `components/layout/LeftNav.tsx` `themeOptions`, `hooks/useIsDark.ts` | `STORAGE_KEYS.THEME` | - | `test/lib/constants.test.ts`(키 값) |
| 앱 쉘(데스크톱 상단 헤더 + 좌측 내비, 모바일 하단 바 + 슬라이드 내비, 스크롤 방향에 따라 숨김, 키보드가 올라오면 바 이동) | 전체 | `app/layout.tsx`, `components/layout/AppHeader.tsx`, `components/layout/LeftNav.tsx` `navItems`, `components/layout/BottomBar.tsx`, `contexts/SidebarContext.tsx`, `hooks/useScrollAtTop.ts`, `components/layout/query-provider.tsx` | - | - | - |
| sitemap·robots(정적 2개 + 전 종목 + 참여도 충족 글, `/auth/` 색인 제외) | `/sitemap.xml`, `/robots.txt` | `app/sitemap.ts`, `app/robots.ts` | `LIMITS.SITEMAP_MAX_POSTS`, `ENGAGEMENT_THRESHOLD`, `NEXT_PUBLIC_SITE_URL` | `stocks`, `posts` | - |
| 장 운영 여부·오늘 시세 폴링(정규장 09:00-15:30 KST, 폴링은 09:00-16:20까지, 휴장일 판정) | - | `hooks/useTodayCandle.ts` `isMarketOpen`·`isBeforeBatchCollection`, `lib/market.ts` `getIsTradingDay`(주말이면 false, 평일은 삼성전자 체결일이 오늘인지로 판정, 1시간 `unstable_cache`. `src/`에서 부르는 곳이 없다), `lib/time.ts` `kstNow`·`kstToday`·`isKstWeekend`·`parseTradeDate` | `LIVE_CANDLE_POLL_MS` | - | `test/lib/time.test.ts` |
| 숫자·날짜 서식(상대 시간, 억·조 압축, 퍼센트) | - | `lib/format.ts` `formatRelativeTime`·`formatKRWCompact`·`formatPercent`·`formatNumber`, `lib/utils.ts` `cn` | - | - | `test/lib/format.test.ts` |
| 네이버 응답 파싱(콤마·단위 문자열 → 숫자) | - | - | `lib/parsers.ts` `parseInt0`·`parseFloat0`·`parseDecimalOrNull`·`parseKrwAmount`, `lib/naver.ts` `isStockCode`·`fetchNaverJson` | - | `test/lib/parsers.test.ts`, `test/lib/naver.test.ts` |

## API

`src/app/api/` 아래 라우트 파일 7개와 `app/auth/callback/route.ts`를 전부 읽었다(2026-11-22). 모두 `GET`만 내보낸다. 외부 호출은 호스트만 적는다: 네이버 모바일 증권 `m.stock.naver.com`(`/api/stock/...`, `/api/news/...`). 공통 헤더 `User-Agent: Mozilla/5.0`.

| 경로 | 메서드 | 하는 일 | 가져오는 곳 | 캐시 | 파일 |
| --- | --- | --- | --- | --- | --- |
| `/api/stock/today?codes=005930,000660` | GET | 여러 종목의 오늘 종가·전일비·등락률·날짜를 한 번에. 6자리 숫자만 받고 `LIMITS.BATCH_PRICE_CODES`(50)개로 자름. 실패한 종목은 키가 빠진다. 응답 `{ prices }` | 외부: `m.stock.naver.com`(`/api/stock/{code}/basic`) | `cache: 'no-store'` | `app/api/stock/today/route.ts` |
| `/api/stock/today/[code]` | GET | 단일 종목 오늘 캔들 `{ date, open, high, low, close, volume }`. `basic`이 시가·고가·저가·거래량을 비우면 `integration`의 `totalInfos`로 메우고, 그래도 없으면 고가·저가를 시가·종가의 max·min으로 폴백. 코드 형식 검증은 하지 않는다. 실패는 `{ error }`(404 또는 upstream 상태) | 외부: `m.stock.naver.com`(`/basic`, `/integration`) | `cache: 'no-store'` | `app/api/stock/today/[code]/route.ts` |
| `/api/stocks/[code]/quote` | GET | 시세 탭: 최근 20영업일 일별 시세(종가·전일비·등락률·시가·고가·저가·거래량). 응답 `{ data }`. 코드 형식 오류 400, 외부 실패 502 | 외부: `m.stock.naver.com`(`/stock/{code}/price?pageSize=20`) | `fetchNaverJson` revalidate 60초, 타임아웃 3초 | `app/api/stocks/[code]/quote/route.ts` |
| `/api/stocks/[code]/flow` | GET | 수급 탭: 투자자별 순매수(개인·외국인·기관)와 외국인 보유율 20영업일. 전일비 부호는 방향 코드(`FALLING`, `LOWER_LIMIT`)로 맞춤 | 외부: `m.stock.naver.com`(`/stock/{code}/trend?pageSize=20`) | revalidate 60초, 타임아웃 3초 | `app/api/stocks/[code]/flow/route.ts` |
| `/api/stocks/[code]/news` | GET | 뉴스 탭: 기사 묶음의 첫 기사만 평탄화해 최대 20개(제목·요약·언론사·시각·이미지·링크) | 외부: `m.stock.naver.com`(`/news/stock/{code}?pageSize=20`) | revalidate 300초, 타임아웃 3초 | `app/api/stocks/[code]/news/route.ts` |
| `/api/stocks/[code]/disclosures` | GET | 공시 탭: 최근 20건(제목·제출인·시각·네이버 모바일 공시 링크) | 외부: `m.stock.naver.com`(`/stock/{code}/disclosure?pageSize=20`) | revalidate 300초, 타임아웃 3초 | `app/api/stocks/[code]/disclosures/route.ts` |
| `/api/stocks/[code]/company-info` | GET | 기업정보 탭: `stocks` 메타 + `v_latest_financials` + 최근 252일 KRX 일봉(5일·20일·52주 고저, 전일 종가) + 네이버 `integration` 보강(DB 값이 비면 PER·시총·배당 등을 채움). select가 실패하면 축소 컬럼으로 한 번 더 조회 | Supabase: `stocks`, `v_latest_financials`, `candles`. 외부: `m.stock.naver.com`(`/integration`) | 라우트는 cookies 기반 `createClient`를 써서 동적. 네이버 보강은 `no-store`, 타임아웃 1.2초 | `app/api/stocks/[code]/company-info/route.ts` |
| `/auth/callback` | GET | OAuth 콜백: `code`를 세션으로 교환한 뒤 `profiles.onboarded`가 false면 `/auth/setup`, 아니면 `/auth/return`으로 리다이렉트. 실패하면 `/?error=auth` | Supabase Auth, `profiles` | - | `app/auth/callback/route.ts` |

## DB

마이그레이션은 `supabase/migrations/`에 21개(2026-11-23)이고 파일 이름의 날짜순으로 적용된다. 앱은 `src/`에서 anon 키(RLS)로 읽고 쓰며, 수집기는 서비스 롤로 쓴다. 타입 선언은 `types/stock.ts`(`Stock`, `Candle`, `CandleType`), `types/discussion.ts`(`Post`, `DiscussionRoom`), `types/ranking.ts`(`DailyChangeRow`, `LatestFinancialsRow`, `ExtremesRow`, `RankingRow`, 탭 유니온 3개)에 있다. `favorites`, `comments`, `chart_memos`, `short_balances`, `v_volume_surge`, `v_float_volume_ranking`, `v_sector_ranking`의 타입은 따로 없고 쓰는 파일 안에서 인라인으로 선언한다. `types/discussion.ts`의 `Post`에는 `dislike_count`·`comment_count`가 없다.

### 테이블

| 이름 | 종류 | 무엇 | 만든·바꾼 마이그레이션 | 읽는 곳 | 쓰는 곳 |
| --- | --- | --- | --- | --- | --- |
| `profiles` | 테이블 | 로그인 사용자(닉네임 unique, `is_premium`, `score`, `onboarded`, `is_admin`). `auth.users`에 1:1. 전체 조회 가능, 본인이 `nickname`·`onboarded`만 update | `20260413000001_init_schema.sql`, `20260416000001_add_onboarded.sql`, `20260506000001_add_profile_admin_flag.sql`, `20261122000003_tighten_memo_and_profile_rls.sql` | `contexts/AuthContext.tsx`, `app/auth/callback/route.ts`, `app/search/page.tsx`, `app/discussions/[id]/page.tsx`, `components/discussion/DiscussionFeed.tsx`, `components/discussion/FavoriteDiscussionFeed.tsx`, `components/discussion/DiscussionSection.tsx`, `components/discussion/CommentSection.tsx`(글·댓글 조인) | `app/auth/setup/page.tsx`(닉네임·`onboarded`), 트리거 `handle_new_user`(가입 시 닉네임 = 이메일 앞부분) |
| `stocks` | 테이블 | 종목(`code` PK, `name`, `market` KOSPI/KOSDAQ, `sector`, `shares_outstanding`, `float_shares`, `description`, `face_value`, `substitute_value`·`ipo_price`(채우는 곳·읽는 곳 없음, 2026-11-22 화면에서 뺐다), `listing_date`, `capital`, `foreign_ownership_ratio`) | `20260413000001_init_schema.sql`, `20260419000002_stock_meta.sql`, `20260419000003_stock_sector.sql`, `20260429000001_company_info_fields.sql` | `app/stocks/[code]/page.tsx`, `app/search/page.tsx`, `app/sitemap.ts`, `app/discussions/[id]/page.tsx`, `app/api/stocks/[code]/company-info/route.ts`, `lib/rankings.ts`, 토론 피드 컴포넌트 | `stock-collector/collect_candles.py`(목록), `stock-collector/collect_company_info.py`, `stock-collector/collect_wisereport.py` |
| `candles` | 테이블 | 일봉 OHLCV(`exchange` KRX/NXT, `candle_type`, 유니크 `stock_code,exchange,candle_type,date`). 수집은 `daily`만 | `20260413000001_init_schema.sql`, `20260414000001_add_exchange_to_candles.sql`, `20261122000001_ranking_materialized_views.sql`(날짜 범위 인덱스) | `components/stock/StockChartSection.tsx`, `components/stock/FavoriteStockPrices.tsx`, `app/api/stocks/[code]/company-info/route.ts`, 머티리얼라이즈드 뷰의 원본 | `stock-collector/collect_candles.py` |
| `financials` | 테이블 | 분기 재무(`stock_code,year,quarter` 유니크). 매출·영업이익·순이익·`equity`·`total_assets`·PER·PBR·ROE·EPS·BPS·부채비율·시총·EV/EBITDA·배당·배당수익률·신용잔고비율 | `20260413000002_add_financials.sql`, `20260429000001_company_info_fields.sql`, `20260502000001_financials_balance_sheet.sql`, `20261122000005_financials_net_income_ttm.sql`(`net_income_ttm`) | `v_latest_financials`를 거쳐 읽음. 수집기 `stock-collector/calculate_ratios.py`가 직접 읽음 | `stock-collector/collect_financials.py`, `stock-collector/calculate_ratios.py`, `stock-collector/collect_company_info.py`(배당), `stock-collector/collect_wisereport.py`(EV/EBITDA·배당) |
| `discussion_rooms` | 테이블 | 종목별 토론방(`is_official`, `owner_id`, `tags`). 종목마다 공식방 1개. 개설은 프리미엄만(RLS) | `20260413000001_init_schema.sql`, `20260416000003_discussion_setup.sql` | `app/stocks/[code]/page.tsx`(공식방 id) | 트리거 `handle_new_stock`(종목 insert 시 공식방 생성), 마이그레이션의 기존 종목 백필 |
| `posts` | 테이블 | 토론 글(1000자 이하, `like_count`·`dislike_count`·`comment_count`). 전체 조회, 로그인 작성, 본인 삭제. update 정책 없음(카운트는 트리거가 갱신) | `20260413000001_init_schema.sql`, `20260417000001_add_comments.sql`, `20260417000002_add_dislikes.sql`, `20260417000003_fix_trigger_security.sql` | `components/discussion/DiscussionSection.tsx`, `components/discussion/DiscussionFeed.tsx`, `components/discussion/FavoriteDiscussionFeed.tsx`, `app/search/page.tsx`, `app/discussions/[id]/page.tsx`, `lib/rankings.ts`, `app/sitemap.ts` | `components/discussion/DiscussionSection.tsx`(insert·delete) |
| `comments` | 테이블 | 댓글(500자 이하, `parent_id`, `reply_to_user_id`). 깊이 1단계 | `20260417000001_add_comments.sql` | `components/discussion/CommentSection.tsx` | `components/discussion/CommentSection.tsx`(insert·delete) |
| `post_likes` | 테이블 | 글 좋아요(`post_id,user_id` PK) | `20260416000003_discussion_setup.sql` | `components/discussion/DiscussionSection.tsx`, `components/discussion/PostLikeButtons.tsx` | `lib/post-reactions.ts`(`addReaction`·`removeReaction`) |
| `post_dislikes` | 테이블 | 글 싫어요(구조는 `post_likes`와 같음) | `20260417000002_add_dislikes.sql` | `components/discussion/DiscussionSection.tsx`, `components/discussion/PostLikeButtons.tsx` | `lib/post-reactions.ts` |
| `favorites` | 테이블 | 로그인 사용자의 관심 종목(`user_id,stock_code` PK, `stock_name`). 본인만 | `20260416000002_favorites_and_memo_fix.sql` | `contexts/FavoritesContext.tsx` | `contexts/FavoritesContext.tsx`(upsert 병합·insert·delete) |
| `chart_memos` | 테이블 | 차트 날짜별 메모(500자). 본인 행만 읽기·쓰기·수정·삭제(2026-11-22 `20261122000003_tighten_memo_and_profile_rls.sql`. 그 전에는 프로토타입 정책으로 전체 공개였다). 유니크는 `(user_id, stock_code, date)`. `user_id`는 NULL 허용이고 FK가 없다 | `20260413000001_init_schema.sql`, `20260415000001_add_public_chart_notes.sql`, `20260416000002_favorites_and_memo_fix.sql`, `20261122000003_tighten_memo_and_profile_rls.sql` | `components/stock/StockChartSection.tsx` | `components/stock/StockChartSection.tsx`(upsert·delete) |
| `short_balances` | 테이블 | 공매도 잔고(`stock_code,date` PK, 수량·금액·상장주식수·잔고 비중). KRX가 T+2 영업일 18:00 이후 공시 | `20260420000001_add_short_balances.sql` | `src/`에서 읽는 곳 없음(수급 탭은 KRX 위젯을 임베드) | `stock-collector/collect_short_balances.py` |
| `short_sales` | 테이블 | 공매도 일별 체결(`stock_code,date` PK, 수량·대금·거래량 대비 비중·거래대금 대비 비중). KRX 정규장 기준 | `20261123000001_short_sales_credit_balances.sql` | 차트 공매도 패널 | `stock-collector/collect_kis_flows.py` |
| `credit_balances` | 테이블 | 신용잔고 일별(`stock_code,date` PK, date는 매매일. 융자 잔고 수량·금액(원)·잔고율, 신규·상환 수량, 대주 잔고). 결제일 기준이라 최근 2영업일은 없음 | `20261123000001_short_sales_credit_balances.sql` | `app/api/stocks/[code]/company-info/route.ts`(신용잔고비율), 차트 신용잔고 패널 | `stock-collector/collect_kis_flows.py` |
| `price_predictions` | 테이블 | 가격 예측(`user_id,stock_code,target_date` 유니크). 코드에서 쓰이지 않음(2026-11-22 grep) | `20260413000001_init_schema.sql` | 없음 | 없음 |
| `user_blocks` | 테이블 | 사용자 차단. 코드에서 쓰이지 않음(2026-11-22 grep) | `20260413000001_init_schema.sql` | 없음 | 없음 |

### 뷰·머티리얼라이즈드 뷰·함수·트리거

| 이름 | 종류 | 무엇 | 만든·바꾼 마이그레이션 | 읽는 곳 | 쓰는 곳 |
| --- | --- | --- | --- | --- | --- |
| `v_daily_change` | 머티리얼라이즈드 뷰 | 종목별 오늘(최신 KRX 일봉) vs 직전일: `today_*`, `today_value`(종가 x 거래량), `prev_close`, `change_rate`. 최근 30일 안에 거래가 없는 종목은 제외. 유니크 인덱스 `v_daily_change_stock_code` | `20260419000001_add_ranking_views.sql`(일반 뷰), `20261122000001_ranking_materialized_views.sql`(머티리얼라이즈드로 전환) | `lib/rankings.ts` | `refresh_ranking_views()`가 갱신 |
| `v_52w_extremes` | 머티리얼라이즈드 뷰 | 52주(252영업일) 고저와 `is_new_high`·`is_new_low`. 최근 400일 범위 | 위와 같음 | `lib/rankings.ts` `getMoversRanking` | `refresh_ranking_views()` |
| `v_volume_surge` | 머티리얼라이즈드 뷰 | 오늘 거래량 / 직전 20영업일 평균(`surge_ratio`). 직전 20일이 다 있는 종목만. 20이 SQL에 박혀 있다 | `20261122000002_volume_surge_view.sql` | `lib/rankings.ts` `getVolumeRanking` | `refresh_ranking_views()` |
| `v_latest_financials` | 뷰 | 종목별 최신 분기 재무(`distinct on (stock_code)`) | `20260419000001_add_ranking_views.sql`, `20260429000001_company_info_fields.sql`(컬럼 추가) | `lib/rankings.ts` `getValuationRanking`, `app/api/stocks/[code]/company-info/route.ts` | - |
| `v_float_volume_ranking` | 뷰 | `stocks.float_shares`가 있는 종목의 `volume_to_float` | `20260419000002_stock_meta.sql`, `20261122000001_ranking_materialized_views.sql`(재생성) | `lib/rankings.ts` `getFloatVolumeRanking` | - |
| `v_sector_ranking` | 뷰 | 섹터별 종목 수·상승·하락 수·평균 등락·거래대금 합·거래대금 가중 등락률 | `20260419000003_stock_sector.sql`, `20261122000001_ranking_materialized_views.sql`(재생성) | `lib/rankings.ts` `getSectorRanking` | - |
| `refresh_ranking_views()` | 함수 | 머티리얼라이즈드 뷰 3개를 `concurrently`로 갱신. `security definer`, `service_role`만 실행 가능 | `20261122000001_ranking_materialized_views.sql`, `20261122000002_volume_surge_view.sql`(3개로 교체) | - | `stock-collector/collect_candles.py`(`supabase.rpc("refresh_ranking_views")`) |
| `handle_new_user` / `on_auth_user_created` | 함수 / 트리거 | 가입하면 `profiles` 행 생성 | `20260413000001_init_schema.sql` | - | DB 내부 |
| `handle_new_stock` / `on_stock_created` | 함수 / 트리거 | 종목이 생기면 공식 토론방 생성 | `20260416000003_discussion_setup.sql` | - | DB 내부 |
| `sync_post_like_count` / `on_post_like_change`, `sync_post_dislike_count` / `on_post_dislike_change`, `sync_post_comment_count` / `on_comment_change` | 함수 / 트리거 | 좋아요·싫어요·댓글 수를 `posts` 카운트에 반영. `security definer`로 바꿈(RLS가 update를 막아서) | `20260416000003_discussion_setup.sql`, `20260417000001_add_comments.sql`, `20260417000002_add_dislikes.sql`, `20260417000003_fix_trigger_security.sql` | - | DB 내부 |
| `enforce_comment_depth` / `on_comment_insert_check_depth` | 함수 / 트리거 | 대댓글의 대댓글을 막음 | `20260417000001_add_comments.sql` | - | DB 내부 |

## 수집 작업

워크플로는 `.github/workflows/`에 6개다. cron은 UTC로 적혀 있고 아래는 KST로 바꾼 값이다. 수집 스크립트는 `stock-collector/`에 있고 공용 함수(`get_supabase`, `chunked_upsert`, `fetch_all`, `fit_numeric`, 영업일 계산)는 `stock-collector/_utils.py`다. 의존성은 `stock-collector/requirements.txt`(고정 버전). 웹 배포용 워크플로는 없다(Vercel이 `main` push를 배포한다).

| 워크플로 | 스크립트 | 일정(KST) | 외부 소스 | 쓰는 테이블 | secret 이름 |
| --- | --- | --- | --- | --- | --- |
| `.github/workflows/collect_candles.yml`(일봉 데이터 수집) | `stock-collector/collect_candles.py`(상장사 목록 upsert → 거래소별 증분 일봉 → `refresh_ranking_views` 호출), 이어서 `stock-collector/calculate_ratios.py`(EPS·BPS·시총·PER·PBR·ROE·부채비율·배당수익률 계산) | 평일 16:00(`0 7 * * 1-5`) + 수동 | FinanceDataReader(KRX와 NXT 일봉, 상장 목록. 호스트는 라이브러리가 정한다) | `stocks`, `candles`, 머티리얼라이즈드 뷰 3개 갱신, `financials` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DART_API_KEY`(워크플로가 넘기지만 `collect_candles.py`는 읽지 않는다) |
| `.github/workflows/collect_company_info.yml`(기업 기본 정보 수집) | `stock-collector/collect_company_info.py` | 월요일 09:00(`0 0 * * 1`) + 수동 | pykrx(KRX: 시총·상장주식수·배당·외국인지분율 — KRX가 로그인을 요구해 현재 빈 결과), FinanceDataReader(업종·상장일), DART `opendart.fss.or.kr`(자본금) | `stocks`(`sector`, `listing_date`, `shares_outstanding`, `foreign_ownership_ratio`, `capital`), `financials`(`dividend`) | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DART_API_KEY` |
| `.github/workflows/collect_financials.yml`(재무 정보 수집) | `stock-collector/collect_financials.py`(최근 4분기 연결재무제표) | 월요일 10:00(`0 1 * * 1`) + 수동 | DART `opendart.fss.or.kr`(`corpCode.xml`, `fnlttSinglAcnt.json`) | `financials`(매출·영업이익·순이익·영업이익률·`equity`·`total_assets`) | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DART_API_KEY`(이 스크립트는 필수) |
| `.github/workflows/collect_wisereport.yml`(기업 개요 보강) | `stock-collector/collect_wisereport.py` | 월요일 12:00(`0 3 * * 1`) + 수동 | WiseReport `navercomp.wisereport.co.kr` | `stocks`(`face_value`, `float_shares`, `description`, `listing_date`, `shares_outstanding`), `financials`(`ev_ebitda`, `dividend`) | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `.github/workflows/collect_short_balances.yml`(공매도 잔고 수집) | `stock-collector/collect_short_balances.py --mode daily/retry/backfill` | 평일 18:10 daily(T-2 영업일 1일치), 평일 20:00 retry(최근 5영업일 중 빈 날짜), 수동 실행 때 모드 선택(backfill은 최근 365일) | pykrx(KRX 공매도 잔고) | `short_balances` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `.github/workflows/collect_kis_flows.yml`(공매도·신용잔고 수집, KIS) | `stock-collector/collect_kis_flows.py --mode daily/backfill` | 평일 18:30 daily(공매도 최근 14일, 신용 최근 45일), 수동 실행 때 모드 선택(backfill은 최근 365일) | 한국투자증권 Open API(`FHPST04830000`, `FHPST04760000`) | `short_sales`, `credit_balances` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `KIS_APP_KEY`, `KIS_APP_SECRET` |
| `.github/workflows/apply_migrations.yml`(Supabase 마이그레이션 적용) | 스크립트 없음. Supabase CLI 3.2.0으로 `supabase link` 후 `supabase db push --remote --yes` | `main`에 `supabase/migrations/**` 변경이 push될 때 + 수동 | Supabase 관리 API | 운영 DB 스키마 | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`(없으면 `SUPABASE_URL`에서 프로젝트 ref를 뽑는다) |

## 설정값

### 환경 변수

| 이름 | 어디서 읽나 | 무엇 |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `app/layout.tsx`, `app/sitemap.ts`, `app/robots.ts` | 사이트 절대 URL(`metadataBase`, sitemap, robots). 없으면 `http://localhost:3000` |
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabase/server.ts`, `lib/supabase/client.ts` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabase/server.ts`, `lib/supabase/client.ts` | anon 키(RLS 적용) |
| `SUPABASE_URL` | `stock-collector/_utils.py`(`os.environ`) | 수집기용 Supabase URL. 웹의 `NEXT_PUBLIC_SUPABASE_URL`과 이름이 다르다. `.env.example`에 없다. 수집기는 `load_dotenv()`로 `.env`도 읽는다 |
| `SUPABASE_SERVICE_ROLE_KEY` | `stock-collector/_utils.py` | 수집기용 서비스 롤 키(RLS 우회). `.env.example`에 있지만 `src/`는 읽지 않는다 |
| `DART_API_KEY` | `stock-collector/collect_financials.py`(`os.environ[...]`, 필수), `stock-collector/collect_company_info.py`(`os.environ.get`, 비면 자본금 수집을 건너뜀) | DART OpenAPI 키. `.env.example`에 없다 |
| `KIS_APP_KEY`, `KIS_APP_SECRET` | 코드에서 쓰이지 않음(2026-11-22 grep) | `.env.example`에만 있다(한국투자증권 KIS) |
| `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | 코드에서 쓰이지 않음(2026-11-22 grep) | `.env.example`에만 있다 |
| GitHub secrets | `.github/workflows/` 아래 워크플로 | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DART_API_KEY`(수집), `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`(마이그레이션). 값은 저장소에 없고 GitHub 설정에 있다 |
| Supabase 대시보드 설정 | 코드 밖 | Google OAuth 허용 복귀 주소, Realtime, anon `statement_timeout`(마이그레이션 주석은 3초) 등. 현재 값은 확인 못 함 |

설정 파일: `supabase/config.toml`(로컬 Supabase용. `api.max_rows = 1000`은 PostgREST 한 번 응답 상한이라 수집기의 `fetch_all`이 페이지네이션한다), `components.json`(shadcn), `eslint.config.mjs`, `tsconfig.json`, `postcss.config.mjs`. `next.config.ts`는 옵션이 비어 있다.

### 상수(`lib/constants.ts`의 export 전부)

| 상수 | 값 | 쓰는 곳 |
| --- | --- | --- |
| `PAGE_SIZE.DEFAULT` | 20 | `components/discussion/DiscussionFeed.tsx` |
| `PAGE_SIZE.ROOM` | 30 | `components/discussion/DiscussionSection.tsx` |
| `PAGE_SIZE.FAVORITES` | 15 | `components/discussion/FavoriteDiscussionFeed.tsx` |
| `ENGAGEMENT_THRESHOLD` | 3 | `app/sitemap.ts`, `app/discussions/[id]/page.tsx` |
| `STORAGE_KEYS.THEME` | `vite-ui-theme`(localStorage) | `app/layout.tsx`(인라인 스크립트와 `ThemeProvider`) |
| `STORAGE_KEYS.FAVORITES` | `stock-favorites`(localStorage) | `contexts/FavoritesContext.tsx` |
| `STORAGE_KEYS.INDICATORS` | `stock-indicators`(localStorage) | `components/stock/StockChartSection.tsx` |
| `STORAGE_KEYS.POST_AUTH_NEXT` | `post-auth-next`(sessionStorage) | `contexts/AuthContext.tsx`, `app/auth/return/page.tsx`, `app/auth/setup/page.tsx` |
| `MA_PERIODS` | 5, 20, 60, 120 | `components/stock/StockChartSection.tsx`(토글 버튼). 기본 켜짐 목록 `DEFAULT_INDICATORS.ma`는 같은 값을 따로 적어 두었다 |
| `RANKING.PAGE_SIZE` | 50 | `lib/rankings.ts` |
| `RANKING.HUB_PREVIEW_SIZE` | 5 | `app/rankings/page.tsx` |
| `RANKING.VOLUME_SURGE_LOOKBACK_DAYS` | 20 | `app/rankings/volume/page.tsx`의 안내 문구만. 실제 계산은 `v_volume_surge`의 SQL에 20이 박혀 있어 이 값을 바꿔도 순위는 변하지 않는다 |
| `RANKING.TRENDING_WINDOW_HOURS` | 24 | `lib/rankings.ts`, `app/rankings/trending/page.tsx`, `app/rankings/page.tsx` |
| `LIMITS.SEARCH_STOCKS` | 10 | `app/search/page.tsx` |
| `LIMITS.SEARCH_POSTS` | 20 | `app/search/page.tsx` |
| `LIMITS.SITEMAP_MAX_POSTS` | 10000 | `app/sitemap.ts` |
| `LIMITS.COMPANY_INFO_LOOKBACK_DAYS` | 20 | `app/api/stocks/[code]/company-info/route.ts` |
| `LIMITS.BATCH_PRICE_CODES` | 50 | `app/api/stock/today/route.ts` |
| `LIVE_CANDLE_POLL_MS` | 30000 | `hooks/useTodayCandle.ts` |

상수 파일 밖에 따로 있는 값: `components/stock/FavoriteStockPrices.tsx`의 `POLL_MS`(30초, `LIVE_CANDLE_POLL_MS`와 별개), `lib/naver.ts`의 `NAVER_TIMEOUT_MS`(3초)·`NAVER_API_BASE`, `lib/time.ts`의 `KST_OFFSET_MS`, `components/chart/CandleChart.tsx`의 `LP_MS`(롱프레스 500ms)·`PANE_KEYS`.

### 캐시·재검증·폴링

| 무엇 | 값 | 파일 |
| --- | --- | --- |
| 랭킹 페이지 `revalidate` | 60초(허브·거래량·등락률·유동물량·섹터·섹터 상세·토론 핫), 300초(밸류에이션). 서버 `createClient`가 cookies를 읽어 실제로 정적 캐시가 되는지는 확인 못 함 | `app/rankings/page.tsx`, `app/rankings/valuation/page.tsx` 등 |
| 네이버 프록시 `fetchNaverJson` | 시세·수급 60초, 뉴스·공시 300초(Next fetch `revalidate`), 타임아웃 3초 | `lib/naver.ts`, `app/api/stocks/[code]/quote/route.ts`, `app/api/stocks/[code]/flow/route.ts`, `app/api/stocks/[code]/news/route.ts`, `app/api/stocks/[code]/disclosures/route.ts` |
| 오늘 시세 API | `cache: 'no-store'`(항상 새로 요청) | `app/api/stock/today/route.ts`, `app/api/stock/today/[code]/route.ts` |
| 기업정보 네이버 보강 | `no-store`, 타임아웃 1.2초 | `app/api/stocks/[code]/company-info/route.ts` |
| 영업일 판정 | `unstable_cache`, 키 `market-trading-day`, 3600초. `getIsTradingDay`를 부르는 곳은 없다 | `lib/market.ts` |
| 오늘 봉 폴링 | 30초. 평일 09:00-16:20 KST에만 돌고 정규장(15:30)이 끝나면 오늘 봉을 받은 뒤 멈춘다. 일봉 수집 워크플로는 16:00에 도니 16:20과 어긋난다 | `hooks/useTodayCandle.ts` |
| 홈 관심 종목 폴링 | 30초(`POLL_MS`). 시간대 제한 없음 | `components/stock/FavoriteStockPrices.tsx` |
| TanStack Query `staleTime` | 5분. `QueryProvider`는 루트 레이아웃에 있지만 `useQuery`를 쓰는 곳은 없다(2026-11-22 grep) | `lib/query-client.ts`, `components/layout/query-provider.tsx` |
| 머티리얼라이즈드 뷰 갱신 | 일봉 수집 직후 한 번(평일 16:00 워크플로 끝) | `stock-collector/collect_candles.py`, `20261122000001_ranking_materialized_views.sql` |

## 자주 하는 작업

순서는 기존 코드가 실제로 걸쳐 있는 파일을 따라간 것이다. 끝에는 항상 `sh tool/check.sh`와 `python3 docs/check-index.py`를 돌리고, 이 색인과 해당 폴더 `CLAUDE.md`의 파일 표를 고친다.

| 작업 | 순서 |
| --- | --- |
| 종목 상세에 탭을 더한다(시세·수급·뉴스·공시 탭이 이 구조) | 1) `app/api/stocks/[code]/` 아래 새 폴더에 `route.ts`를 만들고 `GET`을 낸다: `isStockCode`로 검증, `fetchNaverJson(경로, revalidate)`, 숫자는 `lib/parsers.ts`로 정규화, 응답 `{ data }`, 실패는 400·502. 네이버가 아닌 소스(Supabase)면 `app/api/stocks/[code]/company-info/route.ts`를 본보기로 `lib/supabase/server.ts`를 쓴다 2) `components/stock/` 아래 새 `Section` 컴포넌트: `useStockTabData<행 타입>(url)`과 `TabStatus`·`toneClass`·`signed` 3) `components/stock/StockDetailTabs.tsx`의 `TabId` 유니온·`TABS` 배열·아래 삼항 렌더 체인에 추가 4) 순수 계산이 있으면 `lib/`에 빼고 `test/lib/`에 테스트 5) 색인 `기능별 찾기`·`API` 줄과 `app/CLAUDE.md`·`components/CLAUDE.md` 파일 표 |
| 랭킹을 하나 더한다 | 1) 집계가 무거우면(candles 전체를 훑는 윈도 함수) 마이그레이션에 머티리얼라이즈드 뷰를 만들고 `create unique index`(`refresh ... concurrently`에 필요), `grant select ... to anon, authenticated`, `refresh_ranking_views()`를 `create or replace`로 다시 정의해 새 뷰를 넣고 `notify pgrst, 'reload schema'`. `20261122000002_volume_surge_view.sql`이 본보기다 2) `lib/rankings.ts`에 `getXxxRanking` 함수를 만든다(`RankingTableRow[]` 반환, `fetchStockMeta`로 종목명 붙임). 탭이 있으면 `types/ranking.ts`에 유니온 3) `app/rankings/` 아래 새 폴더의 `page.tsx`: `export const metadata`, `export const revalidate`, `searchParams` 대기, `RankingTabs`·`RankingTable` 4) `components/layout/LeftNav.tsx`의 `navItems` `/rankings` `children`에 링크, 허브 카드가 필요하면 `app/rankings/page.tsx` 5) 새 상수는 `lib/constants.ts`의 `RANKING` |
| 테이블·컬럼을 더한다 | 1) `supabase/migrations/`에 새 파일(이름은 YYYYMMDDNNNNNN_설명.sql 꼴, 마지막 파일보다 뒤 날짜). `alter table`·`create table`, 새 테이블은 `enable row level security`와 정책, 뷰는 `with (security_invoker = on)`와 `grant select`, 실시간이 필요하면 `alter publication supabase_realtime add table` 2) `src/types/`의 타입(해당 파일이 있을 때) 3) 조회·쓰기 코드(서버는 `lib/supabase/server.ts`, 브라우저는 `client.ts`) 4) `main`에 push하면 `apply_migrations.yml`이 적용하니 푸시 뒤 실행 로그를 확인한다 5) 색인 `DB` 표와 `supabase/CLAUDE.md` 6) 수집기가 쓰는 컬럼이면 `stock-collector/`의 스크립트도(`chunked_upsert`는 행마다 키 조합이 같은 것끼리 묶어 NULL 덮어쓰기를 막는다) |
| 수집 스크립트를 더한다 | 1) `stock-collector/`에 새 수집 스크립트: `from _utils import get_supabase, chunked_upsert, fetch_all`, 머리 주석에 소스·테이블·환경 변수 2) 새 패키지는 `stock-collector/requirements.txt`에 고정 버전으로 3) `.github/workflows/`에 새 워크플로: 기존 것을 복사해 `cron`(UTC)과 이름, `env`의 secrets 4) 랭킹에 영향을 주는 테이블이면 끝에 `supabase.rpc("refresh_ranking_views")` 5) 색인 `수집 작업` 표와 `stock-collector/CLAUDE.md`, `docs/CODEMAP.md`의 워크플로 표 6) 요청받지 않았으면 로컬 실행하지 않는다(서비스 롤 키로 운영 DB에 쓴다) |
| 상수를 바꾼다 | `lib/constants.ts`에서만 바꾼다. 쓰는 곳은 위 상수 표에서 찾는다. `STORAGE_KEYS` 값은 바꾸지 않는다. `RANKING.VOLUME_SURGE_LOOKBACK_DAYS`는 SQL(`v_volume_surge`)과 같이 바꿔야 한다(새 마이그레이션). `ENGAGEMENT_THRESHOLD`는 sitemap과 noindex가 함께 움직인다. 값 고정 테스트는 `test/lib/constants.test.ts` |
| 새 페이지를 더한다 | 1) `app/` 아래 새 경로 폴더의 `page.tsx`(서버 컴포넌트가 기본, `params`·`searchParams`는 `await`). `export const metadata` 또는 `generateMetadata`에 제목 2) 색인에 넣을 페이지면 `app/sitemap.ts`에 항목을 더하고, 색인 제외면 `generateMetadata`의 `robots`를 `index: false`로(`/auth/` 아래는 `app/robots.ts`가 이미 막음) 3) 내비에 보여 줄 것이면 `components/layout/LeftNav.tsx`의 `navItems` 4) 로딩 화면은 같은 폴더의 `loading.tsx` 5) 로그인이 필요한 동작은 `useAuth()`의 `signInWithGoogle()`로 보낸다 6) 색인 `기능별 찾기` 줄과 `app/CLAUDE.md` 파일 표 |
| 환경 변수를 더한다 | 코드에서 읽고, `.env.example`에 이름만 적고, 배포가 필요하면 Vercel 환경 변수, 수집기면 GitHub secrets와 해당 워크플로의 `env`에 넣는다. 이 색인의 `설정값`에 줄을 더한다. 값은 어디에도 적지 않는다 |
| 마이그레이션 적용이 실패했다 | Actions의 `Supabase 마이그레이션 적용` 실행 로그를 먼저 본다. 이미 적용된 파일을 고치지 말고 새 마이그레이션으로 고친다. 로컬은 `supabase/config.toml`이 있지만 이 저장소의 일반 흐름은 `main` push 후 워크플로 적용이다 |

## 용어

| 말 | 뜻과 코드 이름 |
| --- | --- |
| KRX | 한국거래소 정규 시장. `candles.exchange = 'KRX'`, 차트 거래소 토글 `KRX`. 랭킹·기업정보의 일봉 기준은 모두 KRX |
| NXT | 대체거래소(넥스트레이드). `candles.exchange = 'NXT'`로 수집은 되지만 차트의 NXT 단독 버튼은 `disabled`("준비 중") |
| 통합(차트) | KRX 날짜를 기준으로 같은 날짜의 NXT가 있으면 고가 max·저가 min·거래량 합, 시가·종가는 KRX 값을 쓰는 합산. `components/stock/StockChartSection.tsx`의 `mergeCandles` |
| 일봉·주봉·월봉 | `CandleType` = `daily`·`weekly`·`monthly`. DB에는 일봉만 있고 주·월봉은 브라우저에서 `lib/indicators.ts`의 `aggregateCandles`로 묶는다 |
| 오늘 봉 | 장중 현재가로 만든 임시 봉(`todayCandle`, `useTodayCandle`). DB에 저장하지 않고 마지막 봉을 덮거나 뒤에 붙인다. 화면에 "15분 지연" |
| 정규장 | KST 평일 09:00-15:30(`isMarketOpen`). 폴링은 16:20까지(`isBeforeBatchCollection`) |
| 이평선·MA | 이동평균선 5·20·60·120(`MA_PERIODS`, `calcMA`). BB 볼린저밴드(`calcBB`), RSI(`calcRSI`), OBV(`calcOBV`) |
| 유동물량·유동주식수 | 시장에서 거래 가능한 주식 수. `stocks.float_shares` = 발행주식수 x 유동비율(`collect_wisereport.py`). 유동물량 대비 거래량 = `volume_to_float` |
| 발행주식수·상장주식수 | `stocks.shares_outstanding`. EPS·BPS·시총 계산의 분모(`calculate_ratios.py`) |
| 거래대금 | 종가 x 거래량. `v_daily_change.today_value`. 랭킹 탭 `value` |
| 거래량 급증 | 오늘 거래량 / 직전 20영업일 평균. `v_volume_surge.surge_ratio`. 랭킹 탭 `surge` |
| 52주 신고가·신저가 | 최근 252영업일 고·저와 비교. `v_52w_extremes`의 `is_new_high`·`is_new_low` |
| 가중 등락률 | 섹터 안 종목의 등락률을 거래대금으로 가중 평균. `v_sector_ranking.weighted_change` |
| 섹터·업종 | KRX 업종명. `stocks.sector`(FinanceDataReader가 채움) |
| 수급 | 투자자별 순매수(개인·외국인·기관). 수급현황 탭, 네이버 `trend` 응답 |
| 공매도 잔고 | `short_balances`(pykrx, T+2 영업일 공시). 화면은 KRX 위젯 iframe을 쓴다 |
| 공매도 체결·신용잔고 | `short_sales`(공매도 수량·비중), `credit_balances`(신용잔고율 = 융자 잔고 수량 ÷ 상장주식수). 한국투자증권 Open API로 받는다. 기업정보의 '신용잔고비율'은 `credit_balances`의 최신 값 |
| 토론방·공식방 | `discussion_rooms`. 종목마다 공식방(`is_official`) 하나가 트리거로 생긴다. 코드에서 "room"은 이 방, 화면 이름은 "토론방" |
| 관심 종목·즐겨찾기 | 같은 것. UI 문구는 "관심 종목", 코드는 `favorites`·`FavoritesContext` |
| 메모 | 차트 날짜별 메모. `chart_memos`, "차트 메모" |
| 토론 핫·트렌딩 | 최근 24시간 글 수 + 좋아요 x 0.5(`getTrendingRanking`) |
| 참여도 | 좋아요 수 또는 댓글 수. `ENGAGEMENT_THRESHOLD`(3) 미만이면 noindex·sitemap 제외 |
| 온보딩 | 가입 직후 닉네임 설정. `profiles.onboarded`, `/auth/setup` |
| 프리미엄 | `profiles.is_premium`. 배지 표시와 토론방 개설 RLS에만 쓰이고 결제 흐름은 없다 |
| 서비스 롤 | Supabase `service_role` 키. RLS를 우회한다. 수집기와 `refresh_ranking_views()` 호출에만 쓴다 |
| 머티리얼라이즈드 뷰 | 결과를 저장해 두는 뷰. 랭킹이 anon의 3초 `statement_timeout`에 걸려서 전환(`20261122000001_ranking_materialized_views.sql`). 갱신은 `refresh_ranking_views()` |

## 문서

| 문서 | 무엇의 정본인가 | 읽는 법 |
| --- | --- | --- |
| [CLAUDE.md](../CLAUDE.md) | 저장소 작업 규칙, 찾아 들어가는 길, 일하는 방식, 문서에 남기는 규칙 | 에이전트가 처음 읽는다. 짧다 |
| [docs/CLAUDE.md](CLAUDE.md) | 문서를 찾고 쓰는 법, 폴더 안내의 형식, 점검 | 문서를 만들거나 고칠 때 |
| [CODEMAP.md](CODEMAP.md) | 소스 폴더 목록과 폴더 안내 링크, 안내가 없는 폴더(`tool/`, `.github/workflows/`, `.claude/skills/`)의 파일 표 | 폴더를 알면 그 폴더 `CLAUDE.md`로 간다 |
| [decisions.md](decisions.md) | 사용자가 정한 것, 일하는 방식, 제품 결정, 아직 정하지 않은 것(미결) | `grep -n '^#'`로 절을 보고 그 절만 |
| [history/README.md](history/README.md) | 작업 기록(왜 그렇게 됐나)의 주제별 색인 | 주제 표에서 최근 줄부터. 기록은 그때의 일이다 |
| [README.md](README.md) | 초보자용 설명서의 목차와 읽는 순서. 프로젝트 주인을 위한 설명서이며 2026-09-23 소스 기준이라 그 뒤 기능이 빠져 있을 수 있다 | 일반 개념이 필요할 때만 |
| [01-big-picture.md](01-big-picture.md) | 사이트의 네 곳(브라우저·Next.js 서버·Supabase·수집기)과 기능 목록. 같은 기준일 문제가 있다: "준비 중" 줄이 시세·뉴스·공시·수급 탭을 안내 화면이라 적지만 지금은 네 탭 모두 구현돼 있고, "종목 자동완성"도 코드에 없다 | 전체 그림이 필요할 때 |
| [02-reading-code.md](02-reading-code.md) | React·Next.js 기초(컴포넌트, props, state, 서버·클라이언트 컴포넌트)를 이 저장소 코드로 설명 | 일반 개념 설명. 구현 사실은 코드가 정본 |
| [03-file-map.md](03-file-map.md) | 화면별 파일 지도와 "이걸 바꾸려면" 표. 빠진 것: "데이터만 응답하는 주소" 표에 시세·수급·뉴스·공시 API 4개와 `/auth/return`이 없다 | 이 색인과 폴더 `CLAUDE.md`가 더 최신이다 |
| [04-data-flows.md](04-data-flows.md) | 종목 페이지·주가 공급 경로·즐겨찾기·로그인·토론의 데이터 흐름. 빠진 것: 랭킹 뷰가 머티리얼라이즈드 뷰로 바뀐 것, 수급 탭의 공매도 KRX 위젯, `short_balances`를 화면이 읽지 않는 것 | 흐름을 이해할 때 |
| [05-running.md](05-running.md) | 실행·환경 변수·수집 예약표·문제 찾기. 빠진 것: 예약표에 `collect_wisereport.yml`(월 12:00)과 `apply_migrations.yml`이 없고, 문제 찾기 표의 "뉴스 탭에 준비 중 표시"는 낡았다 | 실행할 때. 일정은 위 `수집 작업` 표가 더 최신 |
| [06-practice.md](06-practice.md) | 작은 수정 실습과 AI에게 요청하는 법 | 직접 해 볼 때 |
| [../README.md](../README.md) | 저장소 소개와 설명서 링크 | 처음 한 번 |

위 설명서 일곱(`README.md`, `01`~`06`)은 프로젝트 주인을 위한 설명서이고 2026-09-23 소스 기준이다. 그 뒤에 생긴 기능(수급·공매도 탭 구현, 시세·뉴스·공시 탭, 랭킹 머티리얼라이즈드 뷰와 `v_volume_surge`, `collect_wisereport.py`)이 빠져 있을 수 있으니 지금 동작은 코드·이 색인·폴더 `CLAUDE.md`를 정본으로 본다.
