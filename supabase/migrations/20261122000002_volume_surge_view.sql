-- ============================================================
-- 거래량 급증 랭킹용 materialized view
--
-- 기존에는 최근 50일 candles 를 통째로 읽어 서버에서 집계했는데,
-- PostgREST max_rows(1000) 에 잘려 하루치만 들어와 결과가 항상 비었다.
-- 직전 20영업일 평균(RANKING.VOLUME_SURGE_LOOKBACK_DAYS)을 DB 에서 미리 계산한다.
-- ============================================================

create materialized view public.v_volume_surge as
with ranked as (
  select
    c.stock_code,
    c.close,
    c.volume,
    row_number() over (
      partition by c.stock_code
      order by c.date desc
    ) as rn
  from public.candles c
  where c.exchange = 'KRX' and c.candle_type = 'daily'
    and c.date >= current_date - 60  -- 20영업일 + 휴장일 여유
),
agg as (
  select
    stock_code,
    max(close)  filter (where rn = 1)            as today_close,
    max(volume) filter (where rn = 1)            as today_volume,
    avg(volume) filter (where rn between 2 and 21) as prev_avg_volume,
    count(*)    filter (where rn between 2 and 21) as prev_days
  from ranked
  group by stock_code
)
select
  stock_code,
  today_close,
  today_volume,
  prev_avg_volume,
  (today_volume / nullif(prev_avg_volume, 0))::numeric as surge_ratio
from agg
where prev_days = 20;

create unique index v_volume_surge_stock_code on public.v_volume_surge (stock_code);

grant select on public.v_volume_surge to anon, authenticated;

create or replace function public.refresh_ranking_views()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view concurrently public.v_daily_change;
  refresh materialized view concurrently public.v_52w_extremes;
  refresh materialized view concurrently public.v_volume_surge;
end;
$$;

notify pgrst, 'reload schema';
