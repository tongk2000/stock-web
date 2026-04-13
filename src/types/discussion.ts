export type Post = {
  id: string;
  stock_code: string;
  user_id: string;
  content: string;
  created_at: string;
  like_count: number;
  author?: {
    nickname: string;
    score: number;    // 예측 적중률 기반 점수
    is_premium: boolean;
  };
};

export type DiscussionRoom = {
  id: string;
  stock_code: string;
  name: string;
  is_official: boolean;  // 공식방 여부
  owner_id?: string;     // 유저 생성방의 경우 방장
  tags: string[];
};
