import { NextRequest, NextResponse } from 'next/server';

function parseNum(s: string | undefined): number {
  if (!s) return 0;
  return parseInt(s.replace(/,/g, ''), 10) || 0;
}

function todayKST(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function parseTradeDate(raw: string | null | undefined): string {
  if (!raw) return todayKST();
  return raw.replace(/\./g, '-').slice(0, 10);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  const res = await fetch(`https://m.stock.naver.com/api/stock/${code}/basic`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    cache: 'no-store',
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'upstream error' }, { status: res.status });
  }

  const d = await res.json();

  const open = parseNum(d.openPrice);
  const high = parseNum(d.highPrice);
  const low = parseNum(d.lowPrice);
  const close = parseNum(d.closePrice);
  const volume = parseNum(d.accumulatedTradingVolume);

  if (!open || !close) {
    return NextResponse.json({ error: 'no data' }, { status: 404 });
  }

  // localTradedAt can be "2025.05.02" or "2026-05-04T13:36:21+09:00".
  const date = parseTradeDate(d.localTradedAt);

  return NextResponse.json({ date, open, high, low, close, volume });
}
