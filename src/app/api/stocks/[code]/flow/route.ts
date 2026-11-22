/**
 * GET /api/stocks/[code]/flow
 *
 * 종목 상세 "수급현황" 탭 — Naver 투자자별 순매수(개인/외국인/기관, 최근 20영업일)를
 * 숫자로 정규화해 응답합니다.
 */

import { NextResponse } from 'next/server';
import { fetchNaverJson, isStockCode } from '@/lib/naver';
import { parseFloat0, parseInt0 } from '@/lib/parsers';

type NaverTrend = {
  bizdate: string;
  foreignerPureBuyQuant: string;
  foreignerHoldRatio: string;
  organPureBuyQuant: string;
  individualPureBuyQuant: string;
  closePrice: string;
  compareToPreviousClosePrice: string;
  compareToPreviousPrice?: { name?: string };
  accumulatedTradingVolume: string;
};

/** "20261120" → "2026-11-20" */
function toIsoDate(bizdate: string): string {
  return `${bizdate.slice(0, 4)}-${bizdate.slice(4, 6)}-${bizdate.slice(6, 8)}`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  if (!isStockCode(code)) {
    return NextResponse.json({ error: 'invalid stock code' }, { status: 400 });
  }

  const rows = await fetchNaverJson<NaverTrend[]>(`/stock/${code}/trend?pageSize=20`, 60);
  if (!rows) {
    return NextResponse.json({ error: 'upstream failed' }, { status: 502 });
  }

  const data = rows.map((r) => {
    // 전일대비 금액은 부호 없이 오는 경우가 있어 방향 코드로 부호를 맞춘다
    const change = Math.abs(parseInt0(r.compareToPreviousClosePrice));
    const direction = r.compareToPreviousPrice?.name;
    const falling = direction === 'FALLING' || direction === 'LOWER_LIMIT';
    return {
      date: toIsoDate(r.bizdate),
      close: parseInt0(r.closePrice),
      change: falling ? -change : change,
      volume: parseInt0(r.accumulatedTradingVolume),
      individual: parseInt0(r.individualPureBuyQuant),
      foreign: parseInt0(r.foreignerPureBuyQuant),
      institution: parseInt0(r.organPureBuyQuant),
      foreignHoldRatio: parseFloat0(r.foreignerHoldRatio),
    };
  });

  return NextResponse.json({ data });
}
