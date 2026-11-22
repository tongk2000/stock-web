/**
 * CommentSection
 *
 * 게시글 하나에 대한 댓글/답글 트리. 토론방 피드와 게시글 상세 페이지에서 모두 사용합니다.
 *
 * 구조:
 *   - 데이터는 평탄화되어 있습니다 — 답글의 `parent_id`는 항상 최상위 댓글의 id를 가리킵니다.
 *     (대댓글의 대댓글도 같은 부모로 묶음 → 깊이 1단계만 렌더링)
 *   - 답글 작성 시 `reply_to_user_id`로 멘션 대상을 기록해 "@nickname" 표시에 사용합니다.
 *
 * 실시간:
 *   - INSERT: 본인이 등록한 row는 insert().select()로 즉시 받아 미리 추가, 실시간 핸들러는 id로 dedup.
 *   - DELETE: payload.old.id 만 오므로 그 id를 prev에서 걸러냅니다.
 *
 * 조인 정규화:
 *   - profiles 외래키는 Supabase가 객체 1개 또는 1요소 배열로 줄 수 있어 `firstOrNull`로 통일.
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { firstOrNull } from '@/lib/supabase/normalize';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/format';

type CommentRow = {
  id: string;
  post_id: string;
  parent_id: string | null;
  user_id: string;
  reply_to_user_id: string | null;
  content: string;
  created_at: string;
  profiles: { nickname: string; is_premium: boolean }[] | { nickname: string; is_premium: boolean } | null;
  reply_to: { nickname: string }[] | { nickname: string } | null;
};

type Comment = {
  id: string;
  post_id: string;
  parent_id: string | null;
  user_id: string;
  reply_to_user_id: string | null;
  reply_to_nickname: string | null;
  content: string;
  created_at: string;
  nickname: string;
  is_premium: boolean;
};

interface Props {
  postId: string;
}

const SELECT_COLS =
  'id, post_id, parent_id, user_id, reply_to_user_id, content, created_at, ' +
  'profiles!comments_user_id_fkey(nickname, is_premium), ' +
  'reply_to:profiles!comments_reply_to_user_id_fkey(nickname)';

function normalize(row: CommentRow): Comment {
  const p = firstOrNull(row.profiles);
  const r = firstOrNull(row.reply_to);
  return {
    id: row.id,
    post_id: row.post_id,
    parent_id: row.parent_id,
    user_id: row.user_id,
    reply_to_user_id: row.reply_to_user_id,
    reply_to_nickname: r?.nickname ?? null,
    content: row.content,
    created_at: row.created_at,
    nickname: p?.nickname ?? '알 수 없음',
    is_premium: p?.is_premium ?? false,
  };
}

export default function CommentSection({ postId }: Props) {
  const { user, signInWithGoogle } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLoading(true);
    const supabase = createClient();
    supabase
      .from('comments')
      .select(SELECT_COLS)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setComments(((data as unknown as CommentRow[]) ?? []).map(normalize));
        setLoading(false);
      });
  }, [postId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`comments:${postId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
        async (payload) => {
          const { data } = await supabase
            .from('comments')
            .select(SELECT_COLS)
            .eq('id', payload.new.id)
            .single();
          if (!data) return;
          const next = normalize(data as unknown as CommentRow);
          setComments((prev) => (prev.some((c) => c.id === next.id) ? prev : [...prev, next]));
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'comments' },
        (payload) => {
          setComments((prev) => prev.filter((c) => c.id !== payload.old.id));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [postId]);

  const handleSubmit = useCallback(async () => {
    if (!user) {
      signInWithGoogle();
      return;
    }
    if (!content.trim() || submitting) return;
    setSubmitting(true);

    // 대댓글은 모두 최상위 댓글의 자식으로 평탄화
    const parentId = replyTarget
      ? (replyTarget.parent_id ?? replyTarget.id)
      : null;
    const replyToUserId = replyTarget && replyTarget.parent_id
      ? replyTarget.user_id
      : null;

    const supabase = createClient();
    // 삽입된 행을 조인과 함께 되돌려받아 즉시 목록에 반영 (realtime INSERT 핸들러는 id로 dedup).
    const { data: inserted } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        parent_id: parentId,
        user_id: user.id,
        reply_to_user_id: replyToUserId,
        content: content.trim(),
      })
      .select(SELECT_COLS)
      .single();

    if (inserted) {
      const next = normalize(inserted as unknown as CommentRow);
      setComments((prev) => (prev.some((c) => c.id === next.id) ? prev : [...prev, next]));
    }

    setContent('');
    setReplyTarget(null);
    setSubmitting(false);
  }, [user, content, submitting, postId, replyTarget, signInWithGoogle]);

  const handleDelete = useCallback(async (commentId: string) => {
    if (!user) return;
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    const supabase = createClient();
    await supabase.from('comments').delete().eq('id', commentId).eq('user_id', user.id);
  }, [user]);

  const startReply = useCallback((target: Comment) => {
    if (!user) {
      signInWithGoogle();
      return;
    }
    setReplyTarget(target);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [user, signInWithGoogle]);

  const topLevel = comments.filter((c) => c.parent_id === null);
  const repliesByParent = new Map<string, Comment[]>();
  for (const c of comments) {
    if (c.parent_id) {
      const list = repliesByParent.get(c.parent_id) ?? [];
      list.push(c);
      repliesByParent.set(c.parent_id, list);
    }
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      {loading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : topLevel.length === 0 ? (
        <p className="py-2 text-center text-xs text-muted-foreground">
          첫 댓글을 남겨보세요.
        </p>
      ) : (
        <ul className="space-y-3 pl-2">
          {topLevel.map((c) => {
            const replies = repliesByParent.get(c.id) ?? [];
            return (
              <li key={c.id}>
                <CommentItem
                  comment={c}
                  canDelete={user?.id === c.user_id}
                  canReply={true}
                  onReply={() => startReply(c)}
                  onDelete={() => handleDelete(c.id)}
                />
                {replies.length > 0 && (
                  <ul className="ml-4 mt-2 space-y-2 border-l border-muted-foreground/25 pl-3">
                    {replies.map((r) => (
                      <li key={r.id}>
                        <CommentItem
                          comment={r}
                          canDelete={user?.id === r.user_id}
                          canReply={true}
                          onReply={() => startReply(r)}
                          onDelete={() => handleDelete(r.id)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* 입력 */}
      <div className="mt-3">
        {user && replyTarget && (
          <div className="mb-1.5 flex items-center justify-between rounded-md bg-accent/50 px-2.5 py-1.5 text-xs text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">@{replyTarget.nickname}</span>
              님에게 답글
            </span>
            <button
              onClick={() => setReplyTarget(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              취소
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => { if (!user) signInWithGoogle(); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
            }}
            placeholder={
              !user
                ? '로그인 후 댓글을 작성할 수 있습니다. 클릭하여 로그인'
                : replyTarget ? '답글을 입력하세요' : '댓글을 입력하세요'
            }
            className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            rows={2}
            maxLength={500}
            readOnly={!user}
          />
          <button
            onClick={handleSubmit}
            disabled={user ? (!content.trim() || submitting) : false}
            className="self-end rounded-lg bg-blue-500/20 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30 transition-colors hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {user ? (submitting ? '등록 중' : '등록') : '로그인'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  canDelete,
  canReply,
  onReply,
  onDelete,
}: {
  comment: Comment;
  canDelete: boolean;
  canReply: boolean;
  onReply: () => void;
  onDelete: () => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-foreground">{comment.nickname}</span>
        {comment.is_premium && (
          <span className="rounded bg-amber-500/20 px-1 py-[1px] text-[9px] font-semibold text-amber-400 ring-1 ring-amber-500/30">
            PRO
          </span>
        )}
        <span className="text-[11px] text-muted-foreground">
          {formatRelativeTime(comment.created_at)}
        </span>
      </div>
      <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-foreground">
        {comment.reply_to_nickname && (
          <span className="mr-1 font-medium text-blue-600 dark:text-blue-400">
            @{comment.reply_to_nickname}
          </span>
        )}
        {comment.content}
      </p>
      <div className="mt-1 flex items-center gap-1">
        {canReply && (
          <button
            onClick={onReply}
            className={cn(
              'rounded px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground',
              'transition-colors hover:bg-accent hover:text-foreground',
            )}
          >
            답글
          </button>
        )}
        {canDelete && (
          <button
            onClick={onDelete}
            className="ml-auto rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            aria-label="삭제"
          >
            <Trash2 size={11} />
          </button>
        )}
      </div>
    </div>
  );
}
