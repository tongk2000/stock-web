'use client';

/**
 * PostLikeButtons
 *
 * 토론글 상세 페이지용 좋아요·싫어요·댓글수 표시 + 상호작용 버튼.
 * - 서버에서 받은 초기 카운트를 시작 값으로 쓰고, 클릭 시 optimistic 업데이트.
 * - 본인 글은 좋아요/싫어요 비활성화.
 * - posts 테이블 UPDATE 실시간 구독으로 다른 사용자의 투표를 반영.
 */

import { useCallback, useEffect, useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { addReaction, removeReaction } from '@/lib/post-reactions';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface Props {
  postId: string;
  authorId: string;
  initialLikes: number;
  initialDislikes: number;
  initialComments: number;
}

export default function PostLikeButtons({
  postId,
  authorId,
  initialLikes,
  initialDislikes,
  initialComments,
}: Props) {
  const { user } = useAuth();
  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [comments, setComments] = useState(initialComments);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const isMyPost = user?.id === authorId;

  // 현재 유저의 좋아요 / 싫어요 여부 조회
  useEffect(() => {
    if (!user) {
      setLiked(false);
      setDisliked(false);
      return;
    }
    const supabase = createClient();
    supabase
      .from('post_likes')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setLiked(!!data));
    supabase
      .from('post_dislikes')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setDisliked(!!data));
  }, [user, postId]);

  // posts UPDATE 실시간 구독 (다른 사용자의 카운트 변화 반영)
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`post-detail:${postId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'posts', filter: `id=eq.${postId}` },
        (payload) => {
          const n = payload.new as {
            like_count: number;
            dislike_count: number;
            comment_count: number;
          };
          setLikes(n.like_count);
          setDislikes(n.dislike_count);
          setComments(n.comment_count);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  const handleLike = useCallback(async () => {
    if (!user || isMyPost) return;
    const supabase = createClient();
    if (liked) {
      setLiked(false);
      setLikes((n) => n - 1);
      await removeReaction(supabase, postId, user.id, 'like');
    } else {
      setLiked(true);
      setLikes((n) => n + 1);
      if (disliked) {
        setDisliked(false);
        setDislikes((n) => n - 1);
        await removeReaction(supabase, postId, user.id, 'dislike');
      }
      await addReaction(supabase, postId, user.id, 'like');
    }
  }, [user, isMyPost, liked, disliked, postId]);

  const handleDislike = useCallback(async () => {
    if (!user || isMyPost) return;
    const supabase = createClient();
    if (disliked) {
      setDisliked(false);
      setDislikes((n) => n - 1);
      await removeReaction(supabase, postId, user.id, 'dislike');
    } else {
      setDisliked(true);
      setDislikes((n) => n + 1);
      if (liked) {
        setLiked(false);
        setLikes((n) => n - 1);
        await removeReaction(supabase, postId, user.id, 'like');
      }
      await addReaction(supabase, postId, user.id, 'dislike');
    }
  }, [user, isMyPost, liked, disliked, postId]);

  return (
    <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
      <button
        onClick={handleLike}
        disabled={!user || isMyPost}
        title={isMyPost ? '본인 글에는 좋아요를 누를 수 없습니다' : undefined}
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
          liked
            ? 'bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30'
            : isMyPost
              ? 'cursor-not-allowed text-muted-foreground/40'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-default',
        )}
      >
        <ThumbsUp size={12} />
        <span>{likes}</span>
      </button>

      <button
        onClick={handleDislike}
        disabled={!user || isMyPost}
        title={isMyPost ? '본인 글에는 싫어요를 누를 수 없습니다' : undefined}
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
          disliked
            ? 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30'
            : isMyPost
              ? 'cursor-not-allowed text-muted-foreground/40'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-default',
        )}
      >
        <ThumbsDown size={12} />
        <span>{dislikes}</span>
      </button>

      <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground">
        <MessageSquare size={12} />
        <span>{comments}</span>
      </div>
    </div>
  );
}
