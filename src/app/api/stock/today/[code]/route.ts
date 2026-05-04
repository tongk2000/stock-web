import { NextRequest, NextResponse } from 'next/server';

function parseNum(value: unknown): number {
  if (typeof value !== 'string') return 0;
  return parseInt(value.replace(/[^\d-]/g, ''), 10) || 0;
}

function todayKST(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function parseTradeDate(raw: string | null | undefined): string {
  if (!raw) return todayKST();
  return raw.replace(/\./g, '-').slice(0, 10);
}

type NaverInfo = {
  code?: string;
  value?: string;
};

function getInfoNum(infos: NaverInfo[] | undefined, code: string): number {
  return parseNum(infos?.find((info) => info.code === code)?.value);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  const headers = { 'User-Agent': 'Mozilla/5.0' };
  const res = await fetch(`https://m.stock.naver.com/api/stock/${code}/basic`, {
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'upstream error' }, { status: res.status });
  }

  const d = await res.json();

  let open = parseNum(d.openPrice);
  let high = parseNum(d.highPrice);
  let low = parseNum(d.lowPrice);
  const close = parseNum(d.closePrice);
  let volume = parseNum(d.accumulatedTradingVolume);

  if (!open || !high || !low || !volume) {
    const integrationRes = await fetch(`https://m.stock.naver.com/api/stock/${code}/integration`, {
      headers,
      cache: 'no-store',
    });

    if (integrationRes.ok) {
      const integration = await integrationRes.json();
      const infos = integration.totalInfos as NaverInfo[] | undefined;
      open ||= getInfoNum(infos, 'openPrice');
      high ||= getInfoNum(infos, 'highPrice');
      low ||= getInfoNum(infos, 'lowPrice');
      volume ||= getInfoNum(infos, 'accumulatedTradingVolume');
    }
  }

  if (!open || !close) {
    return NextResponse.json({ error: 'no data' }, { status: 404 });
  }

  high ||= Math.max(open, close);
  low ||= Math.min(open, close);

  // localTradedAt can be "2025.05.02" or "2026-05-04T13:36:21+09:00".
  const date = parseTradeDate(d.localTradedAt);

  return NextResponse.json({ date, open, high, low, close, volume });
}
