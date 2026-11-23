/**
 * StockChartSection
 *
 * 종목 상세 페이지의 차트 영역 전체를 담당하는 클라이언트 컴포넌트입니다.
 *
 * 구성:
 *   1. 가격 정보 (현재가, 등락률)
 *   2. 컨트롤 바 (거래소 탭 · 봉 타입 탭 · 보조지표 설정)
 *   3. CandleChart (dynamic import, SSR 비활성화)
 *   4. 메모 모달 (차트 캔들 클릭 시 열림)
 *
 * 데이터 흐름:
 *   - Supabase에서 일봉(KRX/NXT) fetch → 통합 시 mergeCandles로 합산
 *   - 봉 타입 변경 시 aggregateCandles로 주봉/월봉 집계
 *   - 보조지표 설정은 localStorage에 저장/복원 (hydration 불일치 방지)
 *   - 공매도(short_sales)·신용잔고(credit_balances)는 그 패널이 켜졌을 때만 종목별로 읽고,
 *     lib/short-credit.ts로 봉 날짜에 맞춰 CandleChart에 넘긴다
 *
 * 메모:
 *   - 로그인 유저만 차트 날짜 클릭으로 메모 작성 가능
 *   - Supabase chart_memos 테이블에 upsert/delete
 *   - 낙관적 업데이트로 즉시 반영
 */

'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { ChevronDown, ChevronUp, SlidersHorizontal, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useIsDark } from '@/hooks/useIsDark';
import { aggregateCandles } from '@/lib/indicators';
import {
  alignCreditBalances, alignShortSales, normalizeCreditBalances, normalizeShortSales,
} from '@/lib/short-credit';
import { STORAGE_KEYS, MA_PERIODS } from '@/lib/constants';
import { useTodayCandle, isMarketOpen } from '@/hooks/useTodayCandle';
import type { Candle, CandleType, CreditBalance, ShortSale } from '@/types/stock';
import type { IndicatorOptions } from '@/components/chart/CandleChart';

const CandleChart = dynamic(() => import('@/components/chart/CandleChart'), {
  ssr: false,
  loading: () => <div className="h-[450px] md:h-[590px] w-full animate-pulse rounded-xl bg-muted" />,
});

type ExchangeType = '통합' | 'KRX' | 'NXT';

const EXCHANGES: ExchangeType[] = ['통합', 'KRX', 'NXT'];
const CANDLE_TYPES: { value: CandleType; label: string }[] = [
  { value: 'daily', label: '일봉' },
  { value: 'weekly', label: '주봉' },
  { value: 'monthly', label: '월봉' },
];
// 이평선 기간별 색상 — CandleChart의 MA_SOLID와 동일한 값 (토글 버튼 accent용)
const MA_COLORS: Record<number, string> = {
  5: '#d97706',
  20: '#2563eb',
  60: '#dc2626',
  120: '#16a34a',
};

const STORAGE_KEY = STORAGE_KEYS.INDICATORS;

const DEFAULT_INDICATORS: IndicatorOptions = {
  volume: true,
  ma: [5, 20, 60, 120],
  bb: false,
  rsi: false,
  obv: false,
  short: false,
  credit: false,
  tooltip: true,
};

function loadIndicators(): IndicatorOptions {
  if (typeof window === 'undefined') return DEFAULT_INDICATORS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_INDICATORS;
    return { ...DEFAULT_INDICATORS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_INDICATORS;
  }
}

interface Props {
  code: string;
}

/** KRX·NXT 일봉을 날짜 기준으로 합산 (고가=max, 저가=min, 거래량=합계, 종가=KRX 기준) */
function mergeCandles(krx: Candle[], nxt: Candle[]): Candle[] {
  const nxtMap = new Map(nxt.map((c) => [c.date, c]));
  return krx.map((k) => {
    const n = nxtMap.get(k.date);
    if (!n) return k;
    return {
      date: k.date,
      open: k.open,
      high: Math.max(k.high, n.high),
      low: Math.min(k.low, n.low),
      close: k.close,
      volume: k.volume + n.volume,
    };
  });
}

