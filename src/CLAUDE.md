# `src/` 앱 코드의 입구

위: [저장소 규칙](../CLAUDE.md). 위 문서의 규칙은 여기서 되풀이하지 않는다.

## 이 폴더

`src` 바로 아래에는 파일이 없고 하위 폴더 여섯 개뿐이다. `app/`·`components/`·`lib/`는 자기 안내가 있으니 거기로 간다. `contexts/`·`hooks/`·`types/`는 이 문서가 맡는다.

| 폴더 | 역할 | 안내 |
| --- | --- | --- |
| `app/` | 라우트(페이지), Route Handler(`api/**`, `auth/callback`), 루트 레이아웃, sitemap·robots | [app](app/CLAUDE.md) |
| `components/` | 화면 부품. `layout/`(앱 쉘), `stock/`·`chart/`·`discussion/`·`search/`, `ui/`(shadcn), `theme-provider.tsx` | [components](components/CLAUDE.md) |
| `lib/` | 외부 API 어댑터(`supabase/`, `naver.ts`), 순수 유틸, 상수(`constants.ts`), 랭킹 쿼리 | [lib](lib/CLAUDE.md) |
| `contexts/` | 전역 상태 Provider와 `useXxx` 훅(Auth·Favorites·Sidebar) | 이 문서 |
| `hooks/` | 재사용 클라이언트 훅 다섯 개 | 이 문서 |
| `types/` | DB 테이블·뷰의 행 타입 | 이 문서 |

서버와 클라이언트는 이렇게 나눈다.

- 서버 컴포넌트가 기본이다. `app/**/page.tsx`가 데이터를 읽고(`lib/supabase/server.ts`, `cookies()` 기반 세션) 메타데이터를 만든 뒤, 상호작용이 필요한 하위 트리만 클라이언트 컴포넌트에 넘긴다.
- 클라이언트 컴포넌트(`'use client'`)는 실시간 UI, 폼, 차트, 전역 Context, 훅이다. 브라우저에서는 `lib/supabase/client.ts`의 싱글톤을 쓴다.
- TanStack Query의 `QueryProvider`는 루트 레이아웃에 달려 있지만 `useQuery`를 쓰는 곳은 이 저장소에서 찾지 못했다(`grep` 결과 0건).

## 어디를 볼까

| 하려는 일 | 볼 곳 | 관련 |
| --- | --- | --- |
| 로그인 상태·닉네임을 읽는다 | `contexts/AuthContext.tsx`의 `useAuth` | 닉네임은 profiles 테이블에서 읽는다 |
| 로그인·로그아웃을 건다, 복귀 경로를 정한다 | `contexts/AuthContext.tsx`의 `AuthProvider`(안의 `signInWithGoogle`, `signOut`) | 복귀 처리는 [app 안내](app/CLAUDE.md)의 인증 흐름 |
| 즐겨찾기 목록·추가·삭제 | `contexts/FavoritesContext.tsx`의 `useFavorites`, `FavoritesProvider` | favorites 테이블, localStorage |
| 로그인 때 로컬 즐겨찾기를 서버로 합친다 | `contexts/FavoritesContext.tsx`의 `FavoritesProvider`, `loadLocal`, `clearLocal` | '지킬 것' |
| 모바일 사이드바 열고 닫기 | `contexts/SidebarContext.tsx`의 `useSidebar`, `SidebarProvider` | 쓰는 곳 `AppHeader`, `LeftNav` |
| 테마(light/dark/system) 바꾸기 | `components/theme-provider.tsx`의 `useTheme`, `ThemeProvider` | `contexts/`가 아니라 `components/`에 있다. 플래시 방지는 app 안내 |
| 다크 여부(차트 색) | `hooks/useIsDark.ts`의 `useIsDark` | 쓰는 곳 `StockChartSection` |
| 무한 스크롤을 붙인다 | `hooks/useInfiniteScroll.ts`의 `useInfiniteScroll` | 쓰는 곳 `DiscussionFeed`, `FavoriteDiscussionFeed`, `DiscussionSection` |
| 스크롤 방향으로 헤더·하단바 숨김 | `hooks/useScrollAtTop.ts`의 `useScrollAtTop` | 쓰는 곳 `AppHeader`, `BottomBar`, `LeftNav` |
| 종목 상세 탭이 API 데이터를 불러온다 | `hooks/useStockTabData.ts`의 `useStockTabData` | `/api/stocks/[code]/{quote,flow,news,disclosures}`, [app 안내](app/CLAUDE.md) |
| 오늘 캔들을 폴링한다, 장중 여부 | `hooks/useTodayCandle.ts`의 `useTodayCandle`, `isMarketOpen` | `/api/stock/today/[code]`, 주기 `LIVE_CANDLE_POLL_MS`(`lib/constants.ts`) |
| 종목·캔들 타입 | `types/stock.ts`의 `Stock`, `Candle`, `CandleType`, `ShortSale`, `CreditBalance` | stocks, candles, short_sales, credit_balances 테이블 |
| 랭킹 행·탭 타입 | `types/ranking.ts`의 `RankingRow`, `DailyChangeRow`, `LatestFinancialsRow`, `ExtremesRow`, `ValuationTab`, `MoversTab`, `VolumeTab` | 뷰 v_daily_change, v_latest_financials, v_52w_extremes |
| 토론 타입 | `types/discussion.ts`의 `Post`, `DiscussionRoom` | posts, discussion_rooms 테이블. 지금 import하는 곳 없음 |
| 스토리지 키·상수를 바꾼다 | `lib/constants.ts`의 `STORAGE_KEYS` | [lib 안내](lib/CLAUDE.md) |

## 지킬 것

