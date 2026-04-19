/**
 * RankingTabs
 *
 * 랭킹 상세 페이지에서 탭(?tab=...) 전환에 쓰는 서버 컴포넌트입니다.
 * 각 탭은 동일 경로의 다른 ?tab 값으로 이동하는 Link로 렌더링됩니다.
 */

import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Props<T extends string> {
  basePath: string;            // 예: "/rankings/volume"
  current: T;
  tabs: { value: T; label: string }[];
}

export default function RankingTabs<T extends string>({
  basePath,
  current,
  tabs,
}: Props<T>) {
  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      {tabs.map((t) => {
        const active = t.value === current;
        return (
          <Link
            key={t.value}
            href={`${basePath}?tab=${t.value}`}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card/50 text-muted-foreground hover:bg-accent/50 hover:text-foreground',
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
