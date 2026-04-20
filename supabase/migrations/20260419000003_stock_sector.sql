-- ============================================================
-- 종목 업종(섹터) 분류
--
-- KRX 정보데이터시스템이 전 종목에 대해 업종분류를 제공합니다.
-- stocks.sector에는 KRX 업종명을 그대로 저장 (예: "반도체", "자동차").
-- 수집 스크립트(stock-collector/)에서 주기적으로 갱신합니다.
-- ============================================================

alter table public.stocks add column sector text;

create index idx_stocks_sector on public.stocks (sector);

-- ============================================================
-- 섹터 랭킹 view
--
-- 섹터별로 종목 수, 상승/하락 종목 수, 총 거래대금, 거래대금 가중 등락률을
-- 미리 계산합니다. 가중 등락률은 대형주가 등락에 미치는 영향을 반영하므로
-- 단순 평균보다 체감 섹터 흐름에 가깝습니다.
-- ============================================================

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

grant select on public.v_sector_ranking to anon, authenticated;
