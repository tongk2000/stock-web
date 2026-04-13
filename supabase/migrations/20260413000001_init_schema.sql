-- ============================================================
-- 1. 유저 프로필 (Supabase Auth users 확장)
-- ============================================================
create table public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  nickname    text not null unique,
  is_premium  boolean not null default false,
  score       numeric(5, 2) not null default 0,   -- 예측 적중률 점수
  created_at  timestamptz not null default now()
);

-- 유저 가입 시 자동으로 프로필 생성
create function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ============================================================
-- 2. 종목
-- ============================================================
create table public.stocks (
  code      text primary key,              -- 종목코드 (e.g. "005930")
  name      text not null,                 -- 종목명
  market    text not null check (market in ('KOSPI', 'KOSDAQ')),
  updated_at timestamptz not null default now()
);


-- ============================================================
-- 3. 캔들 데이터 (일봉/주봉/월봉)
-- ============================================================
create table public.candles (
  id          bigserial primary key,
  stock_code  text not null references public.stocks(code) on delete cascade,
  candle_type text not null check (candle_type in ('daily', 'weekly', 'monthly')),
  date        date not null,
  open        integer not null,
  high        integer not null,
  low         integer not null,
  close       integer not null,
  volume      bigint not null,
  unique (stock_code, candle_type, date)
);

create index idx_candles_stock_type_date on public.candles (stock_code, candle_type, date desc);


-- ============================================================
-- 4. 토론방
-- ============================================================
create table public.discussion_rooms (
  id          uuid primary key default gen_random_uuid(),
  stock_code  text not null references public.stocks(code) on delete cascade,
  name        text not null,
  is_official boolean not null default false,   -- 종목당 기본 공식방
  owner_id    uuid references public.profiles(id) on delete set null,  -- 유저 개설방
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now()
);


-- ============================================================
-- 5. 토론방 게시글
-- ============================================================
create table public.posts (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.discussion_rooms(id) on delete cascade,
  stock_code  text not null,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  content     text not null check (char_length(content) <= 1000),
  like_count  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index idx_posts_room_created on public.posts (room_id, created_at desc);


-- ============================================================
-- 6. 차트 메모
-- ============================================================
create table public.chart_memos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  stock_code  text not null references public.stocks(code) on delete cascade,
  date        date not null,        -- 메모가 달린 날짜
  content     text not null check (char_length(content) <= 500),
  created_at  timestamptz not null default now()
);

-- 무료 유저: 종목당 5개 제한 (애플리케이션 레벨에서 체크)
create index idx_memos_user_stock on public.chart_memos (user_id, stock_code);


-- ============================================================
-- 7. 가격 예측
-- ============================================================
create table public.price_predictions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  stock_code    text not null references public.stocks(code) on delete cascade,
  target_price  integer not null,
  target_date   date not null,
  is_resolved   boolean not null default false,
  actual_price  integer,           -- 만기 시 실제 가격
  created_at    timestamptz not null default now(),
  unique (user_id, stock_code, target_date)
);


-- ============================================================
-- 8. 유저 차단
-- ============================================================
create table public.user_blocks (
  blocker_id  uuid not null references public.profiles(id) on delete cascade,
  blocked_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);


-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.stocks enable row level security;
alter table public.candles enable row level security;
alter table public.discussion_rooms enable row level security;
alter table public.posts enable row level security;
alter table public.chart_memos enable row level security;
alter table public.price_predictions enable row level security;
alter table public.user_blocks enable row level security;

-- profiles: 본인만 수정, 전체 조회 가능
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- stocks, candles: 전체 읽기 전용
create policy "stocks_select" on public.stocks for select using (true);
create policy "candles_select" on public.candles for select using (true);

-- discussion_rooms: 전체 조회, 프리미엄 유저만 개설
create policy "rooms_select" on public.discussion_rooms for select using (true);
create policy "rooms_insert" on public.discussion_rooms for insert
  with check (
    auth.uid() = owner_id and
    exists (select 1 from public.profiles where id = auth.uid() and is_premium = true)
  );

-- posts: 전체 조회, 로그인 유저 작성, 본인만 삭제
create policy "posts_select" on public.posts for select using (true);
create policy "posts_insert" on public.posts for insert with check (auth.uid() = user_id);
create policy "posts_delete" on public.posts for delete using (auth.uid() = user_id);

-- chart_memos: 본인 것만
create policy "memos_select" on public.chart_memos for select using (auth.uid() = user_id);
create policy "memos_insert" on public.chart_memos for insert with check (auth.uid() = user_id);
create policy "memos_delete" on public.chart_memos for delete using (auth.uid() = user_id);

-- price_predictions: 전체 조회, 본인만 작성
create policy "predictions_select" on public.price_predictions for select using (true);
create policy "predictions_insert" on public.price_predictions for insert with check (auth.uid() = user_id);

-- user_blocks: 본인 것만
create policy "blocks_select" on public.user_blocks for select using (auth.uid() = blocker_id);
create policy "blocks_insert" on public.user_blocks for insert with check (auth.uid() = blocker_id);
create policy "blocks_delete" on public.user_blocks for delete using (auth.uid() = blocker_id);
