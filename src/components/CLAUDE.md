# `src/components/` 화면 부품

위: [src 입구](../CLAUDE.md) → [저장소 규칙](../../CLAUDE.md). 위 문서의 규칙은 여기서 되풀이하지 않는다.

## 이 폴더

| 하위 | 맡는 일 |
| --- | --- |
| `layout/` | 앱 쉘: 헤더, 사이드바, 모바일 하단바, Query Provider |
| `stock/` | 종목 상세(차트 영역, 탭), 랭킹 표, 검색창, 즐겨찾기 |
| `chart/` | `CandleChart` 하나(`lightweight-charts` 래퍼) |
| `discussion/` | 토론방, 피드, 댓글, 좋아요·싫어요 |
| `search/` | `/search` 검색 폼 |
| `ui/` | shadcn(`button.tsx`). import하는 곳 없음 |
| `theme-provider.tsx` | 테마 Provider와 `useTheme` |

화면만 맡는다. 조회·계산은 `src/lib/`, 전역 상태는 `src/contexts/`, 훅은 `src/hooks/`, 라우트·API는 `src/app/`. 큰 파일(`CandleChart.tsx` 743줄, `StockChartSection.tsx` 557줄, `DiscussionSection.tsx` 435줄, `CommentSection.tsx` 350줄, `LeftNav.tsx` 319줄)은 통째로 읽지 말고 `python3 docs/outline.py <파일>`로 범위를 본다.

## 어디를 볼까

| 하려는 일 | 볼 곳 | 관련 |
| --- | --- | --- |
| 종목 상세 탭(기업정보·시세·토론방·뉴스·공시·수급현황) 추가·순서 | `stock/StockDetailTabs.tsx` `TABS`, `TabId` | 기본 탭은 토론방 |
| 시세·수급·뉴스·공시 탭 데이터 | `stock/QuoteSection.tsx` 등 네 파일 → `useStockTabData.ts` `useStockTabData` | `/api/stocks/[code]/{quote,flow,news,disclosures}` → `lib/naver.ts` |
| 기업정보 탭, 탭 공용 표시 | `stock/CompanyInfoSection.tsx`(자체 `fetch`), `stock/TabStatus.tsx` `toneClass`, `signed` | `/api/stocks/[code]/company-info` |
| 차트 데이터(거래소, 일·주·월봉) | `stock/StockChartSection.tsx` `EXCHANGES`, `CANDLE_TYPES`, `fetchCandles`, `mergeCandles`, `candles` | `lib/indicators.ts` `aggregateCandles` |
| 오늘 봉 | `stock/StockChartSection.tsx` `allCandlesWithToday`, `isLiveCandle` | `hooks/useTodayCandle.ts` `useTodayCandle`, `isMarketOpen` |
| 이평선·BB·RSI·OBV·거래량·툴팁 설정 | `stock/StockChartSection.tsx` `DEFAULT_INDICATORS`, `loadIndicators`, `toggleMA`, `toggleFlag` | `STORAGE_KEYS.INDICATORS` |
| 차트 그리기(패널 높이, 색, 툴팁) | `chart/CandleChart.tsx` `IndicatorOptions`, `PANE_KEYS`, `loadPaneH`, `CHART_COLORS`, `MA_COLORS`, `lineVal`, `overlayRef`, `maKey` | `StockChartSection`에도 `MA_COLORS`가 또 있다 |
| 차트 모바일 제스처(핀치 차단, 패널 롱프레스 드래그) | `chart/CandleChart.tsx` `blockPinch`, `getSepYs`, `onSepStart`, `onSepMove`, `onSepEnd` | |
| 차트 메모(모달, 저장·삭제) | `stock/StockChartSection.tsx` `handleDateClick`, `saveMemo`, `deleteMemo`, `memoRecord`, `selectedDate` | `chart_memos` 테이블. 날짜는 `CandleChart`의 `hoveredDateRef` |
| 토론방(작성, 무한 스크롤, 실시간) | `discussion/DiscussionSection.tsx` `POST_SELECT`, `loadMore`, `handleSubmit`, `handleDelete` | `PAGE_SIZE.ROOM`, 채널 `room:<roomId>` |
| 글 좋아요·싫어요 | `discussion/DiscussionSection.tsx` `handleLike`, `handleDislike`, `discussion/PostLikeButtons.tsx` `PostLikeButtons` | `lib/post-reactions.ts`, 채널 `post-detail:<postId>` |
| 댓글·답글(1단계, 멘션) | `discussion/CommentSection.tsx` `SELECT_COLS`, `normalize`, `handleSubmit`, `startReply`, `CommentItem` | 채널 `comments:<postId>` |
| 토론 피드(전체, 즐겨찾기) | `discussion/DiscussionFeed.tsx` `fetchPage`, `discussion/FavoriteDiscussionFeed.tsx` `codesKey`, `discussion/PostCard.tsx` `PostCard` | `PAGE_SIZE.DEFAULT`·`FAVORITES` |
| 랭킹 표와 탭 | `stock/RankingTable.tsx` `RankingTableRow`, `stock/RankingTabs.tsx` `RankingTabs` | 행은 `lib/rankings.ts` |
| 검색 입력·폼 | `stock/StockSearch.tsx` `StockSearch`, `search/SearchForm.tsx`, `discussion/DiscussionSearchForm.tsx` | `/search?q=`, `/discussions?q=` |
| 앱 쉘(헤더, 사이드바, 하단바) | `layout/AppHeader.tsx`, `layout/LeftNav.tsx` `navItems`, `themeOptions`, `layout/BottomBar.tsx` `keyboardOffset` | 배치는 `app/layout.tsx` |
| 관심 종목 시세 카드 | `stock/FavoriteStockPrices.tsx` `fetchDbPrices`, `fetchLivePrices`, `POLL_MS` | `/api/stock/today?codes=` |

