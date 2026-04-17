'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { ThumbsUp, Trash2, MessageSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import CommentSection from './CommentSection';

type PostWithAuthor = {
  id: string;
  content: string;
  created_at: string;
  like_count: number;
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

const PAGE_SIZE = 30;

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export default function DiscussionSection({ roomId, stockCode }: Props) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const toggleComments = useCallback((postId: string) => {
    setOpenComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }, []);

  // 게시글 목록 조회
  useEffect(() => {
    setLoading(true);
    const supabase = createClient();
    supabase
      .from('posts')
      .select('id, content, created_at, like_count, comment_count, user_id, profiles!posts_user_id_fkey(nickname, score, is_premium)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)
      .then(({ data }) => {
        setPosts((data as PostWithAuthor[]) ?? []);
        setLoading(false);
      });
  }, [roomId]);

  // 현재 유저의 좋아요 목록
  useEffect(() => {
    if (!user) { setLikedSet(new Set()); return; }
    const supabase = createClient();
    supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        setLikedSet(new Set(data?.map((r) => r.post_id) ?? []));
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
            .select('id, content, created_at, like_count, comment_count, user_id, profiles!posts_user_id_fkey(nickname, score, is_premium)')
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
                ? { ...p, like_count: payload.new.like_count, comment_count: payload.new.comment_count }
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
    if (!user || !content.trim() || submitting) return;
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
  }, [user, content, submitting, roomId, stockCode]);

  const handleLike = useCallback(async (postId: string) => {
    if (!user) return;
    const isLiked = likedSet.has(postId);
    // 낙관적 업데이트
    setLikedSet((prev) => {
      const next = new Set(prev);
      isLiked ? next.delete(postId) : next.add(postId);
      return next;
    });
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, like_count: p.like_count + (isLiked ? -1 : 1) } : p,
      ),
    );
    const supabase = createClient();
    if (isLiked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
    }
  }, [user, likedSet]);

  const handleDelete = useCallback(async (postId: string) => {
    if (!user) return;
    setPosts((prev) => prev.filter((p) => p.id !== postId)); // 낙관적 삭제
    const supabase = createClient();
    await supabase.from('posts').delete().eq('id', postId).eq('user_id', user.id);
  }, [user]);

  return (
    <div className="mt-10">
      <h2 className="mb-4 text-lg font-semibold text-foreground">토론방</h2>

      {/* 글 작성 폼 */}
      {user ? (
        <div className="mb-5 rounded-xl border border-border bg-card/50 p-4">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
            }}
            placeholder="의견을 남겨보세요... (Ctrl+Enter로 등록)"
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            rows={3}
            maxLength={1000}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{content.length} / 1000</span>
            <button
              onClick={handleSubmit}
              disabled={!content.trim() || submitting}
              className="rounded-lg bg-violet-500/20 px-4 py-1.5 text-sm font-medium text-violet-400 ring-1 ring-violet-500/30 transition-colors hover:bg-violet-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? '등록 중...' : '등록'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-5 rounded-xl border border-border bg-card/50 px-4 py-3 text-sm text-muted-foreground">
          로그인 후 의견을 남길 수 있습니다.
        </div>
      )}

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
            const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
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
                <button
                  onClick={() => handleLike(post.id)}
                  disabled={!user}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                    likedSet.has(post.id)
                      ? 'bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-default',
                  )}
                >
                  <ThumbsUp size={12} />
                  <span>{post.like_count}</span>
                </button>

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

                {user?.id === post.user_id && (
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
        </div>
      )}
    </div>
  );
}
