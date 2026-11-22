# 주식 사이트

관심 종목의 주가·차트·기업정보·토론을 모아 보는 Next.js 프로젝트입니다.

## 처음 이 프로젝트를 읽는다면

**[초보자를 위한 프로젝트 설명서](docs/README.md)**에서 시작하세요. React와 Next.js 경험이 없는 독자를 기준으로 실제 소스를 따라 설명합니다.

- [전체 구조와 현재 기능](docs/01-big-picture.md)
- [실제 코드로 배우는 React·Next.js](docs/02-reading-code.md)
- [화면별 파일 지도](docs/03-file-map.md)
- [차트·로그인·즐겨찾기·토론의 데이터 흐름](docs/04-data-flows.md)
- [실행·환경 변수·자동 수집·문제 해결](docs/05-running.md)
- [작은 수정 실습과 AI에게 요청하는 방법](docs/06-practice.md)

## 기술과 구조

| 영역 | 기술 / 위치 |
|---|---|
| 웹 | Next.js 16.2.3 App Router, React 19.2.4, TypeScript |
| 스타일 | Tailwind CSS v4, shadcn/ui 관련 구성 |
| 데이터·인증 | Supabase PostgreSQL, Auth, Realtime |
| 차트 | Lightweight Charts v5 |
| 페이지 / 화면 조각 | `src/app/` / `src/components/` |
| 공유 상태 / 도우미 | `src/contexts/` / `src/lib/` |
| 자료 수집 | `stock-collector/`의 Python, `.github/workflows/`의 예약 작업 |
| DB 변경 이력 | `supabase/migrations/` |

TanStack Query Provider와 5분 staleTime 설정은 있으나 현재 화면의 조회는 주로 직접 작성한 useEffect·Supabase 호출을 사용합니다.

## 실행

이 README가 있는 실제 앱 폴더에서 실행합니다. 이 작업 공간에서는 `source/stock-web/`입니다.

1. Node.js를 준비합니다. 현재 lock 파일의 Next.js 최소 요구 조건은 20.9.0입니다.
2. `npm ci`로 의존성을 설치합니다.
3. `.env.local`이 없으면 `.env.example`을 복사하고 값을 채웁니다. 기존 파일은 덮어쓰지 않습니다.
4. `NEXT_PUBLIC_SITE_URL`은 로컬 주소 `http://localhost:3000`, Supabase URL과 anon key는 연결할 프로젝트의 값으로 설정합니다.
5. `npm run dev`를 실행하고 터미널에 표시된 주소를 엽니다.

DB 테이블과 종목 데이터, Google 로그인 설정은 별도로 필요합니다. 환경 변수만으로 준비되지는 않습니다. 자세한 절차는 [실행 안내](docs/05-running.md)를 참고하세요.

| 명령 | 용도 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run lint` | 코드 규칙 검사 |
| `npm run build` | 배포용 빌드 |
| `npm run start` | 빌드한 결과 실행 |

## 구현 범위

홈 관심 종목, 검색, 종목 차트·메모·기업정보·토론, 댓글·반응, Google 로그인, 즐겨찾기, 각종 랭킹과 네이버 현재가 조회 코드가 있습니다. 종목 상세의 시세·뉴스·공시·수급현황 탭과 NXT 단독 선택은 준비 중입니다. 결제와 가격 예측의 완성된 서비스 흐름은 확인되지 않았습니다.

2026-09-23 로컬 소스 기준이며 운영 서비스의 작동 상태를 검증한 목록은 아닙니다. 예전 설명과 현재 구현이 달랐던 부분은 [실행 안내의 비교표](docs/05-running.md)에 기록했습니다. 특히 차트 메모 권한은 초기 SQL 뒤에 공개 정책으로 변경된 이력이 있어, 본인 전용 보관이라고 단정할 수 없습니다. [데이터 흐름과 권한 설명](docs/04-data-flows.md)을 참고하세요.

## 기여·유지보수

수정 전에 [AGENTS.md](AGENTS.md)를 읽고, 변경한 기능의 설명서도 함께 갱신합니다. main에 DB 마이그레이션 변경을 push하면 자동 적용 workflow가 실행될 수 있습니다. 문구 수정과 DB 변경을 구분해서 작업하세요.
