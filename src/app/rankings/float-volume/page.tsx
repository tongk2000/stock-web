/**
 * 유동물량 대비 거래량 랭킹 (서버 컴포넌트)
 *
 * 오늘 거래량 ÷ 유동주식수가 큰 순 — "유동물량 대비 얼마나 손바뀜이 많았나".
 * 유동주식수(float_shares)는 KRX가 주요 지수 구성종목만 공식 유동비율(FFR)을
 * 제공하므로 지수 구성종목에 한해 수집되며, 비지수 종목은 랭킹에서 제외됩니다.
 */

import { Info } from 'lucide-react';
import RankingTable from '@/components/stock/RankingTable';
import { getFloatVolumeRanking } from '@/lib/rankings';

export const metadata = { title: '유동물량 대비 거래량' };
export const revalidate = 60;

export default async function FloatVolumeRankingPage() {
  const rows = await getFloatVolumeRanking();

  return (
    <main className="min-h-screen bg-background px-2 py-6 sm:px-6 sm:py-8 font-sans">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-1 text-2xl font-bold text-foreground">
          유동물량 대비 거래량
        </h1>
        <p className="mb-3 text-sm text-muted-foreground">
          오늘 거래량 ÷ 유동주식수. 유동물량 대비 손바뀜이 많은 종목 순.
        </p>

        <div className="mb-4 flex items-start gap-2 rounded-lg border border-border bg-card/50 px-3 py-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <p>
            유동주식수는 발행주식수 × 유동비율(WiseReport 기준, 매주 갱신)로
            계산합니다. 유동비율이 제공되지 않는 종목은 이 랭킹에서 제외됩니다.
          </p>
        </div>

        <RankingTable
          rows={rows}
          metricHeader="회전율"
          emptyMessage="아직 집계된 데이터가 없습니다. 유동주식수 수집이 필요합니다."
        />
      </div>
    </main>
  );
}
