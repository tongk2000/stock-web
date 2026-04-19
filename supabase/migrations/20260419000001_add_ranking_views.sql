-- ============================================================
-- 랭킹 페이지(/rankings/*)용 뷰
--
-- 랭킹 페이지에서 반복되는 집계(직전일 대비 변화, 최신 분기 재무,
-- 52주 신고가 판정)를 view로 캡슐화합니다.
--
-- security_invoker = on 으로 설정해 호출 유저의 RLS를 따르도록 합니다.
-- 기반 테이블(stocks/candles/financials)이 모두 select using (true)
-- 정책을 가지므로 비로그인에서도 조회 가능합니다.
-- ============================================================

-- 1) 일봉 직전일 대비 변화 (KRX, daily 기준)
create or replace view public.v_daily_change
with (security_invoker = on) as
with ranked as (
  select
    c.stock_code,
    c.date,
    c.open, c.high, c.low, c.close, c.volume,
    row_number() over (
      partition by c.stock_code
      order by c.date desc
    ) as rn
  from public.candles c
  where c.exchange = 'KRX' and c.candle_type = 'daily'
)
select
  t.stock_code,
  t.date            as today_date,
  t.open            as today_open,
  t.high            as today_high,
  t.low             as today_low,
  t.close           as today_close,
  t.volume          as today_volume,
  (t.close::bigint * t.volume) as today_value,  -- 거래대금
  y.date            as prev_date,
  y.close           as prev_close,
  case
    when y.close is null or y.close = 0 then null
    else round(((t.close - y.close)::numeric / y.close) * 100, 2)
  end               as change_rate
from ranked t
left join ranked y
  on y.stock_code = t.stock_code and y.rn = 2
where t.rn = 1;

-- 2) 종목별 최신 분기 재무
create or replace view public.v_latest_financials
with (security_invoker = on) as
select distinct on (stock_code)
  stock_code,
  year, quarter,
  revenue, operating_profit, net_income, operating_margin,
  eps, per, pbr, roe, debt_ratio, market_cap,
  updated_at
from public.financials
order by stock_code, year desc, quarter desc;

-- 3) 52주(252영업일) 신고가/신저가 후보
--   today_high == max(high), today_low == min(low) 여부를 함께 노출.
--   페이지에서는 is_new_high/is_new_low로 필터해 사용합니다.
create or replace view public.v_52w_extremes
with (security_invoker = on) as
with last_252 as (
  select
    c.stock_code,
    c.date,
    c.high,
    c.low,
    row_number() over (
      partition by c.stock_code
      order by c.date desc
    ) as rn
  from public.candles c
  where c.exchange = 'KRX' and c.candle_type = 'daily'
),
agg as (
  select
    stock_code,
    max(case when rn = 1 then high end) as today_high,
    min(case when rn = 1 then low  end) as today_low,
    max(high) filter (where rn <= 252)  as high_252,
    min(low)  filter (where rn <= 252)  as low_252
  from last_252
  group by stock_code
)
select
  stock_code,
  today_high,
  today_low,
  high_252,
  low_252,
  (today_high is not null and today_high >= high_252) as is_new_high,
  (today_low  is not null and today_low  <= low_252)  as is_new_low
from agg;

-- 권한: anon/authenticated 역할에 view select 권한 부여
grant select on public.v_daily_change    to anon, authenticated;
grant select on public.v_latest_financials to anon, authenticated;
grant select on public.v_52w_extremes    to anon, authenticated;
