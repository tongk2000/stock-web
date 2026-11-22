-- ============================================================
-- financials.net_income_ttm: 최근 4분기(TTM) 당기순이익
--
-- DART 분기·반기 보고서의 당기순이익은 3개월치, 사업보고서(Q4)는 연간치라
-- 최신 분기 행 하나로 PER·EPS·ROE 를 내면 분기 실적 기준이 되어
-- (예: 펄어비스 PER 162 vs 네이버 6.6) 크게 어긋났다.
-- collect_financials.py 가 종목별 최신 행에 TTM 을 채우고 calculate_ratios.py 가 이를 쓴다.
-- ============================================================

alter table public.financials
  add column if not exists net_income_ttm bigint;  -- 최근 4분기 당기순이익 (원, 종목별 최신 행에만)