## 지킬 것

- 토론방 실시간(`DiscussionSection`): 채널 `room:<roomId>`가 `posts`의 INSERT·UPDATE·DELETE를 듣고 로컬 `posts`에 증분 반영한다(리페치 없음). INSERT는 새 id로 `POST_SELECT`를 한 번 조회해 앞에 붙이고, UPDATE는 세 카운트만, DELETE는 id로 거른다(필터 없이 구독). 내 글도 INSERT 이벤트로 받으니 Realtime이 끊기면 안 보인다. 댓글은 `insert().select()`로 바로 넣고 id로 중복을 막는다.
- 구독은 `useEffect` cleanup에서 `supabase.removeChannel(channel)`로 푼다(세 곳 모두). 새 구독도 같이 한다. 빠지면 채널이 쌓인다.
- 차트 흐름: `StockChartSection`이 `candles` 테이블 일봉을 읽는다. `통합`은 KRX·NXT를 `mergeCandles`로 합치고(KRX 날짜 기준, 거래량 합, 시가·종가는 KRX), `KRX`는 그대로 쓴다. NXT 버튼은 `disabled`('준비 중')다. 오늘 봉을 얹고 `aggregateCandles`로 주·월봉을 만들어 `CandleChart`에 넘긴다.
- `CandleChart`는 `dynamic(..., { ssr: false })`로 부른다. 마운트 뒤 `clientHeight`·`window`·localStorage를 읽는 effect에서 `createChart`를 하기 때문이다(이유 주석은 없다). 자리표시자 높이를 `CandleChart` 래퍼(`h-[450px] md:h-[590px]`)와 맞춘다.
- `CandleChart` effect 하나는 `candles`·`isDark`·거래량·RSI·OBV가 바뀌면 차트를 지우고 다시 만든다(범위는 최근 60봉으로 돌아간다). 다른 하나는 MA·BB만 바꾼다. 그래서 `onDateClick`·`memos`는 `onDateClickRef`·`memosRef`로 읽는다. 핸들러에서 새 prop을 쓰려면 같은 식으로 ref를 거친다. 장중 `useTodayCandle`이 30초마다 새 객체를 줘서 그때마다 다시 만들어질 것으로 읽힌다(실행 확인 못 함).
- 낙관적 업데이트는 되돌리지 않는다. 메모(`saveMemo`, `deleteMemo`), 좋아요·싫어요, 글·댓글 삭제는 화면을 먼저 바꾸고 응답 `error`를 보지 않는다. 새 낙관적 업데이트는 실패하면 되돌린다. 좋아요·싫어요 규칙(배타, 본인 글 막기)이 `DiscussionSection`과 `PostLikeButtons`에 따로 있어 한쪽을 고치면 다른 쪽도 본다.
- 스타일링: Tailwind v4 + shadcn/ui, `tailwind.config` 없음(CSS 우선, `app/globals.css`). 클래스는 `cn()`(`@/lib/utils`)으로 합친다. 다크 모드는 `<html class="dark">`이고 `ThemeProvider`(`theme-provider.tsx`)에 맡긴다. 직접 `classList`를 만지지 않는다.
- FOUC(테마 깜빡임) 방지는 `app/layout.tsx`의 `<head>` 인라인 스크립트 몫이다. `ThemeProvider`는 하이드레이션 뒤의 토글·저장만 한다. 스크립트가 `STORAGE_KEYS.THEME`을 주입하니 그 값을 바꾸지 않는다([lib 안내](../lib/CLAUDE.md)).
- `'use client'`는 필요한 가장 작은 컴포넌트에만 붙인다. 지시어가 없는 `RankingTable`, `RankingTabs`, `PostCard`, `SearchForm`, `DiscussionSearchForm`, `TabStatus`, `ui/button.tsx`는 서버 페이지가 import하니 훅·이벤트 핸들러를 넣지 않는다.
- `StockChartSection`의 지표 설정은 마운트 뒤 effect에서 읽고(`initialized`) 읽기 전에는 저장하지 않는다. 첫 렌더에서 localStorage를 읽으면 하이드레이션이 어긋난다.
- 높이 약속: `AppHeader` `h-14` = `LeftNav` `sm:top-14`, `BottomBar` `h-16` = `<body>`의 `pb-16`(`app/layout.tsx`). 랭킹 메뉴를 더하면 `LeftNav`의 `navItems`에도 넣는다.

