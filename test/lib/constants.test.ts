import { describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '@/lib/constants';

// 이 값들은 이미 배포된 사용자의 브라우저 저장소에 박혀 있다. 바꾸면 기존 사용자의 설정·즐겨찾기가 사라진다.
describe('STORAGE_KEYS 리터럴', () => {
  it('값이 바뀌지 않았다', () => {
    expect(STORAGE_KEYS).toEqual({
      THEME: 'vite-ui-theme',
      FAVORITES: 'stock-favorites',
      INDICATORS: 'stock-indicators',
      POST_AUTH_NEXT: 'post-auth-next',
    });
  });
});
