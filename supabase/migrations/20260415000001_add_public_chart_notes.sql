-- ============================================================
-- chart_memos 프로토타입용 수정
--   - user_id: NOT NULL 제거 + FK 제거 (로그인 붙이면 원복)
--   - unique(stock_code, date): 날짜당 메모 1개
--   - RLS: 비로그인 포함 전체 공개
-- ============================================================

alter table public.chart_memos
  alter column user_id drop not null;

alter table public.chart_memos
  drop constraint if exists chart_memos_user_id_fkey;

alter table public.chart_memos
  add constraint chart_memos_stock_date_unique unique (stock_code, date);

-- 기존 RLS 정책 교체
drop policy if exists "memos_select" on public.chart_memos;
drop policy if exists "memos_insert" on public.chart_memos;
drop policy if exists "memos_delete" on public.chart_memos;

create policy "memos_select" on public.chart_memos for select using (true);
create policy "memos_insert" on public.chart_memos for insert with check (true);
create policy "memos_update" on public.chart_memos for update using (true) with check (true);
create policy "memos_delete" on public.chart_memos for delete using (true);
