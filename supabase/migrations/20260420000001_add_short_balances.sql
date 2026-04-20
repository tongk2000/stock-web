-- ============================================================
-- 공매도 잔고 (KRX 공시, T+2 영업일 18:00 KST 이후 확정)
-- ============================================================
create table public.short_balances (
  stock_code     text not null references public.stocks(code) on delete cascade,
  date           date not null,
  balance_qty    bigint,          -- 공매도잔고 수량
  balance_amt    bigint,          -- 공매도잔고 금액
  listed_shares  bigint,          -- 상장주식수 (스냅샷)
  balance_ratio  numeric(7, 3),   -- 잔고 비중 (%)
  primary key (stock_code, date)
);

create index idx_short_balances_stock_date
  on public.short_balances (stock_code, date desc);

alter table public.short_balances enable row level security;

create policy "short_balances_select"
  on public.short_balances for select using (true);
