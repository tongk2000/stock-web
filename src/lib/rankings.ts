/**
 * 랭킹 페이지(/rankings/*) 서버 쿼리.
 *
 * 각 함수는 RSC에서 호출되어 RankingTable에 바로 넣을 수 있는
 * `RankingTableRow[]`를 반환합니다.
 *
 * Supabase view (v_daily_change / v_latest_financials / v_52w_extremes)는
 * supabase/migrations/20260419000001_add_ranking_views.sql 에 정의돼 있습니다.
 */

import { createClient } from '@/lib/supabase/server';
import { RANKING } from '@/lib/constants';
import { formatKRWCompact, formatNumber, formatPercent } from '@/lib/format';
import type { RankingTableRow } from '@/components/stock/RankingTable';
import type {
  DailyChangeRow,
  ExtremesRow,
  LatestFinancialsRow,
  MoversTab,
  ValuationTab,
  VolumeTab,
} from '@/types/ranking';

type StockMeta = { code: string; name: string; market: 'KOSPI' | 'KOSDAQ' };

/** 종목 코드 리스트에 대응하는 이름/시장 메타를 한 번에 조회해 Map으로 돌려줍니다. */
async function fetchStockMeta(
  codes: string[],
): Promise<Map<string, StockMeta>> {
  if (codes.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase
    .from('stocks')
    .select('code, name, market')
    .in('code', codes);
  return new Map((data ?? []).map((s) => [s.code, s as StockMeta]));
}

/** 등락률에서 "상승/하락/변화없음" 중 하나의 색상 톤 키를 산출합니다. */
function toneFromChange(rate: number | null | undefined): 'up' | 'down' | 'neutral' {
  if (rate == null || rate === 0) return 'neutral';
  return rate > 0 ? 'up' : 'down';
}

// ============================================================
// 거래량 / 거래대금
// ============================================================

export async function getVolumeRanking(
  tab: VolumeTab,
  limit: number = RANKING.PAGE_SIZE,
): Promise<RankingTableRow[]> {
  const supabase = await createClient();

  if (tab === 'value') {
    // 거래대금 (close * volume) TOP — view에 today_value 컬럼이 있음
    const { data } = await supabase
      .from('v_daily_change')
      .select('stock_code, today_close, today_volume, today_value, change_rate')
      .order('today_value', { ascending: false })
      .limit(limit);

    const rows = (data ?? []) as Pick<
      DailyChangeRow,
      'stock_code' | 'today_close' | 'today_volume' | 'today_value' | 'change_rate'
    >[];
    const meta = await fetchStockMeta(rows.map((r) => r.stock_code));

    return rows
      .map<RankingTableRow | null>((r) => {
        const m = meta.get(r.stock_code);
        if (!m) return null;
        return {
          code: m.code,
          name: m.name,
          market: m.market,
          metric: formatKRWCompact(r.today_value),
          metricTone: 'neutral',
          secondary: [
            { label: '종가', value: `${formatNumber(r.today_close)}원` },
            { label: '등락', value: formatPercent(r.change_rate) },
          ],
        };
      })
      .filter((r): r is RankingTableRow => r !== null);
  }

  // 거래량 급증: 최근 N+1 영업일 데이터로 (오늘 / 직전 N일 평균) 계산
  // candles 테이블을 직접 읽어 클라이언트 측에서 집계
  const lookback = RANKING.VOLUME_SURGE_LOOKBACK_DAYS;
  const sinceDays = lookback + 30; // 휴장일 여유
  const since = new Date();
  since.setDate(since.getDate() - sinceDays);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data: candles } = await supabase
    .from('candles')
    .select('stock_code, date, volume, close')
    .eq('exchange', 'KRX')
    .eq('candle_type', 'daily')
    .gte('date', sinceStr)
    .order('date', { ascending: false });

  const grouped = new Map<string, { date: string; volume: number; close: number }[]>();
  for (const row of candles ?? []) {
    const list = grouped.get(row.stock_code) ?? [];
    if (list.length <= lookback) {
      list.push(row);
      grouped.set(row.stock_code, list);
    }
  }

  type Surge = { code: string; ratio: number; today_volume: number; today_close: number };
  const surges: Surge[] = [];
  for (const [code, rows] of grouped) {
    if (rows.length < lookback + 1) continue;
    const today = rows[0];
    const prevAvg =
      rows.slice(1, lookback + 1).reduce((s, r) => s + r.volume, 0) / lookback;
    if (!prevAvg || prevAvg === 0) continue;
    surges.push({
      code,
      ratio: today.volume / prevAvg,
      today_volume: today.volume,
      today_close: today.close,
    });
  }

  surges.sort((a, b) => b.ratio - a.ratio);
  const top = surges.slice(0, limit);
  const meta = await fetchStockMeta(top.map((s) => s.code));

  return top
    .map<RankingTableRow | null>((s) => {
      const m = meta.get(s.code);
      if (!m) return null;
      return {
        code: m.code,
        name: m.name,
        market: m.market,
        metric: `${s.ratio.toFixed(1)}배`,
        metricTone: 'up',
        secondary: [
          { label: '거래량', value: formatNumber(s.today_volume) },
          { label: '종가', value: `${formatNumber(s.today_close)}원` },
        ],
      };
    })
    .filter((r): r is RankingTableRow => r !== null);
}

