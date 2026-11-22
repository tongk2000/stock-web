# 4. 클릭 뒤에서 일어나는 일

[목차](README.md) · [이전](03-file-map.md) · [다음: 실행과 운영](05-running.md)

## 종목 페이지를 여는 한 번의 여행

삼성전자 주소 `/stocks/005930`을 직접 연다고 생각해 봅시다.

1. Next.js가 `app/stocks/[code]/page.tsx`를 선택하고 `code`를 `005930`으로 받습니다.
2. 서버가 Supabase에서 `stocks`의 종목 정보와 `discussion_rooms`의 공식 토론방 ID를 조회합니다.
3. 종목명·별 버튼·차트·하단 탭을 조립합니다. 조회한 종목이 없으면 안내를 표시합니다.
4. 브라우저의 `StockChartSection`이 Supabase에서 일봉을 가져옵니다.
5. `useTodayCandle`이 우리 서버의 오늘 시세 API를 호출합니다. 서버가 네이버에서 받아 정리한 값을 돌려줍니다.
6. 차트 영역이 과거 자료와 오늘 자료를 조합하고 `CandleChart`에 넘깁니다.
7. 기본 선택된 토론방 탭이 글을 읽고 이후 변경 알림을 구독합니다.

종목명은 먼저 보이는데 차트는 조금 늦게 나타날 수 있습니다. 같은 페이지여도 조회 시점이 다르기 때문입니다. [페이지](../src/app/stocks/%5Bcode%5D/page.tsx) → [차트 영역](../src/components/stock/StockChartSection.tsx) → [오늘 시세 Hook](../src/hooks/useTodayCandle.ts)을 순서대로 읽어보세요.

## 주가에는 두 가지 공급 경로가 있다

```text
과거 기록:
GitHub Actions → Python → 외부 자료 → Supabase candles → 브라우저 차트

오늘 표시:
브라우저 → Next.js /api/stock/today/005930 → 네이버 → 브라우저 차트
```

오늘 시세 API는 조회 결과를 `candles`에 저장하지 않습니다. 오늘 가격이 보이더라도 DB 수집이 성공했다는 뜻은 아닙니다.

**캔들**은 일정 기간의 시가(open), 고가(high), 저가(low), 종가(close), 거래량(volume)을 묶은 데이터입니다. 수집 프로그램은 일봉을 저장하고, 화면은 일봉을 묶어 주봉·월봉을 계산합니다.

통합 모드의 현재 계산은 KRX 날짜를 기준으로 NXT가 같은 날짜에 있으면 고가의 최댓값·저가의 최솟값·거래량의 합을 사용합니다. 시가와 종가는 KRX 값을 유지합니다. NXT만 존재하는 날짜를 별도로 추가하지는 않습니다. NXT 단독 버튼은 준비 중입니다.

오늘 캔들이 도착하면 마지막 봉 날짜가 같을 때 교체하고, 다르면 뒤에 붙인 후 주봉·월봉으로 집계합니다. 이 오늘 자료는 거래소별로 나눈 요청이 아니므로, 거래소 통합의 정밀도를 개선할 때 이 연결도 검토해야 합니다.

`useTodayCandle`은 처음 한 번 조회하고, 평일 한국 시간 09:00~16:20 범위에서 30초 간격 재조회 조건을 둡니다. 장 종료 후 유효한 오늘 자료를 받으면 중단하는 로직도 있습니다. 공휴일 달력으로 완전히 통제하는 구조는 아닙니다. 한편 실제 일봉 workflow 예약은 **16:00**입니다. 코드의 16:20 기준과 예약 시각은 다르며, 서로 맞춰진 운영 보장으로 해석하면 안 됩니다.

## 별 버튼: 저장 위치가 로그인 여부에 따라 달라진다

```text
FavoriteButton 클릭 → FavoritesContext의 목록 변경 → 별·메뉴·홈 갱신
                              │
                    ┌─────────┴─────────┐
                    ↓                   ↓
               로그인 안 함          로그인 중
               localStorage          Supabase favorites
               현재 브라우저         사용자 계정별
```