## 파일

파일을 더하거나 지우면 이 표를 고치고 저장소 루트에서 `python3 docs/check-index.py`로 확인한다.

| 파일 | 내용 |
| --- | --- |
| `theme-provider.tsx` | `ThemeProvider`·`useTheme`. `<html>`에 `light`·`dark` 클래스, 선택은 localStorage |

### `chart/`

| 파일 | 내용 |
| --- | --- |
| `CandleChart.tsx` | 캔들 차트: 거래량·RSI·OBV 패널, MA·BB 오버레이, 툴팁, 모바일 제스처 |

### `discussion/`

| 파일 | 내용 |
| --- | --- |
| `CommentSection.tsx` | 글 하나의 댓글·답글, 실시간 INSERT·DELETE |
| `DiscussionFeed.tsx` | 전체 토론 피드(검색어, 커서 무한 스크롤) |
| `DiscussionSearchForm.tsx` | `/discussions?q=` 검색 폼 |
| `DiscussionSection.tsx` | 종목 토론방: 작성, 피드, 좋아요·싫어요, 댓글 토글, 실시간 |
| `FavoriteDiscussionFeed.tsx` | 즐겨찾기 종목 토론 피드 |
| `PostCard.tsx` | 토론글 한 줄 카드 |
| `PostLikeButtons.tsx` | 글 상세의 좋아요·싫어요·댓글 수, 실시간 카운트 |

### `layout/`

| 파일 | 내용 |
| --- | --- |
| `AppHeader.tsx` | 데스크톱 상단 헤더(검색) |
| `BottomBar.tsx` | 모바일 하단 바(검색, 메뉴). 키보드가 오르면 위로 이동 |
| `LeftNav.tsx` | 사이드바: 계정, 메뉴, 즐겨찾기, 테마. 모바일은 드로어 |
| `query-provider.tsx` | `QueryClientProvider`와 DevTools. `useQuery`를 쓰는 곳은 없다 |

### `search/`

| 파일 | 내용 |
| --- | --- |
| `SearchForm.tsx` | `/search?q=` 검색 폼 |

### `stock/`

| 파일 | 내용 |
| --- | --- |
| `CompanyInfoSection.tsx` | 기업정보 탭 |
| `DisclosureSection.tsx` | 공시 탭 |
| `FavoriteButton.tsx` | 종목 즐겨찾기 토글(이름 있는 export) |
| `FavoriteStockPrices.tsx` | 홈 즐겨찾기 시세 카드(DB 일봉, 30초 폴링) |
| `FlowSection.tsx` | 수급현황 탭 |
| `NewsSection.tsx` | 뉴스 탭 |
| `QuoteSection.tsx` | 시세 탭(최근 20영업일) |
| `RankingTable.tsx` | 랭킹 공용 표, 행 타입 `RankingTableRow` |
| `RankingTabs.tsx` | `?tab=` 링크 탭 |
| `StockChartSection.tsx` | 차트 영역: 현재가, 거래소·봉 탭, 지표 설정, 메모 모달 |
| `StockDetailTabs.tsx` | 종목 상세 하단 탭 컨테이너 |
| `StockSearch.tsx` | 헤더·하단바 검색 입력 |
| `TabStatus.tsx` | 탭의 로딩·에러·빈 상태, `toneClass`, `signed` |

### `ui/`

| 파일 | 내용 |
| --- | --- |
| `button.tsx` | shadcn `Button`·`buttonVariants`(`@base-ui/react`) |
