# `supabase/` DB 스키마와 로컬 CLI 설정

위: [저장소 규칙](../CLAUDE.md). 위 문서의 규칙은 여기서 되풀이하지 않는다.

## 이 폴더

- `migrations/`: 스키마의 유일한 원본 SQL. 파일 이름의 시간 접두 순서로 적용된다(20개). 테이블·뷰·함수·트리거·RLS·Realtime이 모두 여기 있다.
- `config.toml`: 로컬 CLI 설정(`project_id = "web"`, Postgres 17, API `max_rows = 1000`, 로컬 메일 `[local_smtp]`). 원격 DB 설정이 아니다.
- `.temp/`: CLI 캐시(`cli-latest`). `.gitignore`가 `.temp`·`.branches`·`.env.local` 등을 무시한다. 손대지 않는다.
- DB를 쓰는 쪽은 웹 `src/`(anon 키, RLS 적용)와 [stock-collector](../stock-collector/CLAUDE.md)(service_role)다.

## 어디를 볼까

객체 이름이 키다. 만든 파일에서 시작하고, 뒤에 바꾼 파일이 있으면 그것이 현재 정의다.

| 하려는 일 | 볼 곳 | 관련 |
| --- | --- | --- |
| 가입 시 프로필 생성, 닉네임, 온보딩, 관리자 | `migrations/20260413000001_init_schema.sql`의 `profiles`, `handle_new_user` | `onboarded`: `migrations/20260416000001_add_onboarded.sql`, `is_admin`: `migrations/20260506000001_add_profile_admin_flag.sql`, update 권한(`nickname`·`onboarded`만): `migrations/20261122000003_tighten_memo_and_profile_rls.sql` |
| 종목 테이블과 열 | `migrations/20260413000001_init_schema.sql`의 `stocks` | 열 추가: `migrations/20260419000002_stock_meta.sql`, `migrations/20260419000003_stock_sector.sql`, `migrations/20260429000001_company_info_fields.sql` |
| 종목 생길 때 공식 토론방 자동 생성 | `migrations/20260416000003_discussion_setup.sql`의 `handle_new_stock` | 테이블 `discussion_rooms`는 init |
| 일봉, KRX/NXT, 인덱스 | `migrations/20260413000001_init_schema.sql`의 `candles` | `exchange`: `migrations/20260414000001_add_exchange_to_candles.sql`, 날짜 범위 인덱스: `migrations/20261122000001_ranking_materialized_views.sql` |
| 재무 테이블과 열 | `migrations/20260413000002_add_financials.sql`의 `financials` | `bps`·`ev_ebitda` 등: `migrations/20260429000001_company_info_fields.sql`, `equity`·`total_assets`: `migrations/20260502000001_financials_balance_sheet.sql` |
| 공매도 잔고 | `migrations/20260420000001_add_short_balances.sql`의 `short_balances` | `src/`에서 읽는 곳을 grep으로 못 찾았다 |
| 토론 글·좋아요·카운트 트리거 | `migrations/20260413000001_init_schema.sql`의 `posts` | `post_likes`·`sync_post_like_count`: `migrations/20260416000003_discussion_setup.sql`, 보안 수정: `migrations/20260417000003_fix_trigger_security.sql` |
| 댓글·대댓글, 깊이 제한 | `migrations/20260417000001_add_comments.sql`의 `comments`, `enforce_comment_depth` | `sync_post_comment_count`도 같은 파일 |
| 싫어요, 즐겨찾기 | `migrations/20260417000002_add_dislikes.sql`의 `post_dislikes` | `favorites`: `migrations/20260416000002_favorites_and_memo_fix.sql` |
| 차트 메모 | `migrations/20261122000003_tighten_memo_and_profile_rls.sql`의 `chart_memos`(지금 정책: 본인 행만) | 최초 `migrations/20260413000001_init_schema.sql`, 프로토타입화(`user_id` NULL 허용): `migrations/20260415000001_add_public_chart_notes.sql`, unique(user, 종목, 날짜): `migrations/20260416000002_favorites_and_memo_fix.sql` |
| 가격 예측, 유저 차단 | `migrations/20260413000001_init_schema.sql`의 `price_predictions`, `user_blocks` | `src/`에서 쓰는 곳을 못 찾았다 |
| 랭킹 머티리얼라이즈드 뷰, 갱신 함수 | `migrations/20261122000001_ranking_materialized_views.sql`의 `v_daily_change`, `v_52w_extremes` | `refresh_ranking_views` 현재 정의와 `v_volume_surge`: `migrations/20261122000002_volume_surge_view.sql`. 의존 뷰 `v_float_volume_ranking`·`v_sector_ranking`도 첫 파일에서 재생성. 웹은 `src/lib/rankings.ts` |
| 최신 분기 재무 뷰 | `migrations/20260429000001_company_info_fields.sql`의 `v_latest_financials` | 최초 `migrations/20260419000001_add_ranking_views.sql` |
| RLS 정책 | `migrations/20260413000001_init_schema.sql`의 `Row Level Security` 절(처음 8개 테이블) | 이후 테이블은 만든 파일 끝의 `create policy` |
| Realtime 구독 대상 | `migrations/20260416000003_discussion_setup.sql`의 `supabase_realtime` | `comments`와 `post_dislikes`는 각 생성 파일 |