`localStorage`는 브라우저에 남겨두는 작은 저장 공간입니다. 다른 브라우저·기기에 자동으로 공유되지 않습니다. 로그인하면 로컬 목록을 DB 목록과 병합하고, 병합 성공 시 로컬 값을 지웁니다. 로그아웃하면 다시 로컬 목록을 읽으므로 로그인 중의 계정 목록이 그대로 남는 구조는 아닙니다.

화면을 먼저 바꾸고 저장 요청을 뒤따라 보내는 방식을 **낙관적 업데이트**라고 부릅니다. 이 프로젝트의 즐겨찾기 추가·삭제는 저장 오류의 화면 복구 처리가 충분하지 않습니다. 별이 바뀌었다고 저장 성공을 확정할 수 없고 새로고침 후에도 남는지 확인해야 합니다. [저장 코드](../src/contexts/FavoritesContext.tsx)

## 로그인: Google, Supabase, 우리 앱이 나눠서 처리한다

```text
로그인 클릭
  → AuthContext가 원래 내부 경로를 sessionStorage에 보관
  → Supabase를 통한 Google 로그인
  → /auth/callback: 인증 코드를 로그인 세션으로 교환
      ├─ 닉네임 설정 미완료 → /auth/setup → 닉네임 저장 → 원래 경로
      └─ 설정 완료         → /auth/return → 원래 경로
```

**OAuth**는 Google 같은 서비스의 인증을 이용하는 방식입니다. **세션**은 로그인 상태를 이어가기 위한 정보입니다. 서버용 Supabase 연결은 요청의 쿠키를 사용하고, `AuthContext`는 화면에서 현재 사용자·닉네임을 공유합니다.

`sessionStorage`는 로그인 후 돌아갈 경로를 같은 탭에서 이어 쓰기 위한 브라우저 저장 공간입니다. DB에 넣는 정보가 아닙니다. 원래 경로가 없으면 홈으로 돌아갑니다. Google 설정과 Supabase의 허용 복귀 주소도 맞아야 전체 흐름이 작동합니다.

## 토론: 저장과 실시간 알림은 별개

```text
글 등록 → Supabase posts에 INSERT → DB가 저장
                                  → Realtime 변경 알림
                                  → 토론방 구독자가 목록에 반영
```

`INSERT`는 행 추가, `UPDATE`는 수정, `DELETE`는 삭제입니다. `DiscussionSection`은 해당 토론방 변경을 구독하며, 화면에서 나갈 때 구독을 해제합니다. 댓글은 `CommentSection`이 별도로 처리합니다.

좋아요는 `post_likes`, 싫어요는 `post_dislikes`, 댓글은 `comments`에 저장됩니다. DB의 **트리거**가 변경에 반응해 `posts`의 집계 숫자를 맞춥니다. 따라서 좋아요 숫자를 고치려면 버튼 코드만이 아니라 SQL도 봐야 합니다.

홈의 관심 종목 피드와 전체 토론 피드는 별도 구현입니다. 종목 토론방의 Realtime 구독이 있다고 모든 목록이 같은 방식으로 즉시 갱신된다고 가정하지 마세요. [종목 토론](../src/components/discussion/DiscussionSection.tsx), [전체 피드](../src/components/discussion/DiscussionFeed.tsx), [집계 트리거 수정](../supabase/migrations/20260417000003_fix_trigger_security.sql)

## 기업정보와 랭킹의 값은 어디서 올까?

기업정보 탭은 [기업정보 API](../src/app/api/stocks/%5Bcode%5D/company-info/route.ts)를 부릅니다. 서버는 종목 기본 정보, 최신 재무 자료, 최근 KRX 일봉, 네이버 보충 자료를 모읍니다. 일부 값이 없으면 다른 자료를 사용하고 끝내 없으면 화면에서 `-`로 표시합니다. `-`는 0이라는 뜻이 아닙니다.

랭킹은 [rankings.ts](../src/lib/rankings.ts)와 DB view를 사용합니다. **view**는 저장된 표를 조회·계산해 보여주는 이름 붙은 조회식입니다. 거래대금은 이 구현에서 종가 × 거래량이며, 토론 랭킹 점수는 최근 24시간 글 수 + 좋아요 수 × 0.5입니다. 오늘 외부 시세 API가 모든 랭킹을 갱신하는 구조가 아니므로 차트 현재가와 랭킹의 기준 시점이 다를 수 있습니다.

