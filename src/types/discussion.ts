/**
 * 토론방 관련 타입 정의
 *
 * Supabase discussion_rooms / posts 테이블과 대응합니다.
 */

/** posts 테이블 — 토론방 게시글 */
export type Post = {
  id: string;
  stock_code: string;
  user_id: string;
  content: string;       // 최대 1000자
  created_at: string;
  like_count: number;    // post_likes 테이블 트리거로 자동 동기화
  author?: {
    nickname: string;
    score: number;       // 예측 적중률 기반 점수
    is_premium: boolean;
  };
};

/** discussion_rooms 테이블 — 종목별 토론방 */
export type DiscussionRoom = {
  id: string;
  stock_code: string;
  name: string;
  is_official: boolean;  // 공식방 여부 (종목 추가 시 자동 생성)
  owner_id?: string;     // 유저 생성방의 경우 방장 ID
  tags: string[];
};

/**
 * 피드 카드 렌더링에 필요한 최소 게시글 필드.
 * DiscussionFeed / FavoriteDiscussionFeed / 검색 결과에서 공통으로 사용합니다.
 */
export type PostListItem = {
  id: string;
  content: string;
  created_at: string;
  like_count: number;
  stock_code: string;
  user_id: string;
};

/** 피드/댓글에서 공통으로 쓰는 최소 프로필 정보. */
export type ProfileInfo = { nickname: string; is_premium: boolean };
