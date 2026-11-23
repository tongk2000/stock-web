# 코드 지도

소스 폴더의 목록이다. 폴더마다 한 줄 설명과 그 폴더의 `CLAUDE.md`(폴더 안내)로 가는 링크가 있다. 파일 하나당 한 줄 설명(파일 표), 그 폴더에서 자주 하는 일을 어디서 찾는지, 그 폴더의 규칙은 폴더 안내에 있다. 기능에서 찾을 때는 [색인](INDEX.md)이 빠르다.

- 이 문서를 통째로 읽을 일은 없다. 폴더 이름을 알면 그 폴더의 `CLAUDE.md`를 바로 읽는다(Claude Code는 그 폴더의 파일을 읽을 때 자동으로 불러온다).
- 파일을 더하거나 지우면 그 폴더 `CLAUDE.md`의 `## 파일` 표를 고친다. 파일 안의 기호와 줄 범위는 `python3 docs/outline.py <파일>`. 폴더를 새로 만들면 `CLAUDE.md`를 같이 만들고 여기에 한 줄 올린다. `python3 docs/check-index.py`가 둘 다 확인한다.
- 검사 도구, CI 워크플로, 에이전트 스킬은 폴더 안내가 따로 없어 파일 표가 이 문서에 있다.
- 저장소 루트의 설정 파일(`package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `components.json`, `vitest.config.ts`, `.env.example`)과 `public/`은 색인 검사의 범위 밖이다.

## 웹 (Next.js)

### `src/`

앱 코드의 입구. `app/`·`components/`·`lib/`는 각자 안내로 보내고, 전역 상태(`contexts/`: Auth·Favorites·Sidebar), 클라이언트 훅(`hooks/`), DB 행 타입(`types/`)을 맡는다. 규칙·찾는 길·파일 표는 [그 폴더의 안내](../src/CLAUDE.md)에 있다.

### `src/app/`

App Router 라우트와 API. 홈·검색·종목 상세·토론·랭킹 페이지, `api/stock(s)/**`(네이버 프록시와 기업정보), 인증 콜백 흐름, 루트 `layout.tsx`(Provider 순서·테마 스크립트), `sitemap.ts`·`robots.ts`. 규칙·찾는 길·파일 표는 [그 폴더의 안내](../src/app/CLAUDE.md)에 있다.

### `src/components/`

화면 부품. `stock/`(종목 상세 탭, 차트 영역, 랭킹 표), `discussion/`(토론방·피드·댓글·좋아요, Supabase Realtime), `chart/`(`lightweight-charts` 래퍼), `layout/`(앱 쉘), `search/`, `ui/`(shadcn). 규칙·찾는 길·파일 표는 [그 폴더의 안내](../src/components/CLAUDE.md)에 있다.

### `src/lib/`

화면 없는 코드. Supabase 클라이언트(서버·브라우저), 순수 유틸(format·indicators·parsers·time), 전역 상수(`constants.ts`), 서버 전용 조회(`rankings.ts`, `market.ts`), 네이버 호출(`naver.ts`). 규칙·찾는 길·파일 표는 [그 폴더의 안내](../src/lib/CLAUDE.md)에 있다.

### `test/`

순수 함수(`src/lib`)의 단위 테스트(vitest). 컴포넌트·API·DB 테스트는 없다. 규칙·찾는 길·파일 표는 [그 폴더의 안내](../test/CLAUDE.md)에 있다.

## DB와 수집

### `supabase/`

DB 스키마의 원본 SQL(`migrations/`, 시간 접두 순서). 새 파일로만 바꾸고, `main`에 올리면 `apply_migrations.yml`이 운영 DB에 적용한다. 테이블·뷰·함수에서 그것을 만든 마이그레이션을 찾는 길, RLS와 머티리얼라이즈드 뷰의 함정이 [그 폴더의 안내](../supabase/CLAUDE.md)에 있다.

### `stock-collector/`

웹과 독립인 Python 수집 배치. GitHub Actions가 일봉, 기업정보·재무·WiseReport, 공매도 잔고를 서비스 롤 키로 운영 DB에 쓴다. 스크립트 → 워크플로 → 외부 소스 → 쓰는 테이블 표와 지난 실수가 [그 폴더의 안내](../stock-collector/CLAUDE.md)에 있다.

### `.github/workflows/`

GitHub Actions. 모두 수동 실행(`workflow_dispatch`)도 된다. secret은 이름만 적는다.

| 파일 | 무엇을 돌리나, 언제, 어떤 secret |
| --- | --- |
| `apply_migrations.yml` | `supabase/migrations/**`가 바뀐 `main` push에서 돈다. Supabase CLI 3.2.0 고정 설치 → `supabase link` → `supabase db push --remote --yes`. secret: `SUPABASE_ACCESS_TOKEN`(없으면 실패), `SUPABASE_PROJECT_REF`, `SUPABASE_URL`(ref가 없을 때 URL에서 뽑는다) |
| `collect_candles.yml` | 평일 16:00 KST(`0 7 * * 1-5`). `collect_candles.py` 다음 `calculate_ratios.py`. Python 3.10. secret: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DART_API_KEY` |
| `collect_company_info.yml` | 매주 월 09:00 KST(`0 0 * * 1`). `collect_company_info.py`. secret: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DART_API_KEY` |
| `collect_financials.yml` | 매주 월 10:00 KST(`0 1 * * 1`). `collect_financials.py`. secret: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DART_API_KEY` |
| `collect_kis_flows.yml` | 평일 18:30 KST(`30 9 * * 1-5`, daily). 수동 실행은 `mode` 입력(daily·backfill). `collect_kis_flows.py --mode …`, 제한 120분. secret: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `KIS_APP_KEY`, `KIS_APP_SECRET` |
| `collect_short_balances.yml` | 평일 18:10 KST(daily, `10 9 * * 1-5`)와 20:00 KST(retry, `0 11 * * 1-5`). 수동 실행은 `mode` 입력(daily·retry·backfill). `collect_short_balances.py --mode …`. secret: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `collect_wisereport.yml` | 매주 월 12:00 KST(`0 3 * * 1`). `collect_wisereport.py`. secret: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |

## 도구와 에이전트 설정

### `tool/`

커밋 전 검사. 쓰는 법은 [저장소 규칙](../CLAUDE.md)의 '검사와 커밋'.

| 파일 | 내용 |
| --- | --- |
| `check.sh` | 타입 검사(`tsc`), 린트 기준선, 단위 테스트, 수집 스크립트 문법(`py_compile`), 색인 검사를 차례로 돌린다. 하나라도 실패하면 멈추고 exit 1. 인자 `build`를 주면 끝에 `npm run build`도 돈다. 어느 폴더에서 불러도 된다 |
| `lint-check.py` | `eslint -f json` 결과를 (파일, 규칙)별로 세어 기준선과 비교한다. 늘어난 오류만 실패로 본다. `--update`는 지금 상태를 기준선으로 다시 적는다 |
| `lint-baseline.json` | 기존 린트 오류의 (파일, 규칙)별 개수. 줄 번호는 없다. 새 오류를 여기에 넣어 통과시키지 않는다 |

### `.claude/skills/stock-tidy/`

| 파일 | 내용 |
| --- | --- |
| `SKILL.md` | 정리 세션(`/stock-tidy`): 길어진 파일 나누기, 폴더 안내 줄이기, 낡은 문서·주석, 중복·죽은 코드. 동작은 바꾸지 않는다 |

`docs/check-index.py`(색인 검사)와 `docs/outline.py`(소스 목차)는 [문서 안내](CLAUDE.md)에 있다. `.claude/settings.json`은 종료 훅(색인 검사)과 허용 명령을, `.claude/settings.local.json`은 그 머신의 허용 명령을 담는다.