## 데이터베이스를 표로 생각하기

**테이블**은 표, **행(row)**은 기록 하나, **열(column)**은 그 기록의 항목입니다. `stock_code`, `user_id`, `post_id`는 관련 표의 기록을 연결하는 식별자입니다. **외래 키**는 이런 연결의 유효성을 DB가 확인하는 규칙입니다.

| 표 | 담는 것 | 연결되는 화면/기능 |
|---|---|---|
| `stocks` | 종목 코드·이름·시장·기업 기본 정보 | 검색, 종목 페이지 |
| `candles` | 종목·거래소·날짜별 가격과 거래량 | 차트, 주가 카드, 랭킹 |
| `financials` | 연도·분기별 재무 자료 | 기업정보, 기업가치 랭킹 |
| `short_balances` | 날짜별 공매도 잔고 | 수집 구조 있음. 수급 탭 완성과는 별개 |
| `profiles` | 로그인 사용자 닉네임·설정 등 | 계정, 작성자 표시 |
| `favorites` | 사용자별 관심 종목 | 별 버튼, 홈, 메뉴 |
| `discussion_rooms` | 종목과 연결된 토론방 | 종목 토론 |
| `posts` | 방에 올라온 글과 집계 숫자 | 토론 피드·상세 |
| `comments` | 글의 댓글·답글 | 댓글 영역 |
| `post_likes`, `post_dislikes` | 사용자의 글 반응 | 좋아요·싫어요 |
| `chart_memos` | 사용자·종목·날짜별 메모 | 차트 메모 |
| `price_predictions`, `user_blocks` | 예측·차단을 위한 저장 구조 | 테이블 존재만으로 완성된 UI를 뜻하지 않음 |

```text
stocks ─┬─ candles / financials / short_balances
        ├─ favorites ─ profiles
        ├─ chart_memos ─ profiles
        └─ discussion_rooms ─ posts ─ comments / post_likes / post_dislikes
                                └─ 작성자 profiles
```

## 데이터를 읽을 수 있다는 것과 권한이 있다는 것

**RLS**는 “이 사용자가 이 행을 읽거나 바꿔도 되는가?”를 DB에서 검사하는 규칙입니다. 브라우저가 Supabase로 직접 요청하므로 버튼을 숨기는 것만으로 권한을 막을 수 없습니다.

현재 SQL에서 즐겨찾기는 본인 기준 정책이 있지만, 차트 메모는 후속 [프로토타입 마이그레이션](../supabase/migrations/20260415000001_add_public_chart_notes.sql)에서 읽기·추가·수정·삭제 정책을 `true`로 열었습니다. 그 뒤의 unique 제약 추가가 이 정책을 복원하지는 않습니다. 화면은 본인 메모만 조회하지만 **소스의 정책 이력만 보면 DB 차원에서 본인만 접근하도록 제한된 상태라고 설명할 수 없습니다.** 실제 서비스 권한을 점검할 때는 운영 DB의 적용 상태를 별도로 확인해야 합니다.

## 저장과 캐시는 다르다

| 위치 | 무엇을 보관하나? | 의미 |
|---|---|---|
| React state | 선택한 탭, 읽어온 목록 | 화면 실행 중 기억 |
| localStorage | 비로그인 관심 종목, 테마, 지표 설정 | 해당 브라우저에 유지 |
| sessionStorage | 로그인 후 복귀 경로 | 같은 탭에서 이어 쓰는 정보 |
| Supabase DB | 글, 사용자 관심 종목, 일봉 등 | 서버에 저장된 기록 |
| 조회 캐시 | 재사용할 조회 결과 | 원본 저장과는 별개인 임시 복사본 |

TanStack Query의 `staleTime: 5분` 설정은 존재하지만 현재 `src`에서 `useQuery` 등의 실제 조회 사용은 확인되지 않았습니다. 이 값 때문에 모든 화면이 5분마다 갱신되는 것은 아닙니다. 실제 갱신 시점을 알려면 각 화면의 `useEffect`, 타이머, Realtime 구독을 봐야 합니다.
