/**
 * 공용 뱃지 컴포넌트
 *
 * 앱 전역에서 반복적으로 쓰이던 인라인 span 마크업을 하나의 컴포넌트로 모읍니다.
 * 클래스 네임과 색상 조합을 한 곳에 두어 디자인이 어긋나지 않도록 합니다.
 */

import { cn } from '@/lib/utils';

/**
 * 프리미엄 유저 배지.
 *
 * 게시글/댓글 작성자 닉네임 옆에 붙습니다.
 * size 변형:
 *   - 'sm' : 피드/상세 (기본). 10px, 가로 패딩 1.5
 *   - 'xs' : 댓글. 9px, 더 타이트한 패딩
 */
export function PremiumBadge({
  size = 'sm',
  className,
}: {
  size?: 'xs' | 'sm';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'shrink-0 rounded font-semibold text-amber-400 ring-1 ring-amber-500/30 bg-amber-500/20',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-1 py-[1px] text-[9px]',
        className,
      )}
    >
      PRO
    </span>
  );
}

/**
 * 시장 구분 배지 (KOSPI / KOSDAQ).
 *
 * 랭킹 테이블과 검색 결과에서 공통으로 사용합니다.
 * KOSPI=파랑, KOSDAQ=초록 톤을 라이트/다크 모두에서 자연스럽게 맞춥니다.
 */
export function MarketBadge({
  market,
  className,
}: {
  market: 'KOSPI' | 'KOSDAQ';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold',
        market === 'KOSPI'
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
        className,
      )}
    >
      {market}
    </span>
  );
}
