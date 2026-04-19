-- ============================================================
-- 종목 메타 확장: 발행주식수 / 유동주식수
--
-- KRX 정보데이터시스템은 전 종목 "상장주식수"는 제공하지만,
-- "유동주식수"는 KRX 주요 지수(KOSPI200, KOSDAQ150, KRX300 등)
-- 구성종목의 유동비율(FFR)만 공식 발표합니다.
--
-- 따라서 float_shares는 지수 구성종목만 채우고 나머지는 NULL로 남겨
-- "제공 예외대상"으로 취급합니다. 랭킹 쿼리에서 NULL은 자연 필터됩니다.
-- ============================================================

alter table public.stocks
  add column shares_outstanding bigint,    -- 상장주식수 (전체 종목 수집 대상)
  add column float_shares        bigint;   -- 유동주식수 (지수 구성종목만, 비지수는 NULL)

-- ============================================================
-- 유동물량 대비 거래량 랭킹 view
--
-- float_shares가 채워진 종목에 대해 오늘 거래량 / 유동주식수 비율을
-- 미리 계산해 둡니다. 비지수 종목은 float_shares가 NULL이라 자연 제외됩니다.
-- ============================================================

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

grant select on public.v_float_volume_ranking to anon, authenticated;
