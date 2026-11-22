/**
 * GET /api/stocks/[code]/disclosures
 *
 * 종목 상세 "공시" 탭 — Naver 종목 공시 목록(최근 20건)을 응답합니다.
 * 본문은 Naver 모바일 공시 상세 페이지로 링크합니다.
 */

import { NextResponse } from 'next/server';
import { fetchNaverJson, isStockCode } from '@/lib/naver';

type NaverDisclosure = {
  disclosureId: number;
  title: string;
  datetime: string;
  author: string;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  if (!isStockCode(code)) {
    return NextResponse.json({ error: 'invalid stock code' }, { status: 400 });
  }

  const rows = await fetchNaverJson<NaverDisclosure[]>(
    `/stock/${code}/disclosure?pageSize=20&page=1`,
    300,
  );
  if (!rows) {
    return NextResponse.json({ error: 'upstream failed' }, { status: 502 });
  }

  const data = rows.map((r) => ({
    id: r.disclosureId,
    title: r.title,
    source: r.author,
    publishedAt: `${r.datetime}+09:00`,
    url: `https://m.stock.naver.com/domestic/stock/${code}/notice/${r.disclosureId}`,
  }));

  return NextResponse.json({ data });
}