function ToggleBtn({
  active,
  onClick,
  children,
  accentColor,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  accentColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded px-2.5 py-1 text-xs font-medium transition-colors',
        active && !accentColor
          ? 'bg-accent text-foreground font-semibold shadow-sm ring-1 ring-border/50'
          : !active
            ? 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            : '',
      )}
      style={
        active && accentColor
          ? {
              backgroundColor: accentColor + '22',
              color: accentColor,
              outline: `1px solid ${accentColor}55`,
            }
          : undefined
      }
    >
      {children}
    </button>
  );
}

export default function StockChartSection({ code }: Props) {
  const { signInWithGoogle } = useAuth();
  const isDark = useIsDark();
  const [exchange, setExchange] = useState<ExchangeType>('통합');
  const [candleType, setCandleType] = useState<CandleType>('daily');
  const [allCandles, setAllCandles] = useState<Candle[]>([]);
  const todayCandle = useTodayCandle(code);

  const allCandlesWithToday = useMemo(() => {
    if (!todayCandle) return allCandles;
    const last = allCandles[allCandles.length - 1];
    if (last?.date === todayCandle.date) {
      return [...allCandles.slice(0, -1), todayCandle];
    }
    return [...allCandles, todayCandle];
  }, [allCandles, todayCandle]);

  const candles = useMemo(() => aggregateCandles(allCandlesWithToday, candleType), [allCandlesWithToday, candleType]);

  const [loading, setLoading] = useState(true);
  // 공매도·신용잔고 행. 종목이 바뀌면 옛 종목 행을 쓰지 않도록 code를 같이 둔다
  const [shortRows, setShortRows] = useState<{ code: string; rows: ShortSale[] } | null>(null);
  const [creditRows, setCreditRows] = useState<{ code: string; rows: CreditBalance[] } | null>(null);
  const [indicators, setIndicators] = useState<IndicatorOptions>(DEFAULT_INDICATORS);
  const [showIndicators, setShowIndicators] = useState(false);
  // localStorage 복원이 완료됐는지 추적 — 복원 전에 DEFAULT로 덮어쓰는 것을 방지
  const [initialized, setInitialized] = useState(false);

  // ── 메모 상태 ─────────────────────────────────────────────────────────────────
  const [userId, setUserId] = useState<string | null>(null);
  const [memoRecord, setMemoRecord] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [memoInput, setMemoInput] = useState('');

  const memosMap = useMemo(() => new Map(Object.entries(memoRecord)), [memoRecord]);
  const topInfoRef = useRef<HTMLDivElement>(null);

  // 로그인 유저 ID 확인
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // hydration 후 localStorage 복원 (SSR 불일치 방지)
  useEffect(() => {
    setIndicators(loadIndicators());
    setInitialized(true);
  }, []);

  // 종목/유저 변경 시 Supabase에서 메모 불러오기
  useEffect(() => {
    setMemoRecord({});
    setSelectedDate(null);
    setMemoInput('');
    if (!userId) return;
    const supabase = createClient();
    supabase
      .from('chart_memos')
      .select('date, content')
      .eq('stock_code', code)
      .eq('user_id', userId)
      .then(({ data }) => {
        if (!data) return;
        const record: Record<string, string> = {};
        for (const note of data) record[note.date] = note.content;
        setMemoRecord(record);
      });
  }, [code, userId]);

  // 초기화 완료 후에만 저장 (마운트 직후 DEFAULT로 덮어쓰는 버그 방지)
  useEffect(() => {
    if (!initialized) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(indicators));
  }, [initialized, indicators]);

  // 캔들 데이터 fetch
  useEffect(() => {
    setLoading(true);
    const supabase = createClient();

    async function fetchCandles() {
      if (exchange === '통합') {
        const [krxRes, nxtRes] = await Promise.all([
          supabase
            .from('candles')
            .select('date, open, high, low, close, volume')
            .eq('stock_code', code)
            .eq('exchange', 'KRX')
            .eq('candle_type', 'daily')
            .order('date', { ascending: true }),
          supabase
            .from('candles')
            .select('date, open, high, low, close, volume')
            .eq('stock_code', code)
            .eq('exchange', 'NXT')
            .eq('candle_type', 'daily')
            .order('date', { ascending: true }),
        ]);
        setAllCandles(mergeCandles(krxRes.data ?? [], nxtRes.data ?? []));
      } else {
        const { data } = await supabase
          .from('candles')
          .select('date, open, high, low, close, volume')
          .eq('stock_code', code)
          .eq('exchange', exchange)
          .eq('candle_type', 'daily')
          .order('date', { ascending: true });
        setAllCandles(data ?? []);
      }
      setLoading(false);
    }

    fetchCandles();
  }, [code, exchange]);

  // 공매도 행 fetch — 패널이 켜졌을 때만, 종목마다 한 번 (최대 약 1년치라 PostgREST 1000행 제한 안)
  useEffect(() => {
    if (!indicators.short || shortRows?.code === code) return;
    let cancelled = false;
    createClient()
      .from('short_sales')
      .select('date, short_volume, short_value, short_volume_ratio, short_value_ratio')
      .eq('stock_code', code)
      .order('date', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        setShortRows({ code, rows: error || !data ? [] : normalizeShortSales(data) });
      });
    return () => { cancelled = true; };
  }, [code, indicators.short, shortRows?.code]);

  // 신용잔고 행 fetch — 패널이 켜졌을 때만, 종목마다 한 번
  useEffect(() => {
    if (!indicators.credit || creditRows?.code === code) return;
    let cancelled = false;
    createClient()
      .from('credit_balances')
      .select('date, loan_balance_shares, loan_balance_amount, loan_balance_rate, loan_new_shares, loan_repay_shares, lend_balance_shares')
      .eq('stock_code', code)
      .order('date', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        setCreditRows({ code, rows: error || !data ? [] : normalizeCreditBalances(data) });
      });
    return () => { cancelled = true; };
  }, [code, indicators.credit, creditRows?.code]);

  // 봉 날짜에 맞춘 패널 점. 꺼져 있으면 undefined → CandleChart의 고정 빈 배열(차트 재생성 방지)
  const shortPoints = useMemo(
    () => indicators.short && shortRows?.code === code
      ? alignShortSales(shortRows.rows, candles, candleType)
      : undefined,
    [indicators.short, shortRows, code, candles, candleType],
  );
  const creditPoints = useMemo(
    () => indicators.credit && creditRows?.code === code
      ? alignCreditBalances(creditRows.rows, candles, candleType)
      : undefined,
    [indicators.credit, creditRows, code, candles, candleType],
  );

  // ── 메모 핸들러 ───────────────────────────────────────────────────────────────
  const handleDateClick = useCallback((date: string) => {
    if (!userId) {
      signInWithGoogle();
      return;
    }
    setMemoInput(memoRecord[date] ?? '');
    setSelectedDate(date);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoRecord, userId, signInWithGoogle]);

  const saveMemo = useCallback(() => {
    if (!selectedDate || !userId) return;
    const trimmed = memoInput.trim();
    // 낙관적 업데이트
    if (trimmed) {
      setMemoRecord((prev) => ({ ...prev, [selectedDate]: trimmed }));
    } else {
      setMemoRecord((prev) => { const { [selectedDate]: _, ...rest } = prev; return rest; });
    }
    setSelectedDate(null);
    setMemoInput('');
    // Supabase 동기화
    const supabase = createClient();
    if (trimmed) {
      supabase.from('chart_memos').upsert(
        { user_id: userId, stock_code: code, date: selectedDate, content: trimmed },
        { onConflict: 'user_id,stock_code,date' },
      ).then();
    } else {
      supabase.from('chart_memos').delete()
        .eq('user_id', userId).eq('stock_code', code).eq('date', selectedDate).then();
    }
  }, [selectedDate, memoInput, code, userId]);

  const deleteMemo = useCallback((date: string) => {
    if (!userId) return;
    setMemoRecord((prev) => { const { [date]: _, ...rest } = prev; return rest; });
    if (selectedDate === date) { setSelectedDate(null); setMemoInput(''); }
    // Supabase 동기화
    const supabase = createClient();
    supabase.from('chart_memos').delete()
      .eq('user_id', userId).eq('stock_code', code).eq('date', date).then();
  }, [selectedDate, code, userId]);

  function toggleMA(period: number) {
    setIndicators((prev) => ({
      ...prev,
      ma: prev.ma.includes(period) ? prev.ma.filter((p) => p !== period) : [...prev.ma, period],
    }));
  }

  function toggleFlag(key: keyof Omit<IndicatorOptions, 'ma'>) {
    setIndicators((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const latest = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const change = latest && prev ? latest.close - prev.close : null;
  const changeRate = change !== null && prev ? (change / prev.close) * 100 : null;
  const isPositive = change !== null && change >= 0;
  const isLiveCandle = todayCandle !== null && latest?.date === todayCandle.date;

  return (
    <div>
      {/* 가격 정보 */}
      <div className="mb-6">
        {loading ? (
          <div className="space-y-2">
            <div className="h-9 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          </div>
        ) : latest ? (
          <>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-foreground">
                {latest.close.toLocaleString()}원
              </span>
              {change !== null && changeRate !== null && (
                <span className={isPositive ? 'text-base text-red-500' : 'text-base text-blue-500'}>
                  {isPositive ? '+' : ''}
                  {change.toLocaleString()}원 ({isPositive ? '+' : ''}
                  {changeRate.toFixed(2)}%)
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-xs text-muted-foreground">{latest.date} 기준</p>
              {isLiveCandle && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {isMarketOpen() && (
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                  )}
                  15분 지연
                </span>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* 인포바 (툴팁 off 시 차트 카드 밖, 위에 표시) */}
      <div
        ref={topInfoRef}
        style={{ display: 'none' }}
        className="mb-2 flex flex-col gap-0.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-foreground"
      />

      {/* 차트 영역 */}
      <div className="rounded-xl border border-border bg-card/50 p-1 sm:p-4">
        {/* 컨트롤 바 */}
        <div className="mb-3 flex flex-col gap-2">
          {/* 1행: 거래소 탭 + 지표 설정 버튼 */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {EXCHANGES.map((ex) => {
                const isNxt = ex === 'NXT';
                return (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => !isNxt && setExchange(ex)}
                    disabled={isNxt}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                      exchange === ex && !isNxt
                        ? 'bg-accent text-foreground font-semibold shadow-sm ring-1 ring-border/50'
                        : isNxt
                          ? 'cursor-not-allowed text-muted-foreground/60'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    )}
                  >
                    {ex}
                    {isNxt && (
                      <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        준비 중
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowIndicators(!showIndicators)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <SlidersHorizontal size={14} />
              <span>지표 설정</span>
              {showIndicators ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {/* 2행: 봉 타입 탭 */}
          <div className="flex gap-1">
            {CANDLE_TYPES.map((ct) => (
              <button
                key={ct.value}
                type="button"
                onClick={() => setCandleType(ct.value)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  candleType === ct.value
                    ? 'bg-accent text-foreground font-semibold shadow-sm ring-1 ring-border/50'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                {ct.label}
              </button>
            ))}
          </div>

          {/* 보조지표 설정 영역 */}
          {showIndicators && (
            <div className="flex flex-col gap-2 rounded-lg border border-border/40 bg-muted/10 p-2.5">
              {/* 이평선 + BB (오버레이 그룹) */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-12 text-xs font-medium text-muted-foreground">오버레이</span>
                <div className="flex items-center gap-1">
                  <span className="mr-1 text-[10px] text-muted-foreground">MA</span>
                  {MA_PERIODS.map((p) => (
                    <ToggleBtn
                      key={p}
                      active={indicators.ma.includes(p)}
                      onClick={() => toggleMA(p)}
                      accentColor={MA_COLORS[p]}
                    >
                      {p}
                    </ToggleBtn>
                  ))}
                  <div className="mx-1 h-3 w-px bg-border/60" />
                  <ToggleBtn active={indicators.bb} onClick={() => toggleFlag('bb')} accentColor="#6366f1">
                    BB
                  </ToggleBtn>
                  <div className="mx-1 h-3 w-px bg-border/60" />
                  <ToggleBtn active={indicators.tooltip} onClick={() => toggleFlag('tooltip')}>
                    툴팁
                  </ToggleBtn>
                </div>
              </div>

              {/* 서브 패널 지표 */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-12 text-xs font-medium text-muted-foreground">하단지표</span>
                <div className="flex flex-wrap gap-1">
                  <ToggleBtn active={indicators.volume} onClick={() => toggleFlag('volume')}>
                    VOL
                  </ToggleBtn>
                  <ToggleBtn active={indicators.rsi} onClick={() => toggleFlag('rsi')} accentColor="#a78bfa">
                    RSI
                  </ToggleBtn>
                  <ToggleBtn active={indicators.obv} onClick={() => toggleFlag('obv')} accentColor="#34d399">
                    OBV
                  </ToggleBtn>
                  <ToggleBtn active={indicators.short} onClick={() => toggleFlag('short')} accentColor="#f59e0b">
                    공매도
                  </ToggleBtn>
                  <ToggleBtn active={indicators.credit} onClick={() => toggleFlag('credit')} accentColor="#f472b6">
                    신용
                  </ToggleBtn>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 차트 */}
        {loading ? (
          <div className="h-[450px] md:h-[590px] w-full animate-pulse rounded-xl bg-muted" />
        ) : candles.length > 0 ? (
          <CandleChart
            candles={candles}
            indicators={indicators}
            isDark={isDark}
            memos={memosMap}
            onDateClick={handleDateClick}
            topInfoRef={topInfoRef}
            shortSales={shortPoints}
            credit={creditPoints}
          />
        ) : (
          <div className="flex h-[400px] items-center justify-center text-muted-foreground">
            {exchange} 데이터가 없습니다.
          </div>
        )}
      </div>

      {/* ── 메모 모달 ────────────────────────────────────────────────────────────── */}
      {selectedDate && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
          onClick={() => { setSelectedDate(null); setMemoInput(''); }}
        >
          <div
            className="w-full rounded-t-2xl border border-border bg-card px-5 pb-8 pt-5 shadow-2xl sm:mx-4 sm:max-w-sm sm:rounded-2xl sm:pb-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모바일 드래그 핸들 */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border sm:hidden" />

            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">메모</p>
                <p className="text-base font-semibold text-foreground">{selectedDate}</p>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedDate(null); setMemoInput(''); }}
                className="rounded-xl p-2 text-muted-foreground active:bg-accent"
              >
                <X size={18} />
              </button>
            </div>

            <textarea
              value={memoInput}
              onChange={(e) => setMemoInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveMemo(); }}
              placeholder="이 날의 메모를 입력하세요..."
              className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              rows={4}
              maxLength={500}
              autoFocus
            />

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{memoInput.length} / 500</span>
              <div className="flex gap-2">
                {memoRecord[selectedDate] && (
                  <button
                    type="button"
                    onClick={() => deleteMemo(selectedDate)}
                    className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground active:bg-destructive/10 active:text-destructive"
                  >
                    삭제
                  </button>
                )}
                <button
                  type="button"
                  onClick={saveMemo}
                  className="rounded-xl bg-blue-500/20 px-5 py-2.5 text-sm font-semibold text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30 active:bg-blue-500/30"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
