/**
 * GET /api/stock/today/[code]
 *
 * 단일 종목의 "오늘 캔들"을 Naver 모바일 시세 API에서 가져와 표준화된 모양으로 반환합니다.
 *
 * 응답: { date, open, high, low, close, volume } 또는 { error } (404/upstream 오류).
 *
 * 보강 로직: `/basic` 엔드포인트가 시가/고가/저가/거래량을 비워서 보내는 경우가 있어
 * `/integration` 응답의 `totalInfos`로 빈 필드만 메웁니다. 그래도 부족하면 시가/종가 기준
 * min/max로 폴백합니다 (장 시작 직후 등 distinct 값이 없을 때 대비).
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseInt0 } from '@/lib/parsers';
import { kstToday, parseTradeDate as parseTradeDateBase } from '@/lib/time';

type NaverInfo = {
  code?: string;
  value?: string;
};

/** totalInfos 배열에서 특정 코드의 숫자 필드를 꺼냅니다. */
function getInfoNum(infos: NaverInfo[] | undefined, code: string): number {
  return parseInt0(infos?.find((info) => info.code === code)?.value);
}

/** 빈 값이면 오늘 KST 날짜로 폴백한다는 점만 빼면 lib/time의 동작과 동일. */
function parseTradeDateOrToday(raw: string | null | undefined): string {
  if (!raw) return kstToday();
  return parseTradeDateBase(raw);
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

  let open = parseInt0(d.openPrice);
  let high = parseInt0(d.highPrice);
  let low = parseInt0(d.lowPrice);
  const close = parseInt0(d.closePrice);
  let volume = parseInt0(d.accumulatedTradingVolume);

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

  // 동시 호가 거의 없는 경우(상한가 직행 등) high/low가 비어 올 수 있어
  // 시가/종가의 min/max로 폴백합니다.
  high ||= Math.max(open, close);
  low ||= Math.min(open, close);

  // localTradedAt은 "2025.05.02" 또는 "2026-05-04T13:36:21+09:00" 두 형태가 모두 옴.
  const date = parseTradeDateOrToday(d.localTradedAt);

  return NextResponse.json({ date, open, high, low, close, volume });
}
