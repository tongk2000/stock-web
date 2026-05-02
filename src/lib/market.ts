import { unstable_cache } from 'next/cache';

function kstToday(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function isWeekend(): boolean {
  const day = new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCDay();
  return day === 0 || day === 6;
}

// 삼성전자 기준으로 공휴일 여부 확인 — 날짜 단위 캐시 (첫 요청만 Naver API 호출)
const _checkTradingDay = unstable_cache(
  async (date: string): Promise<boolean> => {
    try {
      const res = await fetch('https://m.stock.naver.com/api/stock/005930/basic', {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        cache: 'no-store',
      });
      if (!res.ok) return true;
      const d = await res.json();
      const marketDate = (d.localTradedAt ?? '').replace(/\./g, '-');
      return marketDate === date;
    } catch {
      return true; // 확인 불가 시 개장으로 간주
    }
  },
  ['market-trading-day'],
  { revalidate: 3600 },
);

export async function getIsTradingDay(): Promise<boolean> {
  if (isWeekend()) return false;
  return _checkTradingDay(kstToday());
}
