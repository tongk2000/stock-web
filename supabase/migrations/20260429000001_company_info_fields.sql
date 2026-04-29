-- ============================================================
-- 기업정보 탭 표시를 위한 추가 컬럼
-- ============================================================

-- stocks 테이블: 정적 기업 정보
alter table public.stocks
  add column description           text,              -- 기업개요
  add column face_value            integer,           -- 액면가 (원)
  add column substitute_value      integer,           -- 대용가 (원)
  add column listing_date          date,              -- 상장일
  add column ipo_price             integer,           -- 공모가 (원)
  add column capital               bigint,            -- 자본금 (원)
  add column foreign_ownership_ratio numeric(6, 2);   -- 외국인지분율 (%)

-- financials 테이블: 분기별 재무에 추가 지표
alter table public.financials
  add column bps                   integer,           -- 주당순자산 (원)
  add column ev_ebitda             numeric(8, 2),     -- EV/EBITDA
  add column dividend              integer,           -- 배당금 (원)
  add column dividend_yield        numeric(6, 2),     -- 배당수익률 (%)
  add column credit_balance_ratio  numeric(6, 2);     -- 신용잔고비율 (%)

-- v_latest_financials 뷰를 새 컬럼 포함하도록 재정의
create or replace view public.v_latest_financials
with (security_invoker = on) as
select distinct on (stock_code)
  stock_code,
  year, quarter,
  revenue, operating_profit, net_income, operating_margin,
  eps, per, pbr, roe, debt_ratio, market_cap,
  bps, ev_ebitda, dividend, dividend_yield, credit_balance_ratio,
  updated_at
from public.financials
order by stock_code, year desc, quarter desc;

grant select on public.v_latest_financials to anon, authenticated;
