# `test/` 단위 테스트

위: [저장소 규칙](../CLAUDE.md). 위 문서의 규칙은 여기서 되풀이하지 않는다.

## 이 폴더

`src/lib/`의 순수 함수를 vitest로 검사한다(`npm test`, 설정은 루트 `vitest.config.ts`). 소스 경로를 따라 `test/lib/format.test.ts`처럼 둔다. 컴포넌트·훅·API 라우트·DB(Supabase)·수집 배치는 자동 테스트가 없다. 그쪽을 고치면 무엇을 어떻게 확인했는지 보고에 적는다. 전체 검사는 저장소 루트에서 `sh tool/check.sh`.

테스트하지 않는 `src/lib/` 파일: `market.ts`(`next/cache`의 `unstable_cache`와 네트워크), `naver.ts`의 `fetchNaverJson`(네트워크), `post-reactions.ts`(Supabase 클라이언트), `rankings.ts`(Supabase 조회), `query-client.ts`, `utils.ts`, `supabase/client.ts`·`supabase/server.ts`.

## 어디를 볼까

| 하려는 일 | 볼 곳 | 관련 |
| --- | --- | --- |
| 금액·퍼센트·상대 시각 표기를 고친다 | `lib/format.test.ts`의 `formatKRWCompact`, `formatRelativeTime` | 소스 `src/lib/format.ts` |
| 보조지표나 주봉·월봉 묶기를 고친다 | `lib/indicators.test.ts`의 `aggregateCandles`, `calcRSI` | 소스 `src/lib/indicators.ts` |
| 차트 공매도·신용잔고 점 집계를 고친다 | `lib/short-credit.test.ts`의 `alignShortSales`, `alignCreditBalances`, `candleGroupKey` | 소스 `src/lib/short-credit.ts` |
| Naver 응답 문자열 파싱을 고친다 | `lib/parsers.test.ts`의 `parseKrwAmount`, `parseInt0` | 소스 `src/lib/parsers.ts` |
| KST 날짜·주말 판정을 고친다 | `lib/time.test.ts`의 `kstToday`, `isKstWeekend` | 소스 `src/lib/time.ts` |
| 종목코드 검증을 고친다 | `lib/naver.test.ts`의 `isStockCode` | 소스 `src/lib/naver.ts` |
| Supabase 조인 결과 정규화를 고친다 | `lib/supabase/normalize.test.ts`의 `firstOrNull` | 소스 `src/lib/supabase/normalize.ts` |
| 스토리지 키 리터럴을 건드린다 | `lib/constants.test.ts`의 `STORAGE_KEYS` | 바꾸면 기존 사용자의 저장소 값이 사라진다. 저장소 규칙 참고 |
| 새 순수 함수에 테스트를 붙인다 | `lib/format.test.ts`(본보기) | 소스 경로를 따라 `test/` 아래에 `*.test.ts`로 만든다 |

## 지킬 것

- 순수 함수만 테스트한다. `next/cache`·`fetch`·Supabase에 묶인 것은 mock으로 억지로 끼우지 않고 건너뛴다(위 목록).
- 시간에 기대는 함수는 `vi.useFakeTimers()`와 `vi.setSystemTime()`으로 고정하고 `afterEach`에서 `vi.useRealTimers()`로 되돌린다. 실행 환경의 시간대에 기대는 출력(`toLocaleDateString`)은 `process.env.TZ`를 테스트 안에서 고정한다.
- 소스 동작을 바꾸면 테스트를 같이 고친다. 테스트를 고쳐 통과시키기 전에 바꾼 동작이 의도인지 확인한다.
- 버그로 보이는 동작을 지금 동작대로 굳히는 테스트를 쓰지 않는다. 소스를 고치거나 보고에 적는다.
- `src/lib/`의 새 순수 함수는 경계값(빈 배열, 0, null, 음수, KST 자정, 주 경계)을 넣는다.
- 테스트 파일은 `vitest`에서 `describe`·`it`·`expect`를 직접 import한다(전역 설정 없음). 소스는 `@/` 별칭으로 import한다.
- `test/**/*.test.ts`만 돈다(`vitest.config.ts`의 `include`). 도우미 파일을 두려면 `.test.ts`로 끝나지 않게 한다.

## 파일

파일을 더하거나 지우면 이 표를 고치고 저장소 루트에서 `python3 docs/check-index.py`로 확인한다.

### `lib/`

| 파일 | 내용 |
| --- | --- |
| `constants.test.ts` | `STORAGE_KEYS` 리터럴이 바뀌지 않았는지 고정 |
| `format.test.ts` | 상대 시각, 원화 축약, 퍼센트, 천단위 표기 |
| `indicators.test.ts` | 이동평균·볼린저밴드·RSI·OBV, 일봉의 주봉·월봉 집계(주·월·연 경계) |
| `naver.test.ts` | 종목코드 6자리 검증(`isStockCode`) |
| `parsers.test.ts` | Naver 응답 문자열의 정수·실수·소수·원화 단위 파싱 |
| `short-credit.test.ts` | 공매도·신용잔고 행 정규화(문자열 numeric), 일·주·월봉 점 맞추기(빈 날, null, 거래량 0), 주봉 묶음 키 |
| `time.test.ts` | KST 날짜·주말 판정(자정 경계), 체결일 문자열 정리 |

### `lib/supabase/`

| 파일 | 내용 |
| --- | --- |
| `normalize.test.ts` | 조인 결과 단일 객체·배열·null 정규화(`firstOrNull`) |