## 지킬 것

- **스키마는 새 파일로만 바꾼다.** 커밋된 마이그레이션은 고치지 않는다(원격 이력과 어긋난다). 이름은 `YYYYMMDDNNNNNN_설명.sql`(날짜 8자리 + 같은 날 순번 6자리). 접두가 가장 마지막 파일보다 커야 한다(`ls supabase/migrations | tail -1`).
- **적용 경로.** `.github/workflows/apply_migrations.yml`은 `main`에서 `supabase/migrations/**`가 바뀐 push와 수동 실행에서 돈다. Supabase CLI `3.2.0` 고정 설치 → `supabase link --project-ref` → `supabase db push --remote --yes`. secret: `SUPABASE_ACCESS_TOKEN`(없으면 첫 단계 실패), `SUPABASE_PROJECT_REF`(없으면 `SUPABASE_URL`에서 뽑는다). 합쳐지는 순간 운영 DB에 적용된다. `--yes`가 없으면 CI는 확인 질문에 답하지 못해 적용할 마이그레이션이 있을 때 실패한다(2026-11-22에 처음 걸렸다. 그날 앞서 고친 워크플로는 적용할 것이 없을 때만 통과했다).
- **배경(2026-11-22 세션 기록, 커밋 `aea9368`·`7969b0f`·`6acd654`).** 이 워크플로는 2026-05쯤부터 깨져 있었다: `SUPABASE_ACCESS_TOKEN` secret이 없었고, 그 뒤 CLI `latest`(v3)가 `config.toml`의 `[inbucket]`을 거부하고 `db push`가 로컬 DB를 기본으로 삼았다. 11-22에 secret 추가, `[local_smtp]`로 교체, CLI 3.2.0 고정과 `--remote`로 고쳤다. 그 반년은 손으로 적용해 이력이 어긋났고, 원격에만 있던 `20260506000001_add_profile_admin_flag.sql`을 되살렸다.
- **그래서:** 새 마이그레이션은 워크플로로 적용한다. 실패하면 대시보드 SQL 편집기로 가기 전에 Actions 실행 로그를 먼저 본다. SQL 편집기로 적용했다면 `supabase_migrations.schema_migrations`에 그 버전(접두)을 넣는다.
- **새 테이블은 RLS를 켜고 정책을 쓴다.** 정책 없는 동작은 막힌다.
- **카운트 트리거는 `security definer`.** `posts`에 UPDATE 정책이 없어 일반 트리거는 조용히 거부당해 카운트가 안 올랐다(`migrations/20260417000003_fix_trigger_security.sql`이 고치고 다시 셌다).
- **랭킹은 머티리얼라이즈드 뷰.** 일반 뷰는 요청마다 `candles` 전체에 window 함수를 돌려 anon `statement_timeout`(주석: 3초)에 걸려 랭킹이 비었다. 갱신하는 곳은 하나다: `collect_candles.py`가 수집 끝에 `refresh_ranking_views()`를 service_role로 부른다(SQL 안 cron·트리거 없음). `candles`를 다른 길로 고쳐도 다음 일봉 수집까지 랭킹은 그대로고, `current_date - 30` 같은 창은 갱신 시점에 굳는다.
- **머티리얼라이즈드 뷰를 더하려면** `refresh ... concurrently`용 unique index, `refresh_ranking_views` 통째 재정의(본문이 덮어써진다), `anon`·`authenticated`에 `grant select`(RLS·`security_invoker` 없음), 끝에 `notify pgrst, 'reload schema'`. 뷰를 `drop` 하면 의존 뷰와 권한도 다시 만든다. `refresh_ranking_views`는 service_role만 실행한다(웹에서 부르지 않는다).
- **service_role 타임아웃은 5분.** service_role은 자체 설정이 없어 authenticator의 8초를 물려받았고, `refresh_ranking_views()`(약 36초)가 매번 57014로 실패했다(`20261122000004_service_role_statement_timeout.sql`). 무거운 RPC를 더하면 이 한도 안인지 SQL 편집기에서 `clock_timestamp()`로 재 본다.
- **PostgREST `max_rows`(1000)** 가 응답을 자른다. 1000행을 넘는 집계는 DB 뷰로 옮긴다(`v_volume_surge`가 이 이유). 수집 쪽은 `_utils.fetch_all`.
- **`profiles`는 `nickname`·`onboarded`만 본인이 고칠 수 있다**(`migrations/20261122000003_tighten_memo_and_profile_rls.sql`, 2026-11-22). 그 전에는 `profiles_update`가 본인 행의 모든 열을 허용했고 `revoke update (is_admin)`은 테이블 단위 UPDATE 권한이 남아 있어 효과가 없었다(`is_premium`·`score`·`is_admin`을 본인이 바꿀 수 있었다). 열 하나만 `revoke` 해서는 막히지 않는다: 테이블 단위 권한을 거두고 허용할 열만 `grant` 한다. 사용자가 고칠 열을 더하면 `grant update (열)`도 더한다(빠뜨리면 그 update가 권한 오류로 실패한다).
- **`chart_memos`는 본인 행만 읽고 쓴다**(`migrations/20261122000003_tighten_memo_and_profile_rls.sql`, 2026-11-22). 2026-04-15의 프로토타입 정책(전부 `true`, 비로그인도 남의 메모를 고칠 수 있었다)과 `unique (stock_code, date)`(같은 종목·날짜에 두 번째 사용자의 저장이 막혔다)를 없앴다. `user_id`의 NULL 허용과 FK 없음은 그대로다(프로토타입 때의 NULL 행이 있을 수 있어 되돌리지 않았다. 원격의 행은 확인 못 함). 남의 메모를 보여 주는 기능을 만들려면 select 정책부터 바꿔야 한다.
- **`handle_new_user`는 이메일 `@` 앞을 `nickname`(unique, not null)에 넣는다.** 앞부분이 같거나 이메일이 없는 가입은 실패할 수 있다(확인 못 함).
- **서비스 롤 키는 수집 스크립트·서버에서만.** `src/`에는 `SUPABASE_SERVICE_ROLE_KEY`를 쓰는 곳이 없다(grep).

