-- ============================================================
-- 관리자 권한 플래그
--
-- 수집 실패 재시도, 운영성 작업 등은 서버/API 레이어에서 profiles.is_admin
-- 값을 확인한 뒤 실행한다. 클라이언트가 본인 profile을 수정할 수 있으므로
-- is_admin 컬럼 update 권한은 authenticated/anon에서 명시적으로 제거한다.
-- ============================================================

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

revoke update (is_admin) on public.profiles from anon, authenticated;
