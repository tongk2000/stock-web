-- ============================================================
-- 재무 정보 (분기별)
-- ============================================================
create table public.financials (
  id              bigserial primary key,
  stock_code      text not null references public.stocks(code) on delete cascade,
  year            integer not null,         -- 사업연도
  quarter         integer not null check (quarter in (1, 2, 3, 4)),  -- 분기
  -- 수익성
  revenue         bigint,                   -- 매출액 (원)
  operating_profit bigint,                  -- 영업이익 (원)
  net_income      bigint,                   -- 당기순이익 (원)
  operating_margin numeric(6, 2),           -- 영업이익률 (%)
  -- 가치 지표
  eps             integer,                  -- 주당순이익 (원)
  per             numeric(8, 2),            -- 주가수익비율
  pbr             numeric(6, 2),            -- 주가순자산비율
  roe             numeric(6, 2),            -- 자기자본이익률 (%)
  -- 재무 건전성
  debt_ratio      numeric(8, 2),            -- 부채비율 (%)
  -- 규모
  market_cap      bigint,                   -- 시가총액 (원)
  updated_at      timestamptz not null default now(),
  unique (stock_code, year, quarter)
);

create index idx_financials_stock_year_quarter on public.financials (stock_code, year desc, quarter desc);

alter table public.financials enable row level security;
create policy "financials_select" on public.financials for select using (true);