## 파일

파일을 더하거나 지우면 이 표를 고치고 저장소 루트에서 `python3 docs/check-index.py`로 확인한다.

### `migrations/`

| 파일 | 내용 |
| --- | --- |
| `20260413000001_init_schema.sql` | 첫 스키마: `profiles`(+가입 트리거), `stocks`, `candles`, `discussion_rooms`, `posts`, `chart_memos`, `price_predictions`, `user_blocks`와 RLS |
| `20260413000002_add_financials.sql` | 분기 재무 `financials`, unique(종목, 연도, 분기), 공개 select |
| `20260414000001_add_exchange_to_candles.sql` | `candles.exchange`(KRX/NXT), unique·인덱스 교체 |
| `20260415000001_add_public_chart_notes.sql` | `chart_memos` 프로토타입화: `user_id` NULL 허용, 정책 전체 공개 |
| `20260416000001_add_onboarded.sql` | `profiles.onboarded` |
| `20260416000002_favorites_and_memo_fix.sql` | `favorites`(본인 정책), `chart_memos` unique(user, 종목, 날짜) |
| `20260416000003_discussion_setup.sql` | 공식 토론방 채움과 `handle_new_stock` 트리거, `post_likes`와 카운트 트리거, Realtime |
| `20260417000001_add_comments.sql` | `comments`, 깊이 제한, `posts.comment_count` 트리거, RLS, Realtime |
| `20260417000002_add_dislikes.sql` | `post_dislikes`, `posts.dislike_count` 트리거, RLS, Realtime |
| `20260417000003_fix_trigger_security.sql` | 카운트 트리거 셋을 `security definer`로 재정의, 카운트 재계산 |
| `20260419000001_add_ranking_views.sql` | 일반 뷰 `v_daily_change`, `v_latest_financials`, `v_52w_extremes`와 권한 |
| `20260419000002_stock_meta.sql` | `stocks.shares_outstanding`·`float_shares`, 뷰 `v_float_volume_ranking` |
| `20260419000003_stock_sector.sql` | `stocks.sector`, 뷰 `v_sector_ranking` |
| `20260420000001_add_short_balances.sql` | `short_balances`(PK 종목+날짜), 공개 select |
| `20260429000001_company_info_fields.sql` | `stocks`·`financials`에 기업정보 열, `v_latest_financials` 재정의 |
| `20260502000001_financials_balance_sheet.sql` | `financials.equity`·`total_assets` |
| `20260506000001_add_profile_admin_flag.sql` | `profiles.is_admin`과 열 revoke(원격에서 되살린 파일) |
| `20261122000001_ranking_materialized_views.sql` | `v_daily_change`·`v_52w_extremes` 머티리얼라이즈드 전환, 의존 뷰 재생성, `refresh_ranking_views()`, 날짜 인덱스 |
| `20261122000002_volume_surge_view.sql` | `v_volume_surge`(직전 20영업일 평균 대비 거래량), 갱신 함수에 추가 |
| `20261122000003_tighten_memo_and_profile_rls.sql` | `chart_memos` 정책을 본인 행만으로, `unique (stock_code, date)` 제거. `profiles` update를 `nickname`·`onboarded` 열로 제한 |
| `20261122000004_service_role_statement_timeout.sql` | `service_role`의 `statement_timeout`을 5분으로(authenticator의 8초를 물려받아 `refresh_ranking_views()`가 실패하던 문제) |
