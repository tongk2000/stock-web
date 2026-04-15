'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronUp, SlidersHorizontal, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useIsDark } from '@/hooks/useIsDark';
import { aggregateCandles } from '@/lib/indicators';
import type { Candle, CandleType } from '@/types/stock';
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
const MA_PERIODS = [5, 20, 60, 120] as const;

const MA_COLORS: Record<number, string> = {
  5: '#d97706',
  20: '#2563eb',
  60: '#dc2626',
  120: '#16a34a',
};

const STORAGE_KEY = 'stock-indicators';

const DEFAULT_INDICATORS: IndicatorOptions = {
  volume: true,
  ma: [5, 20, 60, 120],
  bb: false,
  rsi: false,
  obv: false,
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
  const isDark = useIsDark();
  const [exchange, setExchange] = useState<ExchangeType>('통합');
  const [candleType, setCandleType] = useState<CandleType>('daily');
  const [allCandles, setAllCandles] = useState<Candle[]>([]);

  const candles = useMemo(() => aggregateCandles(allCandles, candleType), [allCandles, candleType]);

  const [loading, setLoading] = useState(true);
  const [indicators, setIndicators] = useState<IndicatorOptions>(DEFAULT_INDICATORS);
  const [showIndicators, setShowIndicators] = useState(false);
  // localStorage 복원이 완료됐는지 추적 — 복원 전에 DEFAULT로 덮어쓰는 것을 방지
  const [initialized, setInitialized] = useState(false);

  // ── 메모 상태 ─────────────────────────────────────────────────────────────────
  const [memoRecord, setMemoRecord] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [memoInput, setMemoInput] = useState('');

  const memosMap = useMemo(() => new Map(Object.entries(memoRecord)), [memoRecord]);

  const memoStorageKey = `chart-memos-${code}`;

  // hydration 후 localStorage 복원 (SSR 불일치 방지)
  useEffect(() => {
    setIndicators(loadIndicators());
    setInitialized(true);
  }, []);

  // 종목 변경 시 메모 불러오기
  useEffect(() => {
    try {
      const raw = localStorage.getItem(memoStorageKey);
      setMemoRecord(raw ? JSON.parse(raw) : {});
    } catch {
      setMemoRecord({});
    }
    setSelectedDate(null);
    setMemoInput('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

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

  // ── 메모 핸들러 ───────────────────────────────────────────────────────────────
  const handleDateClick = useCallback((date: string) => {
    setMemoInput(memoRecord[date] ?? '');
    setSelectedDate(date);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoRecord]);

  const saveMemo = useCallback(() => {
    if (!selectedDate) return;
    let next: Record<string, string>;
    if (memoInput.trim()) {
      next = { ...memoRecord, [selectedDate]: memoInput.trim() };
    } else {
      const { [selectedDate]: _, ...rest } = memoRecord;
      next = rest;
    }
    setMemoRecord(next);
    try { localStorage.setItem(memoStorageKey, JSON.stringify(next)); } catch { /* ignore */ }
    setSelectedDate(null);
    setMemoInput('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, memoInput, memoRecord]);

  const deleteMemo = useCallback((date: string) => {
    const { [date]: _, ...next } = memoRecord;
    setMemoRecord(next);
    try { localStorage.setItem(memoStorageKey, JSON.stringify(next)); } catch { /* ignore */ }
    if (selectedDate === date) { setSelectedDate(null); setMemoInput(''); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoRecord, selectedDate]);

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
            <p className="mt-1 text-xs text-muted-foreground">{latest.date} 기준</p>
          </>
        ) : null}
      </div>

      {/* 차트 영역 */}
      <div className="rounded-xl border border-border bg-card/50 p-1 sm:p-4">
        {/* 컨트롤 바 */}
        <div className="mb-3 flex flex-col gap-2">
          {/* 상단 탭 및 설정 토글 버튼 */}
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
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
                            ? 'cursor-not-allowed text-muted-foreground/40'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      )}
                    >
                      {ex}
                      {isNxt && <span className="ml-1.5 text-xs opacity-50">준비 중</span>}
                    </button>
                  );
                })}
              </div>
              <div className="h-4 w-px self-center bg-border" />
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
            </div>
            
            <button
              type="button"
              onClick={() => setShowIndicators(!showIndicators)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <SlidersHorizontal size={14} />
              <span className="hidden sm:inline">지표 설정</span>
              {showIndicators ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
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
                <div className="flex gap-1">
                  <ToggleBtn active={indicators.volume} onClick={() => toggleFlag('volume')}>
                    VOL
                  </ToggleBtn>
                  <ToggleBtn active={indicators.rsi} onClick={() => toggleFlag('rsi')} accentColor="#a78bfa">
                    RSI
                  </ToggleBtn>
                  <ToggleBtn active={indicators.obv} onClick={() => toggleFlag('obv')} accentColor="#34d399">
                    OBV
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
                  className="rounded-xl bg-violet-500/20 px-5 py-2.5 text-sm font-semibold text-violet-400 ring-1 ring-violet-500/30 active:bg-violet-500/30"
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
