/**
 * 토론글 좋아요/싫어요 mutation 헬퍼
 *
 * 같은 supabase 호출 4종(좋아요/싫어요 × insert/delete)이 PostLikeButtons,
 * DiscussionSection 두 곳에서 반복돼 있어 한 곳으로 모았습니다.
 *
 * 카운트 자체는 DB 트리거가 posts 테이블에 반영하므로 클라이언트는 row 추가/삭제만 합니다.
 * 호출부의 optimistic UI 업데이트는 그대로 두고, 실제 네트워크 호출만 이쪽으로 위임하세요.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type ReactionKind = 'like' | 'dislike';

const TABLE: Record<ReactionKind, 'post_likes' | 'post_dislikes'> = {
  like: 'post_likes',
  dislike: 'post_dislikes',
};

/**
 * 특정 게시글에 대한 사용자의 좋아요/싫어요를 추가합니다.
 * 토글 로직(이미 같은 reaction이 있을 때의 동작)은 호출부 책임.
 */
export function addReaction(
  supabase: SupabaseClient,
  postId: string,
  userId: string,
  kind: ReactionKind,
) {
  return supabase.from(TABLE[kind]).insert({ post_id: postId, user_id: userId });
}

/** 특정 게시글에 대한 사용자의 좋아요/싫어요를 제거합니다. */
export function removeReaction(
  supabase: SupabaseClient,
  postId: string,
  userId: string,
  kind: ReactionKind,
) {
  return supabase
    .from(TABLE[kind])
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId);
}
