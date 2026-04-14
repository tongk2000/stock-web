'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useIsDark } from '@/hooks/useIsDark';
import type { Candle } from '@/types/stock';
import type { IndicatorOptions } from '@/components/chart/CandleChart';

const CandleChart = dynamic(() => import('@/components/chart/CandleChart'), {
  ssr: false,
  loading: () => <div className="h-[590px] w-full animate-pulse rounded-xl bg-muted" />,
});

type ExchangeType = '통합' | 'KRX' | 'NXT';

const EXCHANGES: ExchangeType[] = ['통합', 'KRX', 'NXT'];
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
          ? 'bg-secondary text-secondary-foreground outline outline-1 outline-border'
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
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [indicators, setIndicators] = useState<IndicatorOptions>(DEFAULT_INDICATORS);
  // localStorage 복원이 완료됐는지 추적 — 복원 전에 DEFAULT로 덮어쓰는 것을 방지
  const [initialized, setInitialized] = useState(false);

  // hydration 후 localStorage 복원 (SSR 불일치 방지)
  useEffect(() => {
    setIndicators(loadIndicators());
    setInitialized(true);
  }, []);

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
        setCandles(mergeCandles(krxRes.data ?? [], nxtRes.data ?? []));
      } else {
        const { data } = await supabase
          .from('candles')
          .select('date, open, high, low, close, volume')
          .eq('stock_code', code)
          .eq('exchange', exchange)
          .eq('candle_type', 'daily')
          .order('date', { ascending: true });
        setCandles(data ?? []);
      }
      setLoading(false);
    }

    fetchCandles();
  }, [code, exchange]);

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
      <div className="rounded-xl border border-border bg-card/50 p-4">
        {/* 컨트롤 바 */}
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          {/* 거래소 탭 */}
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
                      ? 'bg-secondary text-secondary-foreground'
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

          <div className="h-4 w-px bg-border" />

          {/* 이평선 + BB (오버레이 그룹) */}
          <div className="flex items-center gap-1">
            <span className="mr-1 text-xs text-muted-foreground">MA</span>
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
            <ToggleBtn active={indicators.bb} onClick={() => toggleFlag('bb')} accentColor="#6366f1">
              BB
            </ToggleBtn>
          </div>

          <div className="h-4 w-px bg-border" />

          {/* 서브 패널 지표 */}
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

        {/* 차트 */}
        {loading ? (
          <div className="h-[590px] w-full animate-pulse rounded-xl bg-muted" />
        ) : candles.length > 0 ? (
          <CandleChart candles={candles} indicators={indicators} isDark={isDark} />
        ) : (
          <div className="flex h-[400px] items-center justify-center text-muted-foreground">
            {exchange} 데이터가 없습니다.
          </div>
        )}
      </div>

    </div>
  );
}
