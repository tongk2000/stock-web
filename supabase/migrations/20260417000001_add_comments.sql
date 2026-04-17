-- ============================================================
-- 1. 댓글 테이블 (2단계 평탄화: 댓글 → 대댓글까지만 허용)
-- ============================================================
create table public.comments (
  id                uuid primary key default gen_random_uuid(),
  post_id           uuid not null references public.posts(id) on delete cascade,
  parent_id         uuid references public.comments(id) on delete cascade,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  reply_to_user_id  uuid references public.profiles(id) on delete set null,
  content           text not null check (char_length(content) <= 500),
  created_at        timestamptz not null default now()
);

create index idx_comments_post_created on public.comments (post_id, created_at);
create index idx_comments_parent_created on public.comments (parent_id, created_at);


-- ============================================================
-- 2. 뎁스 제한 트리거 (parent 는 최상위 댓글만 허용)
-- ============================================================
create or replace function public.enforce_comment_depth()
returns trigger language plpgsql as $$
declare
  parent_parent uuid;
begin
  if new.parent_id is null then
    return new;
  end if;

  select parent_id into parent_parent
  from public.comments
  where id = new.parent_id;

  if parent_parent is not null then
    raise exception '대댓글의 대댓글은 허용되지 않습니다';
  end if;

  return new;
end;
$$;

create trigger on_comment_insert_check_depth
  before insert on public.comments
  for each row execute procedure public.enforce_comment_depth();


-- ============================================================
-- 3. posts.comment_count 컬럼 및 자동 동기화
-- ============================================================
alter table public.posts
  add column comment_count integer not null default 0;

create or replace function public.sync_post_comment_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif TG_OP = 'DELETE' then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

create trigger on_comment_change
  after insert or delete on public.comments
  for each row execute procedure public.sync_post_comment_count();


-- ============================================================
-- 4. RLS
-- ============================================================
alter table public.comments enable row level security;

create policy "comments_select" on public.comments for select using (true);
create policy "comments_insert" on public.comments for insert with check (auth.uid() = user_id);
create policy "comments_delete" on public.comments for delete using (auth.uid() = user_id);


-- ============================================================
-- 5. Realtime
-- ============================================================
alter publication supabase_realtime add table public.comments;
