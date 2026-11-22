# 2. 이 프로젝트 코드를 읽는 최소 지식

[목차](README.md) · [이전](01-big-picture.md) · [다음: 파일 지도](03-file-map.md)

## 컴포넌트: 이름 붙인 화면 조각

React에서는 버튼·검색창·차트 같은 화면 조각을 **컴포넌트**라고 부릅니다. 조각을 함수로 만들고 다른 화면에서 가져다 씁니다.

[홈 소스](../src/app/page.tsx)의 핵심만 줄이면 다음과 같습니다. 설명용 축약이며 파일 전체를 이 코드로 바꾸는 실습은 아닙니다.

```tsx
export default function Home() {
  return (
    <main>
      <h1>내 관심 종목</h1>
      <FavoriteStockPrices />
      <FavoriteDiscussionFeed />
    </main>
  );
}
```

| 표현 | 읽는 방법 |
|---|---|
| `function Home()` | Home이라는 화면 만드는 함수 |
| `return (...)` | 이 함수가 보여줄 화면 |
| `<main>`, `<h1>` | HTML의 본문 영역과 제목 |
| `<FavoriteStockPrices />` | 다른 파일에 정의한 관심 종목 가격 컴포넌트 사용 |
| `export default` | 다른 파일이나 Next.js가 이 함수를 가져다 쓸 수 있게 함 |

이렇게 JavaScript/TypeScript 안에 화면 태그를 쓰는 문법이 **JSX**입니다. TypeScript와 JSX를 함께 쓰는 파일이 `.tsx`입니다. `.ts`는 보통 화면 태그가 없는 로직·타입 파일입니다.

`import ... from ...`은 필요한 부품을 가져온다는 뜻입니다. 이 저장소의 `@/`는 `src/`를 줄여 쓴 별칭입니다. `@/components/stock/FavoriteButton`은 `src/components/stock/FavoriteButton.tsx`를 가리킵니다. 별칭은 [tsconfig.json](../tsconfig.json)에 있습니다.

## props: 화면 조각에 건네주는 재료

[종목 페이지](../src/app/stocks/%5Bcode%5D/page.tsx)는 버튼에 종목 정보를 넘깁니다.

```tsx
<FavoriteButton code={stock.code} name={stock.name} />
```

`code`와 `name`이 **props**입니다. “이 버튼은 어느 종목을 즐겨찾기할 버튼인가?”를 알려주는 입력값입니다. `{stock.name}`은 글자 그대로 출력하라는 뜻이 아니라 변수에 든 값을 꺼내라는 뜻입니다.

```tsx
interface Props {
  code: string;
  name: string;
}
```

[버튼 소스](../src/components/stock/FavoriteButton.tsx)의 이 부분은 “code와 name은 문자열이어야 한다”는 약속입니다. `005930`은 앞의 0이 중요하므로 숫자보다 문자열로 다루는 것이 맞습니다. TypeScript의 타입은 개발 중 실수를 찾는 장치이며, DB 권한 검사나 외부 응답 검증을 대신하지 않습니다.

## state: 화면이 기억하는 현재 값

[종목 탭 소스](../src/components/stock/StockDetailTabs.tsx)에는 다음 코드가 있습니다.

```tsx
const [active, setActive] = useState<TabId>('discussion');
```

`active`는 지금 선택한 탭, `setActive`는 선택을 바꾸는 함수입니다. 초기값은 토론방을 뜻하는 `'discussion'`입니다. `<TabId>`는 허용되는 탭 이름의 타입입니다.

```text
기업정보 버튼 클릭
  → setActive('info')
  → React가 새 상태에 맞춰 화면을 다시 계산
  → CompanyInfoSection이 표시됨
```

