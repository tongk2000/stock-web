-- ============================================================
-- 로그인 없이 공개로 사용하는 차트 메모 (종목당 날짜별 1개)
-- ============================================================
create table public.chart_notes (
  id          uuid primary key default gen_random_uuid(),
  stock_code  text not null references public.stocks(code) on delete cascade,
  date        date not null,
  content     text not null check (char_length(content) <= 500),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (stock_code, date)
);

create index idx_notes_stock_date on public.chart_notes (stock_code, date);

alter table public.chart_notes enable row level security;

-- 비로그인 포함 전체 공개
create policy "notes_select" on public.chart_notes for select using (true);
create policy "notes_insert" on public.chart_notes for insert with check (true);
create policy "notes_update" on public.chart_notes for update using (true) with check (true);
create policy "notes_delete" on public.chart_notes for delete using (true);
