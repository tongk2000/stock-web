-- ============================================================
-- RLS enabled on posts but no UPDATE policy → triggers were
-- silently denied when updating like_count / comment_count.
-- Fix: recreate all count-sync functions as SECURITY DEFINER.
-- ============================================================

-- 1. like_count trigger (SECURITY DEFINER)
create or replace function public.sync_post_like_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  elsif TG_OP = 'DELETE' then
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

-- 2. dislike_count trigger (SECURITY DEFINER)
create or replace function public.sync_post_dislike_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update public.posts set dislike_count = dislike_count + 1 where id = new.post_id;
  elsif TG_OP = 'DELETE' then
    update public.posts set dislike_count = greatest(dislike_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

-- 3. comment_count trigger (SECURITY DEFINER)
create or replace function public.sync_post_comment_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif TG_OP = 'DELETE' then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

-- 4. Backfill counts from actual data
update public.posts p
set
  like_count    = (select count(*) from public.post_likes    where post_id = p.id),
  dislike_count = (select count(*) from public.post_dislikes where post_id = p.id),
  comment_count = (select count(*) from public.comments      where post_id = p.id);
