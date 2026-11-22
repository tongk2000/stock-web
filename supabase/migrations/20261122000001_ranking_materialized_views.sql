-- ============================================================
-- 랭킹 뷰를 materialized view로 전환
--
-- v_daily_change / v_52w_extremes 가 요청마다 candles 전체에 window 함수를 돌려
-- anon statement_timeout(3s)에 걸리고, 랭킹 페이지가 모두 "데이터가 없습니다"로 보였다.
-- 일봉 수집 직후 refresh_ranking_views()로 한 번만 계산해 두고 페이지는 결과만 읽는다.
--
-- 의존 뷰(v_float_volume_ranking, v_sector_ranking)는 drop 후 동일 정의로 재생성한다.
-- ============================================================

-- 최근 N일 범위 조회용 (기존 인덱스는 stock_code 선두라 날짜 범위 스캔에 못 씀)
create index if not exists idx_candles_exchange_type_date
  on public.candles (exchange, candle_type, date desc);

drop view if exists public.v_sector_ranking;
drop view if exists public.v_float_volume_ranking;
drop view if exists public.v_daily_change;
drop view if exists public.v_52w_extremes;

-- 1) 일봉 직전일 대비 변화 (KRX, daily 기준)
--   최근 30일 안에 거래가 없는 종목(장기 거래정지)은 랭킹 대상에서 제외된다.
create materialized view public.v_daily_change as
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
    and c.date >= current_date - 30
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

create unique index v_daily_change_stock_code on public.v_daily_change (stock_code);

-- 2) 52주(252영업일) 신고가/신저가 후보
create materialized view public.v_52w_extremes as
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
    and c.date >= current_date - 400  -- 252영업일 ≈ 365일 + 휴장일 여유
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

create unique index v_52w_extremes_stock_code on public.v_52w_extremes (stock_code);

-- 3) 의존 뷰 재생성 (정의 동일)
create or replace view public.v_float_volume_ranking
with (security_invoker = on) as
select
  s.code,
  s.name,
  s.market,
  s.float_shares,
  dc.today_date,
  dc.today_close,
  dc.today_volume,
  dc.today_value,
  dc.change_rate,
  (dc.today_volume::numeric / nullif(s.float_shares, 0)) as volume_to_float
from public.stocks s
join public.v_daily_change dc on dc.stock_code = s.code
where s.float_shares is not null and s.float_shares > 0;

create or replace view public.v_sector_ranking
with (security_invoker = on) as
select
  s.sector,
  count(*)                                             as stock_count,
  count(*) filter (where dc.change_rate > 0)           as up_count,
  count(*) filter (where dc.change_rate < 0)           as down_count,
  round(avg(dc.change_rate)::numeric, 2)               as avg_change,
  sum(dc.today_value)                                  as total_value,
  round(
    (sum(dc.today_value * dc.change_rate)
      / nullif(sum(dc.today_value), 0))::numeric,
    2
  )                                                    as weighted_change
from public.stocks s
join public.v_daily_change dc on dc.stock_code = s.code
where s.sector is not null
group by s.sector;

-- 4) 갱신 함수: collect_candles.py 가 수집 끝에 service_role 로 호출
create or replace function public.refresh_ranking_views()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view concurrently public.v_daily_change;
  refresh materialized view concurrently public.v_52w_extremes;
end;
$$;

revoke all on function public.refresh_ranking_views() from public, anon, authenticated;
grant execute on function public.refresh_ranking_views() to service_role;

-- 권한: 기반 데이터가 모두 공개 조회 대상이므로 view와 동일하게 공개
grant select on public.v_daily_change         to anon, authenticated;
grant select on public.v_52w_extremes         to anon, authenticated;
grant select on public.v_float_volume_ranking to anon, authenticated;
grant select on public.v_sector_ranking       to anon, authenticated;

notify pgrst, 'reload schema';