// ============================================================
// 등락률 / 52주 신고가·신저가
// ============================================================

export async function getMoversRanking(
  tab: MoversTab,
  limit: number = RANKING.PAGE_SIZE,
): Promise<RankingTableRow[]> {
  const supabase = await createClient();

  if (tab === 'gainers' || tab === 'losers') {
    const ascending = tab === 'losers';
    const { data } = await supabase
      .from('v_daily_change')
      .select('stock_code, today_close, change_rate, today_value')
      .not('change_rate', 'is', null)
      .order('change_rate', { ascending })
      .limit(limit);

    const rows = (data ?? []) as Pick<
      DailyChangeRow,
      'stock_code' | 'today_close' | 'change_rate' | 'today_value'
    >[];
    const meta = await fetchStockMeta(rows.map((r) => r.stock_code));

    return rows
      .map<RankingTableRow | null>((r) => {
        const m = meta.get(r.stock_code);
        if (!m) return null;
        return {
          code: m.code,
          name: m.name,
          market: m.market,
          metric: formatPercent(r.change_rate),
          metricTone: toneFromChange(r.change_rate),
          secondary: [
            { label: '종가', value: `${formatNumber(r.today_close)}원` },
            { label: '거래대금', value: formatKRWCompact(r.today_value) },
          ],
        };
      })
      .filter((r): r is RankingTableRow => r !== null);
  }

  // 52주 신고가/신저가
  const isHigh = tab === 'high_52w';
  const { data: extremes } = await supabase
    .from('v_52w_extremes')
    .select('stock_code, today_high, today_low, high_252, low_252, is_new_high, is_new_low')
    .eq(isHigh ? 'is_new_high' : 'is_new_low', true)
    .limit(limit * 3); // 거래대금으로 다시 정렬할 여지

  const codes = (extremes ?? []).map((e) => e.stock_code);
  if (codes.length === 0) return [];

  const { data: changes } = await supabase
    .from('v_daily_change')
    .select('stock_code, today_close, change_rate, today_value')
    .in('stock_code', codes);

  const changeMap = new Map(
    ((changes ?? []) as Pick<
      DailyChangeRow,
      'stock_code' | 'today_close' | 'change_rate' | 'today_value'
    >[]).map((c) => [c.stock_code, c]),
  );

  const sorted = (extremes ?? [])
    .slice()
    .sort((a, b) => {
      const av = changeMap.get(a.stock_code)?.today_value ?? 0;
      const bv = changeMap.get(b.stock_code)?.today_value ?? 0;
      return bv - av;
    })
    .slice(0, limit) as ExtremesRow[];

  const meta = await fetchStockMeta(sorted.map((e) => e.stock_code));

  return sorted
    .map<RankingTableRow | null>((e) => {
      const m = meta.get(e.stock_code);
      if (!m) return null;
      const ch = changeMap.get(e.stock_code);
      const metricValue = isHigh ? e.today_high : e.today_low;
      return {
        code: m.code,
        name: m.name,
        market: m.market,
        metric: `${formatNumber(metricValue)}원`,
        metricTone: isHigh ? 'up' : 'down',
        secondary: [
          { label: '등락', value: formatPercent(ch?.change_rate ?? null) },
          { label: '거래대금', value: formatKRWCompact(ch?.today_value ?? null) },
        ],
      };
    })
    .filter((r): r is RankingTableRow => r !== null);
}

