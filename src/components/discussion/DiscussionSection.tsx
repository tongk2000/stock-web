'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { ThumbsUp, ThumbsDown, Trash2, MessageSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { firstOrNull } from '@/lib/supabase/normalize';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import CommentSection from './CommentSection';
import { formatRelativeTime } from '@/lib/format';
import { PAGE_SIZE } from '@/lib/constants';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

type PostWithAuthor = {
  id: string;
  content: string;
  created_at: string;
  like_count: number;
  dislike_count: number;
  comment_count: number;
  user_id: string;
  profiles: {
    nickname: string;
    score: number;
    is_premium: boolean;
  }[] | null;
};

interface Props {
  roomId: string;
  stockCode: string;
}

const POST_SELECT =
  'id, content, created_at, like_count, dislike_count, comment_count, user_id, profiles!posts_user_id_fkey(nickname, score, is_premium)';

export default function DiscussionSection({ roomId, stockCode }: Props) {
  const { user, signInWithGoogle } = useAuth();
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  const [dislikedSet, setDislikedSet] = useState<Set<string>>(new Set());
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const toggleComments = useCallback((postId: string) => {
    setOpenComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }, []);

  // 게시글 목록 조회 (첫 페이지)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPosts([]);
    setHasMore(true);
    const supabase = createClient();
    supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE.ROOM)
      .then(({ data }) => {
        if (cancelled) return;
        const list = (data as PostWithAuthor[]) ?? [];
        setPosts(list);
        setHasMore(list.length === PAGE_SIZE.ROOM);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  // 스크롤 끝에 닿으면 이전 페이지(더 오래된 글) 로드
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || loading) return;
    const lastPost = posts[posts.length - 1];
    if (!lastPost) return;
    setLoadingMore(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('room_id', roomId)
      .lt('created_at', lastPost.created_at)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE.ROOM);
    const list = (data as PostWithAuthor[]) ?? [];
    setPosts((prev) => {
      const seen = new Set(prev.map((p) => p.id));
      const next = list.filter((p) => !seen.has(p.id));
      return [...prev, ...next];
    });
    setHasMore(list.length === PAGE_SIZE.ROOM);
    setLoadingMore(false);
  }, [loadingMore, hasMore, loading, posts, roomId]);

  useInfiniteScroll(sentinelRef, loadMore, { enabled: hasMore });

  // 현재 유저의 좋아요 / 싫어요 목록
  useEffect(() => {
    if (!user) {
      setLikedSet(new Set());
      setDislikedSet(new Set());
      return;
    }
    const supabase = createClient();
    supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        setLikedSet(new Set(data?.map((r) => r.post_id) ?? []));
      });
    supabase
      .from('post_dislikes')
      .select('post_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        setDislikedSet(new Set(data?.map((r) => r.post_id) ?? []));
      });
  }, [user]);

  // 실시간 구독
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts', filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const { data } = await supabase
            .from('posts')
            .select(POST_SELECT)
            .eq('id', payload.new.id)
            .single();
          if (data) setPosts((prev) => [data as PostWithAuthor, ...prev]);
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'posts', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setPosts((prev) =>
            prev.map((p) =>
              p.id === payload.new.id
                ? {
                    ...p,
                    like_count: payload.new.like_count,
                    dislike_count: payload.new.dislike_count,
                    comment_count: payload.new.comment_count,
                  }
                : p,
            ),
          );
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'posts' },
        (payload) => {
          setPosts((prev) => prev.filter((p) => p.id !== payload.old.id));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  const handleSubmit = useCallback(async () => {
    if (!user) {
      signInWithGoogle();
      return;
    }
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    const supabase = createClient();
    await supabase.from('posts').insert({
      room_id: roomId,
      stock_code: stockCode,
      user_id: user.id,
      content: content.trim(),
    });
    setContent('');
    setSubmitting(false);
    textareaRef.current?.focus();
  }, [user, content, submitting, roomId, stockCode, signInWithGoogle]);

  const handleLike = useCallback(async (postId: string) => {
    if (!user) {
      signInWithGoogle();
      return;
    }
    const isLiked = likedSet.has(postId);
    const isDisliked = dislikedSet.has(postId);
    const supabase = createClient();

    if (isLiked) {
      // 좋아요 취소
      setLikedSet((prev) => { const n = new Set(prev); n.delete(postId); return n; });
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, like_count: p.like_count - 1 } : p));
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
    } else {
      // 좋아요 추가 (싫어요 있으면 동시에 제거)
      setLikedSet((prev) => { const n = new Set(prev); n.add(postId); return n; });
      setPosts((prev) => prev.map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          like_count: p.like_count + 1,
          dislike_count: isDisliked ? p.dislike_count - 1 : p.dislike_count,
        };
      }));
      if (isDisliked) {
        setDislikedSet((prev) => { const n = new Set(prev); n.delete(postId); return n; });
        await supabase.from('post_dislikes').delete().eq('post_id', postId).eq('user_id', user.id);
      }
      await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
    }
  }, [user, likedSet, dislikedSet, signInWithGoogle]);

  const handleDislike = useCallback(async (postId: string) => {
    if (!user) {
      signInWithGoogle();
      return;
    }
    const isDisliked = dislikedSet.has(postId);
    const isLiked = likedSet.has(postId);
    const supabase = createClient();

    if (isDisliked) {
      // 싫어요 취소
      setDislikedSet((prev) => { const n = new Set(prev); n.delete(postId); return n; });
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, dislike_count: p.dislike_count - 1 } : p));
      await supabase.from('post_dislikes').delete().eq('post_id', postId).eq('user_id', user.id);
    } else {
      // 싫어요 추가 (좋아요 있으면 동시에 제거)
      setDislikedSet((prev) => { const n = new Set(prev); n.add(postId); return n; });
      setPosts((prev) => prev.map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          dislike_count: p.dislike_count + 1,
          like_count: isLiked ? p.like_count - 1 : p.like_count,
        };
      }));
      if (isLiked) {
        setLikedSet((prev) => { const n = new Set(prev); n.delete(postId); return n; });
        await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
      }
      await supabase.from('post_dislikes').insert({ post_id: postId, user_id: user.id });
    }
  }, [user, likedSet, dislikedSet, signInWithGoogle]);

  const handleDelete = useCallback(async (postId: string) => {
    if (!user) return;
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    const supabase = createClient();
    await supabase.from('posts').delete().eq('id', postId).eq('user_id', user.id);
  }, [user]);

  return (
    <div className="mt-10">
      <h2 className="mb-4 text-lg font-semibold text-foreground">토론방</h2>

      {/* 글 작성 폼 */}
      <div className="mb-5 rounded-xl border border-border bg-card/50 p-4">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onFocus={() => { if (!user) signInWithGoogle(); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
          }}
          placeholder={user ? '의견을 남겨보세요... (Ctrl+Enter로 등록)' : '로그인 후 의견을 남길 수 있습니다. 클릭하여 로그인'}
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          rows={3}
          maxLength={1000}
          readOnly={!user}
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{content.length} / 1000</span>
          <button
            onClick={handleSubmit}
            disabled={user ? (!content.trim() || submitting) : false}
            className="rounded-lg bg-violet-500/20 px-4 py-1.5 text-sm font-medium text-violet-400 ring-1 ring-violet-500/30 transition-colors hover:bg-violet-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {user ? (submitting ? '등록 중...' : '등록') : '로그인'}
          </button>
        </div>
      </div>

      {/* 게시글 목록 */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          아직 게시글이 없습니다. 첫 의견을 남겨보세요!
        </p>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => {
            const profile = firstOrNull(post.profiles);
            const isMyPost = user?.id === post.user_id;
            return (
            <div key={post.id} className="rounded-xl border border-border bg-card/50 p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {profile?.nickname ?? '알 수 없음'}
                  </span>
                  {profile?.is_premium && (
                    <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400 ring-1 ring-amber-500/30">
                      PRO
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatRelativeTime(post.created_at)}
                </span>
              </div>

              <p className="whitespace-pre-wrap break-words text-sm text-foreground">
                {post.content}
              </p>

              <div className="mt-3 flex items-center gap-2">
                {/* 좋아요 - 본인 글은 비활성화 */}
                <button
                  onClick={() => handleLike(post.id)}
                  disabled={isMyPost}
                  title={isMyPost ? '본인 글에는 좋아요를 누를 수 없습니다' : undefined}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                    likedSet.has(post.id)
                      ? 'bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30'
                      : isMyPost
                        ? 'cursor-not-allowed text-muted-foreground/40'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-default',
                  )}
                >
                  <ThumbsUp size={12} />
                  <span>{post.like_count}</span>
                </button>

                {/* 싫어요 - 본인 글은 비활성화 */}
                <button
                  onClick={() => handleDislike(post.id)}
                  disabled={isMyPost}
                  title={isMyPost ? '본인 글에는 싫어요를 누를 수 없습니다' : undefined}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                    dislikedSet.has(post.id)
                      ? 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30'
                      : isMyPost
                        ? 'cursor-not-allowed text-muted-foreground/40'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-default',
                  )}
                >
                  <ThumbsDown size={12} />
                  <span>{post.dislike_count}</span>
                </button>

                {/* 댓글 */}
                <button
                  onClick={() => toggleComments(post.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                    openComments.has(post.id)
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  <MessageSquare size={12} />
                  <span>{post.comment_count}</span>
                </button>

                {isMyPost && (
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="ml-auto rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label="삭제"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              {openComments.has(post.id) && (
                <CommentSection postId={post.id} />
              )}
            </div>
            );
          })}

          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-4">
              {loadingMore && (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
