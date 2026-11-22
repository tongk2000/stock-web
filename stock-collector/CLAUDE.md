# `stock-collector/` 수집 배치(Python)

위: [저장소 규칙](../CLAUDE.md). 위 문서의 규칙은 여기서 되풀이하지 않는다.

## 이 폴더

웹과 독립인 Python 배치다. GitHub Actions(`.github/workflows/collect_*.yml`)가 일정대로 돌리고, service_role 키로 운영 Supabase에 쓴다. 스키마는 [supabase 안내](../supabase/CLAUDE.md)가 맡는다. 일정 표는 [코드 지도](../docs/CODEMAP.md#githubworkflows)에도 있다.

| 스크립트 | 워크플로와 일정(KST) | 읽는 곳 | 쓰는 곳 |
| --- | --- | --- | --- |
| `collect_candles.py` | `collect_candles.yml`, 평일 16:00 | FinanceDataReader(KRX·NXT 일봉, 상장사 목록) | `stocks`(code·name·market), `candles`, 끝에 RPC `refresh_ranking_views` |
| `calculate_ratios.py` | 같은 워크플로의 다음 단계 | DB(`candles`, `financials`, `stocks`) | `financials`의 EPS·BPS·PER·PBR·ROE·부채비율·배당수익률·시총 |
| `collect_financials.py` | `collect_financials.yml`, 월 10:00 | DART OpenAPI(`corpCode.xml`, `fnlttSinglAcnt.json`, 연결재무제표 최근 4분기) | `financials`(매출·이익·`equity`·`total_assets`) |
| `collect_company_info.py` | `collect_company_info.yml`, 월 09:00 | pykrx(주식수·시총·DPS·외국인지분율 — 2026-11 기준 KRX 로그인 요구로 전부 빈 결과), FinanceDataReader(업종·상장일), DART(자본금) | `stocks`, `financials.dividend` |
| `collect_wisereport.py` | `collect_wisereport.yml`, 월 12:00 | WiseReport 기업모니터(`navercomp.wisereport.co.kr`의 `c1010001`·`c1020001`) | `stocks`(액면가·유동주식수·개요·상장일·발행주식수), `financials.ev_ebitda`·`dividend`(현금 DPS) |
| `collect_short_balances.py` | `collect_short_balances.yml`, 평일 18:10(daily)·20:00(retry) | pykrx 공매도 잔고(KRX 공시 T+2 영업일 18:00 이후) | `short_balances` |

환경 변수는 이름만: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`(모든 스크립트), `DART_API_KEY`(`collect_financials.py`는 필수, `collect_company_info.py`는 없으면 자본금만 건너뜀). `_utils.get_supabase`가 `.env`도 읽는다. 워크플로 Python은 3.10, 의존성은 `requirements.txt`(고정 버전 전체 목록).

## 어디를 볼까

| 하려는 일 | 볼 곳 | 관련 |
| --- | --- | --- |
| 일봉 수집 범위·병렬도·배치 | `collect_candles.py`의 `run`, `get_from_date`, `fetch_candles`, `flush_candles`, `FETCH_WORKERS`, `UPSERT_BATCH` | 첫 실행은 1년 전부터, 이후는 마지막 저장일 다음 날부터 |
| stocks 열을 더 채운다(업종·상장일·자본금 등) | `collect_company_info.py`의 `run_stocks_update`, `collect_pykrx`, `collect_listing_info`, `collect_dart_capital` | 열은 먼저 `supabase/migrations`에 있어야 한다 |
| WiseReport 항목을 더하거나 파싱이 깨졌다 | `collect_wisereport.py`의 `parse_main`, `parse_overview`, `_STOCK_FIELDS`, `fetch_one` | 페이지 마크업이 바뀌면 `_row_value`가 먼저 깨진다 |
| upsert가 NOT NULL·FK로 실패한다 | `_utils.py`의 `fetch_stock_keys`, `fetch_stock_codes` | 커밋 `0ff0d0a`, `38deac5`, `ee1ac93` |
| 배치 크기, 1000행 제한 | `_utils.py`의 `chunked_upsert`(chunk 500), `fetch_all`(page 1000) | `chunked_upsert`는 키 조합이 같은 행끼리 묶어 보낸다 |
| 재무 분기 선택, DART 계정·보고서 코드 | `collect_financials.py`의 `get_target_quarters`, `parse_financials`, `extract_amount`, `REPRT_CODE_MAP` | |
| 재무 비율 계산, numeric overflow | `calculate_ratios.py`의 `calculate`, `main`, `_utils.py`의 `fit_numeric` | 커밋 `7416fca`. 열 정밀도는 `supabase/migrations/20260413000002_add_financials.sql` |
| 공매도 daily·retry·backfill | `collect_short_balances.py`의 `run_daily`, `run_retry`, `run_backfill`, `missing_business_days`, `target_date_for_daily` | 모드는 `--mode`, 수동 실행은 워크플로 입력 `mode` |
| 영업일 계산 | `_utils.py`의 `get_last_business_day`, `prev_business_day`, `recent_business_days` | 주말만 거른다. 공휴일은 모른다 |
| 랭킹 뷰 갱신 | `collect_candles.py`의 `main` | 함수는 `supabase/migrations/20261122000002_volume_surge_view.sql`. 약 36초 걸려 service_role 타임아웃을 5분으로 올렸다(`20261122000004`). 실패해도 경고만 남기고 다음 단계(비율 계산)는 돈다 |
| 요청 실패·재시도·간격 | `collect_financials.py`의 `get_financial_data`·`main`, `collect_company_info.py`의 `_get_capital`·`collect_dart_capital`, `collect_wisereport.py`의 `fetch_one` | 아래 '지킬 것' |
| 로컬에서 돌린다 | `requirements.txt`, `_utils.py`의 `get_supabase` | 환경 변수를 `.env`에 두고 `pip install -r stock-collector/requirements.txt` 뒤 `python stock-collector/<스크립트>`. 운영 DB에 쓴다 |
| 일정·워크플로를 바꾼다 | 위 '이 폴더' 표 | `.github/workflows/collect_*.yml`의 `cron`(UTC), `env:` |

## 지킬 것

- **로컬에서 돌리지 않는다.** 요청받지 않았으면 실행하지 않는다. `.env`의 서비스 롤 키는 운영 DB에 쓴다.
- **stocks 갱신 행에는 `name`·`market`을 실어 보낸다.** PostgREST upsert(`INSERT ... ON CONFLICT`)는 기존 행이어도 NOT NULL부터 검사해, 갱신 행에 두 값이 없으면 실패했다. `fetch_stock_keys`의 값을 `**`로 펼쳐 쓴다(`0ff0d0a`는 `name`, `38deac5`는 `market`).
- **stocks에 없는 코드는 걸러서 쓴다.** `financials`는 `stocks(code)`를 참조해, 없는 코드가 한 행만 있어도 전체 upsert가 FK 위반으로 멈췄다(`ee1ac93`). `fetch_stock_codes`로 거른다. 그 전에 새 종목은 `collect_candles.py`가 `stocks`에 먼저 넣는다.
- **PostgREST 한 번에 최대 1000행.** 전체 조회는 `fetch_all`로 나눠 읽는다. 그냥 `select`는 1000행에서 조용히 잘린다.
- **일괄 upsert는 키 조합이 다른 행을 섞지 않는다.** 한 요청의 키 합집합이 열이 되어 빠진 키는 NULL로 덮이므로 `chunked_upsert`가 같은 키끼리 묶는다. 일부 열만 갱신하는 행을 직접 `upsert`로 섞어 보내지 않는다.
- **numeric 열은 `fit_numeric`으로 거른다.** 매출·자본이 아주 작은 종목은 비율이 수만 %로 튀어 `numeric field overflow`로 upsert 전체가 실패했다(`7416fca`). 정수부 자릿수는 열 정의(`numeric(6,2)`는 4, `numeric(8,2)`는 6)에 맞춘다.
- **외부 요청에는 타임아웃을 둔다.** 없으면 응답 없는 요청 하나에 잡혀 Actions 6시간 제한으로 취소됐다(`ee1ac93`). DART 10초(목록 30초), WiseReport 10초.
- **요청 예절은 코드대로.** DART 재무는 요청마다 0.2초, DART 자본금은 0.1초 쉰다. 일봉은 12개, WiseReport는 8개 스레드로 병렬이고 WiseReport는 `User-Agent: Mozilla/5.0`만 보내며 지연이 없다. 더 공격적으로 올리기 전에 차단 위험을 생각한다. 병렬화는 fetch만, DB 쓰기는 메인 스레드에서 배치로 한다(`d4f5fd0`).
- **자체 재시도는 공매도에만 있다.** `retry` 모드가 최근 5영업일 중 행이 0건인 날을 다시 받는다. 다른 스크립트는 실패한 종목을 건너뛰고(빈 결과) 다음 실행을 기다린다.
- **Python 3.10 문법만.** 워크플로가 3.10이다. `X | None`은 되지만 `tomllib`·`ExceptionGroup`·`typing.Self` 같은 3.11+ 기능은 쓰지 않는다.
- **날짜는 러너의 UTC 시계다.** `datetime.now()`를 그대로 쓴다. 평일 16:00·18:10 KST는 UTC도 같은 날이라 맞지만, 월요일 09:00 KST(UTC 00:00) 실행은 "오늘"이 월요일이라 기준일이 아직 장이 열리지 않은 날이다. `collect_company_info.py`의 pykrx가 그날 데이터를 주는지 확인 못 함.
- **재무 수치의 의미.** `collect_financials.py`는 분기마다 보고서(Q4는 사업보고서)의 `thstrm_amount`를 그대로 저장한다. Q4는 연간 값이고 Q1~Q3는 분기 값일 수 있어, 최신 분기 행으로 계산하는 PER·ROE가 분기마다 다른 뜻이 될 수 있다(DART 응답 확인 못 함).
- **비밀값은 이름만 쓴다.** 키를 코드·로그·문서에 적지 않는다.

## 파일

파일을 더하거나 지우면 이 표를 고치고 저장소 루트에서 `python3 docs/check-index.py`로 확인한다.

| 파일 | 내용 |
| --- | --- |
| `_utils.py` | 공용: `get_supabase`, 영업일 계산, `fetch_all`(페이지 조회), `fetch_stock_codes`·`fetch_stock_keys`, `fit_numeric`, `chunked_upsert` |
| `calculate_ratios.py` | 일봉 수집 직후 종가·상장주식수·재무로 EPS·BPS·PER·PBR·ROE·부채비율·배당수익률·시총 계산 후 `financials` 최신 분기 행에 upsert |
| `collect_candles.py` | KOSPI·KOSDAQ 일봉 증분 수집(KRX·NXT), `stocks` upsert, 끝에 랭킹 뷰 갱신 |
| `collect_company_info.py` | pykrx·FinanceDataReader·DART로 `stocks` 업종·상장일·주식수·외국인지분율·자본금과 `financials.dividend` 갱신 |
| `collect_financials.py` | DART 연결재무제표 최근 4분기 매출·영업이익·순이익·자본·자산 수집 |
| `collect_short_balances.py` | pykrx 공매도 잔고를 daily·retry·backfill 모드로 수집 |
| `collect_wisereport.py` | WiseReport에서 액면가·유동주식수·기업개요·상장일·EV/EBITDA·현금DPS 보강 |
| `requirements.txt` | pip 의존성(고정 버전). 워크플로가 캐시 키로도 쓴다 |
