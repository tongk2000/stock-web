/**
 * 섹터 드릴다운 (서버 컴포넌트)
 *
 * URL: /rankings/sectors/[name] (name은 URL-encoded KRX 업종명)
 *
 * 해당 섹터에 속한 종목들의 오늘 등락률/거래대금을 보여줍니다.
 * 등락률 내림차순 정렬.
 */

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import RankingTable from '@/components/stock/RankingTable';
import { getSectorConstituents } from '@/lib/rankings';

export const revalidate = 60;

interface Props {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { name } = await params;
  return { title: `${decodeURIComponent(name)} 섹터` };
}

export default async function SectorDetailPage({ params }: Props) {
  const { name: encoded } = await params;
  const sector = decodeURIComponent(encoded);
  const rows = await getSectorConstituents(sector);

  return (
    <main className="min-h-screen bg-background px-2 py-6 sm:px-6 sm:py-8 font-sans">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/rankings/sectors"
          className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={12} />
          <span>섹터 랭킹</span>
        </Link>

        <h1 className="mb-1 text-2xl font-bold text-foreground">{sector}</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          해당 섹터에 속한 종목의 오늘 등락률.
        </p>

        <RankingTable
          rows={rows}
          metricHeader="등락률"
          emptyMessage="섹터에 속한 종목 데이터가 없습니다."
        />
      </div>
    </main>
  );
}
