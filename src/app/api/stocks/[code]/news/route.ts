/**
 * GET /api/stocks/[code]/news
 *
 * 종목 상세 "뉴스" 탭 — Naver 종목 뉴스(최근 20개 묶음)를 평탄화해 응답합니다.
 * 같은 사건의 기사들은 한 묶음으로 오므로 묶음별 대표 기사(첫 번째)만 사용합니다.
 */

import { NextResponse } from 'next/server';
import { fetchNaverJson, isStockCode } from '@/lib/naver';

type NaverNewsItem = {
  id: string;
  officeName: string;
  datetime: string;
  title: string;
  body?: string;
  imageOriginLink?: string;
  mobileNewsUrl: string;
};

type NaverNewsCluster = {
  total: number;
  items: NaverNewsItem[];
};

/** "202611221100" → "2026-11-22T11:00:00+09:00" */
function toIsoDateTime(dt: string): string {
  return `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}T${dt.slice(8, 10)}:${dt.slice(10, 12)}:00+09:00`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  if (!isStockCode(code)) {
    return NextResponse.json({ error: 'invalid stock code' }, { status: 400 });
  }

  const clusters = await fetchNaverJson<NaverNewsCluster[]>(
    `/news/stock/${code}?pageSize=20&page=1`,
    300,
  );
  if (!clusters) {
    return NextResponse.json({ error: 'upstream failed' }, { status: 502 });
  }

  const data = clusters
    .map((c) => c.items?.[0])
    .filter((item): item is NaverNewsItem => Boolean(item))
    .map((item) => ({
      id: item.id,
      title: item.title,
      summary: item.body ?? null,
      press: item.officeName,
      publishedAt: toIsoDateTime(item.datetime),
      imageUrl: item.imageOriginLink ?? null,
      url: item.mobileNewsUrl,
    }));

  return NextResponse.json({ data });
}
