-- ============================================================
-- 1. posts.dislike_count 컬럼 추가
-- ============================================================
alter table public.posts
  add column dislike_count integer not null default 0;


-- ============================================================
-- 2. post_dislikes 테이블 (post_likes 와 동일 구조)
-- ============================================================
create table public.post_dislikes (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index idx_post_dislikes_user on public.post_dislikes (user_id);


-- ============================================================
-- 3. dislike_count 자동 동기화 트리거
-- ============================================================
create or replace function public.sync_post_dislike_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update public.posts set dislike_count = dislike_count + 1 where id = new.post_id;
  elsif TG_OP = 'DELETE' then
    update public.posts set dislike_count = greatest(dislike_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

create trigger on_post_dislike_change
  after insert or delete on public.post_dislikes
  for each row execute procedure public.sync_post_dislike_count();


-- ============================================================
-- 4. RLS
-- ============================================================
alter table public.post_dislikes enable row level security;

create policy "post_dislikes_select" on public.post_dislikes for select using (true);
create policy "post_dislikes_insert" on public.post_dislikes for insert with check (auth.uid() = user_id);
create policy "post_dislikes_delete" on public.post_dislikes for delete using (auth.uid() = user_id);


-- ============================================================
-- 5. Realtime
-- ============================================================
alter publication supabase_realtime add table public.post_dislikes;
