-- ============================================================
-- short_sales: 종목별 일별 공매도 체결(거래량·거래대금)
-- credit_balances: 종목별 일별 신용잔고(융자·대주)
--
-- KRX 정보데이터시스템이 로그인을 요구하고 KRX Open API에는 공매도·신용 서비스가 없어
-- 한국투자증권 Open API(FHPST04830000, FHPST04760000)로 받는다(collect_kis_flows.py).
-- 공매도 '잔고'는 KIS에 없어 short_balances 와 따로 둔다.
-- ============================================================

create table public.short_sales (
  stock_code          text not null references public.stocks(code) on delete cascade,
  date                date not null,
  short_volume        bigint,          -- 공매도 체결 수량 (주)
  short_value         bigint,          -- 공매도 거래대금 (원)
  short_volume_ratio  numeric(6, 2),   -- 거래량 대비 공매도 비중 (%)
  short_value_ratio   numeric(6, 2),   -- 거래대금 대비 공매도 비중 (%)
  primary key (stock_code, date)
);

create index idx_short_sales_stock_date
  on public.short_sales (stock_code, date desc);

alter table public.short_sales enable row level security;

create policy "short_sales_select"
  on public.short_sales for select using (true);

create table public.credit_balances (
  stock_code          text not null references public.stocks(code) on delete cascade,
  date                date not null,   -- 매매일(deal_date). 결제일은 T+2
  loan_balance_shares bigint,          -- 융자 잔고 수량 (주)
  loan_balance_amount bigint,          -- 융자 잔고 금액 (원)
  loan_balance_rate   numeric(6, 2),   -- 신용잔고율 (상장주식수 대비 %)
  loan_new_shares     bigint,          -- 융자 신규 수량
  loan_repay_shares   bigint,          -- 융자 상환 수량
  lend_balance_shares bigint,          -- 대주 잔고 수량
  primary key (stock_code, date)
);

create index idx_credit_balances_stock_date
  on public.credit_balances (stock_code, date desc);

alter table public.credit_balances enable row level security;

create policy "credit_balances_select"
  on public.credit_balances for select using (true);

notify pgrst, 'reload schema';