// ============================================================
// 토론 핫 종목
// ============================================================

export async function getTrendingRanking(
  limit: number = RANKING.PAGE_SIZE,
): Promise<RankingTableRow[]> {
  const supabase = await createClient();

  const since = new Date();
  since.setHours(since.getHours() - RANKING.TRENDING_WINDOW_HOURS);

  const { data: posts } = await supabase
    .from('posts')
    .select('stock_code, like_count')
    .gte('created_at', since.toISOString());

  const agg = new Map<string, { posts: number; likes: number }>();
  for (const p of posts ?? []) {
    const cur = agg.get(p.stock_code) ?? { posts: 0, likes: 0 };
    cur.posts += 1;
    cur.likes += p.like_count ?? 0;
    agg.set(p.stock_code, cur);
  }

  const sorted = Array.from(agg.entries())
    // 점수: 글 수 + 좋아요 0.5 가중. 좋아요만 많은 글 1개로 1위 가는 것 방지.
    .map(([code, v]) => ({ code, ...v, score: v.posts + v.likes * 0.5 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (sorted.length === 0) return [];

  const meta = await fetchStockMeta(sorted.map((s) => s.code));

  return sorted
    .map<RankingTableRow | null>((s) => {
      const m = meta.get(s.code);
      if (!m) return null;
      return {
        code: m.code,
        name: m.name,
        market: m.market,
        metric: `${s.posts}개`,
        metricTone: 'neutral',
        secondary: [{ label: '좋아요', value: formatNumber(s.likes) }],
      };
    })
    .filter((r): r is RankingTableRow => r !== null);
}

// ============================================================
// 유동물량 대비 거래량
//
// 유동주식수(float_shares)는 KRX 주요 지수 구성종목만 데이터가 존재하므로
// 이 랭킹은 지수 구성종목에 한정됩니다 (비지수 = 제공 예외대상).
// ============================================================

type FloatVolumeRow = {
  code: string;
  name: string;
  market: 'KOSPI' | 'KOSDAQ';
  float_shares: number;
  today_close: number;
  today_volume: number;
  today_value: number;
  change_rate: number | null;
  volume_to_float: number;
};

export async function getFloatVolumeRanking(
  limit: number = RANKING.PAGE_SIZE,
): Promise<RankingTableRow[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('v_float_volume_ranking')
    .select(
      'code, name, market, float_shares, today_close, today_volume, today_value, change_rate, volume_to_float',
    )
    .order('volume_to_float', { ascending: false })
    .limit(limit);

  const rows = (data ?? []) as FloatVolumeRow[];

  return rows.map<RankingTableRow>((r) => ({
    code: r.code,
    name: r.name,
    market: r.market,
    metric: formatPercent(r.volume_to_float * 100, 2),
    metricTone: toneFromChange(r.change_rate),
    secondary: [
      { label: '거래량', value: formatNumber(r.today_volume) },
      { label: '유동주식', value: formatNumber(r.float_shares) },
      { label: '등락', value: formatPercent(r.change_rate) },
    ],
  }));
}

// ============================================================
// 섹터 랭킹
// ============================================================

export type SectorRankingRow = {
  sector: string;
  stock_count: number;
  up_count: number;
  down_count: number;
  avg_change: number | null;
  total_value: number | null;
  weighted_change: number | null;
};

export type SectorSort = 'weighted_change' | 'total_value';

export async function getSectorRanking(
  sort: SectorSort = 'weighted_change',
): Promise<SectorRankingRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('v_sector_ranking')
    .select(
      'sector, stock_count, up_count, down_count, avg_change, total_value, weighted_change',
    )
    .not(sort, 'is', null)
    .order(sort, { ascending: false });

  return (data ?? []) as SectorRankingRow[];
}

/** 특정 섹터에 속한 종목들의 오늘 변화율 리스트 */
export async function getSectorConstituents(
  sector: string,
  limit: number = RANKING.PAGE_SIZE,
): Promise<RankingTableRow[]> {
  const supabase = await createClient();

  const { data: stocks } = await supabase
    .from('stocks')
    .select('code, name, market')
    .eq('sector', sector);

  const codes = (stocks ?? []).map((s) => s.code);
  if (codes.length === 0) return [];

  const { data: changes } = await supabase
    .from('v_daily_change')
    .select('stock_code, today_close, today_value, change_rate')
    .in('stock_code', codes);

  const changeMap = new Map(
    ((changes ?? []) as Pick<
      DailyChangeRow,
      'stock_code' | 'today_close' | 'today_value' | 'change_rate'
    >[]).map((c) => [c.stock_code, c]),
  );

  return (stocks ?? [])
    .map<RankingTableRow | null>((s) => {
      const ch = changeMap.get(s.code);
      if (!ch) return null;
      return {
        code: s.code,
        name: s.name,
        market: s.market as 'KOSPI' | 'KOSDAQ',
        metric: formatPercent(ch.change_rate),
        metricTone: toneFromChange(ch.change_rate),
        secondary: [
          { label: '종가', value: `${formatNumber(ch.today_close)}원` },
          { label: '거래대금', value: formatKRWCompact(ch.today_value) },
        ],
      };
    })
    .filter((r): r is RankingTableRow => r !== null)
    .sort((a, b) => {
      const av = parseFloat(a.metric);
      const bv = parseFloat(b.metric);
      return (isNaN(bv) ? 0 : bv) - (isNaN(av) ? 0 : av);
    })
    .slice(0, limit);
}

export async function getValuationRanking(
  tab: ValuationTab,
  limit: number = RANKING.PAGE_SIZE,
): Promise<RankingTableRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from('v_latest_financials')
    .select('stock_code, market_cap, per, pbr, roe, debt_ratio');

  switch (tab) {
    case 'market_cap':
      query = query.not('market_cap', 'is', null).order('market_cap', { ascending: false });
      break;
    case 'low_per':
      query = query.gt('per', 0).order('per', { ascending: true });
      break;
    case 'low_pbr':
      query = query.gt('pbr', 0).order('pbr', { ascending: true });
      break;
    case 'high_roe':
      query = query.not('roe', 'is', null).order('roe', { ascending: false });
      break;
  }

  const { data } = await query.limit(limit);
  const rows = (data ?? []) as Pick<
    LatestFinancialsRow,
    'stock_code' | 'market_cap' | 'per' | 'pbr' | 'roe' | 'debt_ratio'
  >[];
  const meta = await fetchStockMeta(rows.map((r) => r.stock_code));

  return rows
    .map<RankingTableRow | null>((r) => {
      const m = meta.get(r.stock_code);
      if (!m) return null;
      const metric =
        tab === 'market_cap'
          ? formatKRWCompact(r.market_cap)
          : tab === 'low_per'
            ? `${formatNumber(r.per, 2)}배`
            : tab === 'low_pbr'
              ? `${formatNumber(r.pbr, 2)}배`
              : `${formatNumber(r.roe, 2)}%`;

      const secondary: { label: string; value: string }[] = [];
      if (tab !== 'market_cap') {
        secondary.push({ label: '시총', value: formatKRWCompact(r.market_cap) });
      }
      if (tab !== 'low_per' && r.per != null) {
        secondary.push({ label: 'PER', value: `${formatNumber(r.per, 2)}` });
      }
      if (tab !== 'low_pbr' && r.pbr != null) {
        secondary.push({ label: 'PBR', value: `${formatNumber(r.pbr, 2)}` });
      }
      if (tab !== 'high_roe' && r.roe != null) {
        secondary.push({ label: 'ROE', value: `${formatNumber(r.roe, 2)}%` });
      }

      return {
        code: m.code,
        name: m.name,
        market: m.market,
        metric,
        metricTone: 'neutral',
        secondary: secondary.slice(0, 3),
      };
    })
    .filter((r): r is RankingTableRow => r !== null);
}
