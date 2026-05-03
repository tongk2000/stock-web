-- ============================================================
-- 재무상태표 기초 항목 추가
--
-- EPS·PER·PBR·BPS·ROE·부채비율·시가총액은
-- calculate_ratios.py 가 일봉 수집 직후 종가 기준으로 계산해 저장한다.
-- v_latest_financials 뷰는 구조 변경 없이 저장값을 그대로 노출한다.
-- ============================================================

alter table public.financials
  add column equity       bigint,   -- 자본총계 (원)
  add column total_assets bigint;   -- 자산총계 (원)
