import { NextRequest, NextResponse } from 'next/server';

const MAX_CODES = 50;

function parseNum(value: unknown): number {
  if (typeof value !== 'string') return 0;
  return parseInt(value.replace(/[^\d-]/g, ''), 10) || 0;
}

function parseFloatNum(value: unknown): number {
  if (typeof value !== 'string') return 0;
  return Number.parseFloat(value.replace(/,/g, '')) || 0;
}

function parseTradeDate(raw: string | null | undefined): string {
  return (raw ?? '').replace(/\./g, '-').slice(0, 10);
}

async function fetchPrice(code: string) {
  const res = await fetch(`https://m.stock.naver.com/api/stock/${code}/basic`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    cache: 'no-store',
  });

  if (!res.ok) return null;

  const data = await res.json();
  const close = parseNum(data.closePrice);
  if (!close) return null;

  return {
    close,
    change: parseNum(data.compareToPreviousClosePrice),
    changeRate: parseFloatNum(data.fluctuationsRatio),
    date: parseTradeDate(data.localTradedAt),
  };
}

export async function GET(req: NextRequest) {
  const codes = (req.nextUrl.searchParams.get('codes') ?? '')
    .split(',')
    .map((code) => code.trim())
    .filter((code) => /^\d{6}$/.test(code))
    .slice(0, MAX_CODES);

  if (codes.length === 0) {
    return NextResponse.json({ prices: {} });
  }

  const entries = await Promise.all(
    codes.map(async (code) => [code, await fetchPrice(code)] as const),
  );

  const prices = Object.fromEntries(entries.filter((entry) => entry[1] !== null));

  return NextResponse.json({ prices });
}
