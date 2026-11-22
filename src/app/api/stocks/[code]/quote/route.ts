/**
 * GET /api/stocks/[code]/quote
 *
 * 종목 상세 "시세" 탭 — Naver 일별 시세(최근 20영업일)를 숫자로 정규화해 응답합니다.
 */

import { NextResponse } from 'next/server';
import { fetchNaverJson, isStockCode } from '@/lib/naver';
import { parseFloat0, parseInt0 } from '@/lib/parsers';

type NaverPrice = {
  localTradedAt: string;
  closePrice: string;
  compareToPreviousClosePrice: string;
  fluctuationsRatio: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  accumulatedTradingVolume: number | string;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  if (!isStockCode(code)) {
    return NextResponse.json({ error: 'invalid stock code' }, { status: 400 });
  }

  const rows = await fetchNaverJson<NaverPrice[]>(`/stock/${code}/price?pageSize=20&page=1`, 60);
  if (!rows) {
    return NextResponse.json({ error: 'upstream failed' }, { status: 502 });
  }

  const data = rows.map((r) => ({
    date: r.localTradedAt,
    close: parseInt0(r.closePrice),
    change: parseInt0(r.compareToPreviousClosePrice),
    changeRate: parseFloat0(r.fluctuationsRatio),
    open: parseInt0(r.openPrice),
    high: parseInt0(r.highPrice),
    low: parseInt0(r.lowPrice),
    volume: typeof r.accumulatedTradingVolume === 'number'
      ? r.accumulatedTradingVolume
      : parseInt0(r.accumulatedTradingVolume),
  }));

  return NextResponse.json({ data });
}
