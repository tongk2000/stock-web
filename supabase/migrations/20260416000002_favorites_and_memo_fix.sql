-- ============================================================
-- 1. 즐겨찾기 테이블
-- ============================================================
create table public.favorites (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  stock_code text not null references public.stocks(code) on delete cascade,
  stock_name text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, stock_code)
);

alter table public.favorites enable row level security;

create policy "favorites_select" on public.favorites for select using (auth.uid() = user_id);
create policy "favorites_insert" on public.favorites for insert with check (auth.uid() = user_id);
create policy "favorites_delete" on public.favorites for delete using (auth.uid() = user_id);


-- ============================================================
-- 2. chart_memos: (user_id, stock_code, date) unique 제약 추가
--    upsert가 제대로 동작하려면 unique index 필요
-- ============================================================
alter table public.chart_memos
  add constraint chart_memos_user_stock_date_unique
  unique (user_id, stock_code, date);
