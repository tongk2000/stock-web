-- ============================================================
-- chart_memos / profiles 권한 조이기
--
-- 1. chart_memos: 20260415000001 에서 "프로토타입용"으로 select/insert/update/delete 를
--    모두 true 로 열어 둔 정책이 로그인·개인화(20260416000002) 뒤에도 남아 있었다.
--    누구나(비로그인 포함) 남의 메모를 읽고 고치고 지울 수 있었다.
--    → 본인 행만. 앱은 로그인한 사용자의 메모만 읽고 쓴다(StockChartSection).
--    같은 마이그레이션의 unique (stock_code, date) 도 남아 있어, 같은 종목·날짜에
--    다른 사용자가 먼저 메모를 쓰면 두 번째 사용자의 저장이 막혔다.
--    → 제거. 사용자별 유일성은 chart_memos_user_stock_date_unique 가 맡는다.
--    user_id 가 null 인 프로토타입 시절 행은 지우지 않는다(아무에게도 보이지 않게 된다).
--
-- 2. profiles: profiles_update 정책은 본인 행이면 모든 컬럼을 허용했고,
--    20260506000001 의 revoke update (is_admin) 은 테이블 단위 UPDATE 권한이
--    남아 있어 효과가 없었다. 로그인한 사용자가 자기 is_premium·score·is_admin 을
--    바꿀 수 있었다.
--    → 테이블 단위 UPDATE 를 거두고 nickname·onboarded 컬럼만 허용한다
--      (앱이 고치는 것은 /auth/setup 의 이 두 컬럼뿐이다).
--    service_role(수집기·서버 작업)은 영향받지 않는다.
-- ============================================================

-- 1. chart_memos
drop policy if exists "memos_select" on public.chart_memos;
drop policy if exists "memos_insert" on public.chart_memos;
drop policy if exists "memos_update" on public.chart_memos;
drop policy if exists "memos_delete" on public.chart_memos;

create policy "memos_select" on public.chart_memos
  for select using (auth.uid() = user_id);
create policy "memos_insert" on public.chart_memos
  for insert with check (auth.uid() = user_id);
create policy "memos_update" on public.chart_memos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "memos_delete" on public.chart_memos
  for delete using (auth.uid() = user_id);

alter table public.chart_memos
  drop constraint if exists chart_memos_stock_date_unique;

-- 2. profiles
revoke update on public.profiles from anon, authenticated;
grant update (nickname, onboarded) on public.profiles to authenticated;
