-- profiles에 온보딩 완료 여부 컬럼 추가
-- 기존 유저는 이미 닉네임이 있으므로 true로 설정
ALTER TABLE public.profiles
  ADD COLUMN onboarded boolean NOT NULL DEFAULT false;

-- 기존 유저는 온보딩 완료 처리
UPDATE public.profiles SET onboarded = true;

-- 트리거: 신규 가입 시 onboarded = false (DEFAULT 그대로)