이 다시 계산하는 과정을 **렌더링**이라고 부릅니다. 화면 전체를 매번 다운로드한다는 뜻은 아닙니다. 선택한 탭 같은 state는 자동으로 DB에 저장되지 않습니다. 새로 페이지를 열면 기본 상태로 시작할 수 있습니다. 일반 개념은 [React의 state 설명](https://react.dev/learn/state-a-components-memory)을 참고하세요.

## 실제 즐겨찾기 버튼 읽기

```tsx
const { isFavorite, addFavorite, removeFavorite } = useFavorites();
const favorited = isFavorite(code);
```

첫 줄은 공용 즐겨찾기 관리 기능에서 세 함수를 꺼냅니다. 둘째 줄은 해당 종목이 이미 등록되었는지 확인합니다.

```tsx
onClick={() =>
  favorited ? removeFavorite(code) : addFavorite({ code, name })
}
```

`onClick`은 클릭할 때 실행할 동작입니다. `() => ...`는 나중에 실행할 짧은 함수입니다. `조건 ? A : B`는 “조건이 참이면 A, 아니면 B”입니다. 이미 별을 눌렀으면 제거하고, 아니면 추가합니다.

```tsx
{favorited ? '즐겨찾기 해제' : '즐겨찾기'}
```

같은 상태를 보고 버튼 글자도 바꿉니다. 저장 위치를 정하는 코드는 버튼 안이 아니라 [FavoritesContext](../src/contexts/FavoritesContext.tsx)에 있습니다. 화면 부품과 저장 처리가 나뉘어 있는 예입니다.

## Hook, Context, Provider는 무슨 뜻일까?

| 표현 | 역할 | 실제 예 |
|---|---|---|
| Hook | 컴포넌트에서 상태나 외부 연결 등을 다루는 함수 | `useState`, `useEffect`, `useFavorites` |
| `useEffect` | 화면이 나타나거나 관련 값이 바뀔 때 외부 시스템과 연결·동기화 | 종목 코드가 바뀌면 주가 조회, 토론 변경 알림 구독 |
| cleanup | 연결이 더 이상 필요 없을 때 정리 | 타이머 중지, 구독 해제 |
| Context | 여러 화면 조각이 공통 값을 받을 수 있는 통로 | 로그인 사용자, 즐겨찾기 목록 |
| Provider | 그 통로에 실제 값을 제공하는 상위 컴포넌트 | `AuthProvider`, `FavoritesProvider` |
| `useMemo` | 입력이 같으면 이전 계산 결과를 재사용 | 일봉을 주봉으로 합산한 결과 |
| `useRef` | 값이나 화면 요소를 보관하되 변경만으로 화면을 다시 그리지는 않는 상자 | 차트 객체, 타이머 번호 |

Hook은 보통 `use`로 시작합니다. 아무 `if`문 안에서 임의로 호출하는 대신 컴포넌트나 다른 Hook의 최상위에서 호출하는 규칙이 있습니다. 처음에는 기존 호출 위치를 유지하며 읽으세요. [React Hook 공식 안내](https://react.dev/reference/react/hooks)

## Next.js: 폴더가 페이지 주소가 된다

```text
src/app/page.tsx                 → /
src/app/search/page.tsx          → /search
src/app/stocks/[code]/page.tsx   → /stocks/005930 등
```

`[code]`는 실제 폴더 이름입니다. 주소에서 바뀌는 부분을 받아 담는 자리입니다. 삼성전자 전용 파일을 매번 만들지 않고 같은 페이지에 다른 종목 코드를 넘깁니다. 이런 주소 연결을 **라우팅**, 해당 경로를 **라우트**라고 부릅니다. [Next.js 페이지·레이아웃 안내](https://nextjs.org/docs/app/getting-started/layouts-and-pages)

| 특별한 파일 | 이 프로젝트에서 읽는 법 |
|---|---|
| `page.tsx` | 그 주소의 본문 |
| `layout.tsx` | 여러 페이지를 감싸는 공통 틀. `children` 자리에 현재 페이지가 들어감 |
| `loading.tsx` | 해당 구간을 기다리는 동안 보여줄 화면 |
| `route.ts` | 화면 대신 데이터나 리다이렉트 등을 응답하는 서버 처리기 |

## 서버 컴포넌트와 클라이언트 컴포넌트

이 프로젝트의 App Router에서는 페이지·레이아웃이 기본적으로 서버 컴포넌트입니다. 종목 페이지는 서버에서 DB를 조회한 뒤 종목명과 코드를 하위 컴포넌트에 넘깁니다.

클릭·브라우저 저장소·state 같은 기능이 필요한 파일에는 `'use client'`를 붙입니다. 예를 들어 즐겨찾기 버튼과 차트 영역입니다. 이것은 브라우저에서 실행할 코드의 경계를 선언합니다. **클라이언트 컴포넌트도 첫 화면의 HTML을 서버에서 미리 만들 수 있습니다.** “서버에서는 절대 실행되지 않는다”로 외우지 마세요. 서버가 준비한 화면에 브라우저가 동작을 연결하는 과정은 **하이드레이션**이라고 부릅니다. [Next.js 서버·클라이언트 안내](https://nextjs.org/docs/app/getting-started/server-and-client-components)

```tsx
const { code } = await params;
```

현재 종목 페이지의 실제 코드입니다. 주소 정보 `params`가 Promise로 주어지므로 `await`로 기다립니다. `async`는 이런 기다리는 작업을 하는 함수에 붙습니다. `Promise.all([...])`은 독립적인 여러 조회를 함께 시작해 결과를 모읍니다.

## DB 조회 한 문장 읽기

```tsx
supabase.from('stocks').select('code, name, market').eq('code', code).single()
```

“stocks 표에서 → 코드·이름·시장 열을 → 코드가 현재 종목 코드와 같은 행만 → 한 행 가져와라.”라는 뜻입니다. `insert`는 추가, `update`는 수정, `delete`는 삭제, `upsert`는 없으면 추가하고 있으면 갱신하는 동작입니다. 실제 중복 판단 기준과 옵션에 따라 동작이 달라집니다.

`{ data, error }`가 반환되면 `data`는 결과, `error`는 실패 정보입니다. 결과가 없다고 언제나 “등록된 자료가 없음”인 것은 아닙니다. 권한이나 연결 실패도 확인해야 합니다.

**이해 확인:** 탭 글자를 바꾸려면 state를 저장하는 DB를 찾을까요? 아닙니다. 탭 컴포넌트의 `TABS` 목록부터 찾습니다.
