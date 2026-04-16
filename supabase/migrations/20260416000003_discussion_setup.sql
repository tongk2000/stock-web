-- ============================================================
-- 1. 기존 종목에 공식 토론방 생성
-- ============================================================
insert into public.discussion_rooms (stock_code, name, is_official)
select code, name || ' 토론방', true
from public.stocks
where not exists (
  select 1 from public.discussion_rooms
  where stock_code = stocks.code and is_official = true
);

-- 신규 종목 추가 시 공식 토론방 자동 생성
create or replace function public.handle_new_stock()
returns trigger language plpgsql security definer as $$
begin
  insert into public.discussion_rooms (stock_code, name, is_official)
  values (new.code, new.name || ' 토론방', true);
  return new;
end;
$$;

create trigger on_stock_created
  after insert on public.stocks
  for each row execute procedure public.handle_new_stock();


-- ============================================================
-- 2. 게시글 좋아요 테이블
-- ============================================================
create table public.post_likes (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_likes enable row level security;

create policy "post_likes_select" on public.post_likes for select using (true);
create policy "post_likes_insert" on public.post_likes for insert with check (auth.uid() = user_id);
create policy "post_likes_delete" on public.post_likes for delete using (auth.uid() = user_id);


-- ============================================================
-- 3. 좋아요 수 자동 동기화 트리거
-- ============================================================
create or replace function public.sync_post_like_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  elsif TG_OP = 'DELETE' then
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

create trigger on_post_like_change
  after insert or delete on public.post_likes
  for each row execute procedure public.sync_post_like_count();


-- ============================================================
-- 4. Realtime 활성화
-- ============================================================
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.post_likes;
