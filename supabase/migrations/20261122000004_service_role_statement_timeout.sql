-- ============================================================
-- service_role statement_timeout 상향 (8s → 5min)
--
-- service_role 에는 자체 설정이 없어 authenticator 의 statement_timeout(8s)을 물려받는다.
-- 수집기가 부르는 refresh_ranking_views() 는 머티리얼라이즈드 뷰 3개 갱신에 약 36초가 걸려
-- 매번 57014(statement timeout)로 실패했고, 같은 워크플로의 재무비율 계산 단계까지 건너뛰었다.
-- service_role 은 수집 스크립트만 쓰므로 이 역할만 올린다. anon(3s)·authenticated(8s)는 그대로.
-- ============================================================

alter role service_role set statement_timeout = '5min';

-- PostgREST 가 역할 설정을 다시 읽도록
notify pgrst, 'reload config';
