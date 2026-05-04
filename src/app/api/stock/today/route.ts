/**
 * GET /api/stock/today?codes=005930,000660,...
 *
 * 여러 종목의 오늘 종가/등락을 한 번에 조회합니다 (즐겨찾기 사이드바용 일괄 폴링).
 *
 * 응답: { prices: { [code]: { close, change, changeRate, date } } } — 실패한 종목은 키가 빠짐.
 * 입력 검증: 6자리 숫자 종목코드만 허용하고 LIMITS.BATCH_PRICE_CODES개로 자릅니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { LIMITS } from '@/lib/constants';
import { parseFloat0, parseInt0 } from '@/lib/parsers';
import { parseTradeDate } from '@/lib/time';

async function fetchPrice(code: string) {
  const res = await fetch(`https://m.stock.naver.com/api/stock/${code}/basic`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    cache: 'no-store',
  });

  if (!res.ok) return null;

  const data = await res.json();
  const close = parseInt0(data.closePrice);
  if (!close) return null;

  return {
    close,
    change: parseInt0(data.compareToPreviousClosePrice),
    changeRate: parseFloat0(data.fluctuationsRatio),
    date: parseTradeDate(data.localTradedAt),
  };
}

export async function GET(req: NextRequest) {
  const codes = (req.nextUrl.searchParams.get('codes') ?? '')
    .split(',')
    .map((code) => code.trim())
    .filter((code) => /^\d{6}$/.test(code))
    .slice(0, LIMITS.BATCH_PRICE_CODES);

  if (codes.length === 0) {
    return NextResponse.json({ prices: {} });
  }

  const entries = await Promise.all(
    codes.map(async (code) => [code, await fetchPrice(code)] as const),
  );

  const prices = Object.fromEntries(entries.filter((entry) => entry[1] !== null));

  return NextResponse.json({ prices });
}