- 페이지는 서버 컴포넌트로 둔다. `'use client'`는 정말 필요한 가장 작은 컴포넌트에만 붙인다. 지금 `app/` 아래에서 `'use client'`인 페이지는 `auth/return`과 `auth/setup`뿐이다.
- 새 전역 상태는 Context를 하나 더 만들기 전에 기존 Context(`Auth`·`Favorites`·`Sidebar`)나 `ThemeProvider`에 들어갈 수 있는지 먼저 본다. Provider가 늘면 `app/layout.tsx`의 중첩 순서도 늘어난다.
- `useAuth`와 `useFavorites`는 Provider 밖에서 부르면 던진다. `useSidebar`는 기본값이 있어 던지지 않고 조용히 아무 일도 안 한다. 새 훅은 앞의 쪽을 따른다.
- 즐겨찾기는 이중 저장소다. 비로그인은 localStorage(`STORAGE_KEYS.FAVORITES`), 로그인 중에는 모든 추가·삭제를 favorites 테이블에 쓴다. 로그인으로 바뀌는 순간 localStorage의 목록을 `upsert`(`user_id,stock_code`, `ignoreDuplicates`)로 서버에 합치고 비운다.
- 로컬 목록은 서버 `upsert`가 성공(`error` 없음)했을 때만 비운다. 실패하면 남겨 두고 다음 로그인 때 다시 시도한다. 이 순서를 바꾸면 비로그인 때 쌓은 즐겨찾기가 사라진다.
- `STORAGE_KEYS`의 값(`vite-ui-theme`, `stock-favorites`, `stock-indicators`, `post-auth-next`)은 이미 배포된 사용자의 브라우저에 박혀 있다. 리터럴을 바꾸지 않는다. 상수 이름만 정리한다.
- 훅은 브라우저 전용이라 `'use client'`를 붙인다.
- `useInfiniteScroll`은 "센티넬이 보이면 콜백"만 한다. 콜백이 중복 실행을 스스로 막아야 한다.
- `useTodayCandle`은 응답 `date`가 `kstToday()`가 아니면 버리고, 네트워크 오류는 삼키고 직전 값을 유지한다. 폴링은 평일 09:00~16:20(KST)만 하고 15:30 이후 첫 성공 응답에서 멈춘다.
- 클라이언트에 `SUPABASE_SERVICE_ROLE_KEY`를 쓰지 않는다. 실시간 구독은 `useEffect` cleanup에서 `supabase.removeChannel(...)`로 푼다.
- `addFavorite`·`removeFavorite`는 `setFavorites` 업데이터 안에서 Supabase 쓰기와 `saveLocal`을 부르고 쓰기 오류는 버린다(업데이터는 순수해야 한다). 고칠 때 이 점을 먼저 본다.

## 파일

파일을 더하거나 지우면 이 표를 고치고 저장소 루트에서 `python3 docs/check-index.py`로 확인한다.

### `contexts/`

| 파일 | 내용 |
| --- | --- |
| `AuthContext.tsx` | Supabase 세션 전역 상태(`AuthProvider`, `useAuth`). `user`·`nickname`(profiles에서 읽음)·`loading`, Google OAuth 로그인(`signInWithGoogle`)과 `signOut`. 복귀 경로는 `STORAGE_KEYS.POST_AUTH_NEXT`(sessionStorage)에 저장 |
| `FavoritesContext.tsx` | 즐겨찾기 전역 상태(`FavoritesProvider`, `useFavorites`, `FavoriteStock`). 로그인은 favorites 테이블, 비로그인은 localStorage. 로그인 때 로컬 목록을 서버로 합침 |
| `SidebarContext.tsx` | 모바일 사이드바 열림 상태(`SidebarProvider`, `useSidebar`: `isOpen`·`open`·`close`·`toggle`). Provider 밖에서도 기본값으로 동작 |

### `hooks/`

| 파일 | 내용 |
| --- | --- |
| `useInfiniteScroll.ts` | 센티넬이 `rootMargin`(기본 200px) 안에 들어오면 콜백을 부름(`IntersectionObserver`). `enabled`로 끈다 |
| `useIsDark.ts` | `<html>`의 `dark` 클래스를 `MutationObserver`로 따라가는 다크 여부(차트 테마 색용) |
| `useScrollAtTop.ts` | 스크롤 방향으로 헤더·하단바 표시 여부(`useScrollAtTop`). 최상단·위로는 표시, 아래로는 숨김(임계 5px) |
| `useStockTabData.ts` | 종목 상세 탭이 `/api/stocks/[code]/*` 응답의 `data` 배열을 불러오는 훅(`data`·`loading`·`error`). `url`이 바뀌면 이전 요청을 abort |
| `useTodayCandle.ts` | 오늘 캔들 폴링(`useTodayCandle`, `/api/stock/today/[code]`, `LIVE_CANDLE_POLL_MS`)과 정규장 여부(`isMarketOpen`, KST 09:00~15:30 평일) |

### `types/`

| 파일 | 내용 |
| --- | --- |
| `discussion.ts` | `Post`(posts 테이블), `DiscussionRoom`(discussion_rooms 테이블). 현재 import하는 곳 없음. `Post`에 `dislike_count`·`comment_count`는 없다 |
| `ranking.ts` | 랭킹 행(`RankingRow`), 뷰 행(`DailyChangeRow`=v_daily_change, `LatestFinancialsRow`=v_latest_financials, `ExtremesRow`=v_52w_extremes), 탭 값(`ValuationTab`·`MoversTab`·`VolumeTab`) |
| `stock.ts` | `Stock`(stocks 테이블), `Candle`(candles 테이블의 OHLCV), `CandleType`(`daily`·`weekly`·`monthly`), `ShortSale`(short_sales), `CreditBalance`(credit_balances). `Stock.current_price`·`change_rate`는 "미구현" 주석 |
