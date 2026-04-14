'use client';

import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
  Time,
} from 'lightweight-charts';
import { useEffect, useRef, useMemo } from 'react';
import type { Candle } from '@/types/stock';
import { calcMA, calcBB, calcRSI, calcOBV } from '@/lib/indicators';

export interface IndicatorOptions {
  volume: boolean;
  ma: number[];
  bb: boolean;
  rsi: boolean;
  obv: boolean;
}

interface Props {
  candles: Candle[];
  indicators: IndicatorOptions;
  isDark: boolean;
}

const MA_COLORS: Record<number, string> = {
  5:   'rgba(217,119,  6, 0.75)',
  20:  'rgba( 37, 99,235, 0.75)',
  60:  'rgba(220, 38, 38, 0.75)',
  120: 'rgba( 22,163, 74, 0.75)',
};
const MA_SOLID: Record<number, string> = {
  5: '#d97706', 20: '#2563eb', 60: '#dc2626', 120: '#16a34a',
};

const CHART_COLORS = {
  dark:  { text: '#a1a1aa', grid: '#27272a', border: '#333338', volUp: '#ef4444', volDown: '#3b82f6' },
  light: { text: '#52525b', grid: '#f4f4f5', border: '#e4e4e7', volUp: '#ef4444', volDown: '#3b82f6' },
};

const DEFAULT_SUB_H = 100; // 서브 패널 기본 높이

// 서브 패널별 독립 키 — 추가/제거 시 다른 패널 높이에 영향 없음
// 가격 패널 높이는 저장하지 않음 (항상 PANE_AREA - subTotal 로 계산)
const PANE_KEYS = {
  vol: 'pane-h-vol',
  rsi: 'pane-h-rsi',
  obv: 'pane-h-obv',
} as const;

function loadPaneH(key: string, def: number): number {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? Math.max(40, Number(v)) : def;
  } catch { return def; }
}
function savePaneH(key: string, h: number) {
  try { localStorage.setItem(key, String(h)); } catch { /* ignore */ }
}

const fmt = (n: number) => n.toLocaleString('ko-KR');
const fmtObv = (p: number) => {
  const a = Math.abs(p), s = p < 0 ? '-' : '';
  if (a >= 1e9) return `${s}${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${s}${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${s}${(a / 1e3).toFixed(0)}K`;
  return `${s}${a}`;
};
function lineVal(seriesData: Map<ISeriesApi<'Line'>, unknown>, s: ISeriesApi<'Line'>): number | null {
  return (seriesData.get(s) as LineData | undefined)?.value ?? null;
}

export default function CandleChart({ candles, indicators, isDark }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef   = useRef<HTMLDivElement>(null);

  // 차트 인스턴스 + 시리즈 ref (effect 간 공유)
  const chartRef        = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const overlayRef      = useRef<{
    ma:      { period: number; s: ISeriesApi<'Line'> }[];
    bbUpper: ISeriesApi<'Line'> | null;
    bbMid:   ISeriesApi<'Line'> | null;
    bbLower: ISeriesApi<'Line'> | null;
  }>({ ma: [], bbUpper: null, bbMid: null, bbLower: null });

  // MA 배열을 stable 문자열로 변환 (effect dep용)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const maKey = useMemo(() => [...indicators.ma].sort((a, b) => a - b).join(','), [indicators.ma]);

  // ── Effect 1: 차트 구조 (패널 수 / 테마 / 데이터 변경 시만 재생성) ───────────
  // MA·BB 변경은 이 effect를 트리거하지 않음 → 높이 불변

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;

    const theme = isDark ? CHART_COLORS.dark : CHART_COLORS.light;

    const CHART_HEIGHT = containerRef.current.clientHeight || 450;
    const TIMESCALE_H = 28;
    const MIN_PRICE_H = 150;
    const PANE_AREA = CHART_HEIGHT - TIMESCALE_H;

    // 각 서브 패널 높이를 독립적으로 불러옴
    const rawVol = indicators.volume ? loadPaneH(PANE_KEYS.vol, DEFAULT_SUB_H) : 0;
    const rawRsi = indicators.rsi    ? loadPaneH(PANE_KEYS.rsi, DEFAULT_SUB_H) : 0;
    const rawObv = indicators.obv    ? loadPaneH(PANE_KEYS.obv, DEFAULT_SUB_H) : 0;
    const rawSubTotal = rawVol + rawRsi + rawObv;

    // 서브 패널 합계가 허용 범위를 초과하면 비율에 맞게 스케일
    // → 합계가 항상 PANE_AREA와 일치해 lwc 내부 정규화가 발생하지 않음
    const maxSubH = PANE_AREA - MIN_PRICE_H;
    const scale   = rawSubTotal > maxSubH && rawSubTotal > 0 ? maxSubH / rawSubTotal : 1;
    const volH    = Math.round(rawVol * scale);
    const rsiH    = Math.round(rawRsi * scale);
    const obvH    = Math.round(rawObv * scale);
    const subTotal = volH + rsiH + obvH;

    // 가격 패널 = 나머지 전부 (항상 >= MIN_PRICE_H, lwc 정규화 없음)
    const priceH = PANE_AREA - subTotal;

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    // CSS 박스와 동일한 높이로 차트 생성 → JS가 DOM 높이를 변경해도 레이아웃 영향 없음
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: CHART_HEIGHT,
      layout: { 
        background: { color: 'transparent' }, 
        textColor: theme.text,
        fontSize: isMobile ? 10 : 12,
        attributionLogo: false,
        panes: {
          separatorColor: theme.border,
          separatorHoverColor: theme.border,
        },
      } as any,
      localization: {
        priceFormatter: (price: number) => {
          const a = Math.abs(price);
          if (isMobile && a >= 1000) {
            if (a >= 1000000) return (price / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
            return (price / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
          }
          return Math.round(price).toLocaleString('en-US');
        },
      },
      grid: { vertLines: { color: theme.grid }, horzLines: { color: theme.grid } },
      rightPriceScale: { borderColor: theme.border },
      timeScale: { borderColor: theme.border, fixLeftEdge: true, fixRightEdge: true },
      handleScroll: {
        vertTouchDrag: false,
      },
    });

    // 캔들 시리즈
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#ef4444', downColor: '#3b82f6',
      borderUpColor: '#ef4444', borderDownColor: '#3b82f6',
      wickUpColor: '#ef4444', wickDownColor: '#3b82f6',
    }, 0);
    candleSeries.setData(candles.map((c) => ({
      time: c.date as Time, open: c.open, high: c.high, low: c.low, close: c.close,
    })));

    const candleMap = new Map(candles.map((c) => [c.date, c]));

    // RSI / OBV 시리즈 ref (툴팁에서 읽음)
    let rsiS: ISeriesApi<'Line'> | null = null;
    let obvS: ISeriesApi<'Line'> | null = null;
    let nextPane = 1;

    if (indicators.volume) {
      chart.addPane();
      chart.addSeries(HistogramSeries, {
        priceScaleId: 'volume', priceLineVisible: false, lastValueVisible: false,
      }, nextPane).setData(candles.map((c, i) => {
        const prevVol = i > 0 ? candles[i - 1].volume : 0;
        return {
          time: c.date as Time, value: c.volume,
          color: c.volume >= prevVol ? theme.volUp : theme.volDown,
        };
      }));
      nextPane++;
    }

    if (indicators.rsi) {
      chart.addPane();
      const rsiData = calcRSI(candles);
      rsiS = chart.addSeries(LineSeries, {
        color: '#a78bfa', lineWidth: 1,
        priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: true,
      }, nextPane);
      rsiS.setData(rsiData.map((d) => ({ time: d.time as Time, value: d.value })));
      if (rsiData.length > 0) {
        const t0 = rsiData[0].time as Time, t1 = rsiData[rsiData.length - 1].time as Time;
        for (const [level, color] of [
          [70, 'rgba(239,68,68,0.4)'], [50, 'rgba(161,161,170,0.35)'], [30, 'rgba(59,130,246,0.4)'],
        ] as [number, string][]) {
          chart.addSeries(LineSeries, { color, lineWidth: 1, lineStyle: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false }, nextPane)
            .setData([{ time: t0, value: level }, { time: t1, value: level }]);
        }
      }
      nextPane++;
    }

    if (indicators.obv) {
      chart.addPane();
      obvS = chart.addSeries(LineSeries, {
        color: '#34d399', lineWidth: 1, priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: true,
        priceFormat: { type: 'custom', formatter: fmtObv, minMove: 1 },
      }, nextPane);
      obvS.setData(calcOBV(candles).map((d) => ({ time: d.time as Time, value: d.value })));
    }

    // 각 패널 높이 개별 적용 (서브 패널이 서로의 크기에 영향을 주지 않음)
    chart.panes()[0].setHeight(priceH);
    let pi = 1;
    if (indicators.volume) { chart.panes()[pi++].setHeight(volH); }
    if (indicators.rsi)    { chart.panes()[pi++].setHeight(rsiH); }
    if (indicators.obv)    { chart.panes()[pi++].setHeight(obvH); }

    if (candles.length > 60) {
      chart.timeScale().setVisibleLogicalRange({
        from: candles.length - 60,
        to: candles.length - 1,
      });
    } else {
      chart.timeScale().fitContent();
    }

    // 크로스헤어 툴팁 (overlayRef를 실시간으로 읽음)
    chart.subscribeCrosshairMove((param) => {
      const tooltip = tooltipRef.current, container = containerRef.current;
      if (!tooltip || !container) return;
      if (!param.point || !param.time || param.point.x < 0 || param.point.y < 0) {
        tooltip.style.display = 'none'; return;
      }
      const candle = candleMap.get(param.time as string);
      const ohlc   = param.seriesData.get(candleSeries) as CandlestickData | undefined;
      if (!candle || !ohlc) { tooltip.style.display = 'none'; return; }

      const isUp = candle.close >= candle.open;
      const up = '#ef4444', dn = '#3b82f6', cl = isUp ? up : dn;
      const chg = candle.close - candle.open;
      const pct = ((chg / candle.open) * 100).toFixed(2);

      let rows = `
        <div style="display:grid;grid-template-columns:auto auto;gap:2px 14px;font-size:12px;line-height:1.6">
          <span style="opacity:0.55">시가</span><span>${fmt(candle.open)}</span>
          <span style="opacity:0.55">고가</span><span style="color:${up}">${fmt(candle.high)}</span>
          <span style="opacity:0.55">저가</span><span style="color:${dn}">${fmt(candle.low)}</span>
          <span style="opacity:0.55">종가</span><span style="color:${cl};font-weight:600">${fmt(candle.close)}</span>
          <span style="opacity:0.55">등락</span><span style="color:${cl}">${isUp ? '+' : ''}${fmt(chg)} (${isUp ? '+' : ''}${pct}%)</span>
          <span style="opacity:0.55">거래량</span><span>${fmt(candle.volume)}</span>
        </div>`;

      // 이평선 (단기→장기)
      const sd = param.seriesData as Map<ISeriesApi<'Line'>, unknown>;
      const maRows = [...overlayRef.current.ma]
        .sort((a, b) => a.period - b.period)
        .map(({ period, s }) => {
          const v = lineVal(sd, s);
          return v !== null ? `<span style="opacity:0.55;color:${MA_SOLID[period]}">MA${period}</span><span>${fmt(Math.round(v))}</span>` : '';
        }).filter(Boolean);

      // 볼린저밴드
      const bbRows: string[] = [];
      const { bbUpper, bbMid, bbLower } = overlayRef.current;
      if (bbUpper) { const v = lineVal(sd, bbUpper); if (v !== null) bbRows.push(`<span style="opacity:0.55;color:#818cf8">BB상</span><span>${fmt(Math.round(v))}</span>`); }
      if (bbMid)   { const v = lineVal(sd, bbMid);   if (v !== null) bbRows.push(`<span style="opacity:0.55;color:#6366f1">BB중</span><span>${fmt(Math.round(v))}</span>`); }
      if (bbLower) { const v = lineVal(sd, bbLower);  if (v !== null) bbRows.push(`<span style="opacity:0.55;color:#818cf8">BB하</span><span>${fmt(Math.round(v))}</span>`); }

      const indicatorRows = [...maRows, ...bbRows];
      if (indicatorRows.length > 0) {
        rows += `<div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(128,128,128,0.2);display:grid;grid-template-columns:auto auto;gap:2px 14px;font-size:12px;line-height:1.6">${indicatorRows.join('')}</div>`;
      }
      if (rsiS) {
        const v = lineVal(sd, rsiS);
        if (v !== null) {
          const rc = v >= 70 ? up : v <= 30 ? dn : '#a78bfa';
          rows += `<div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(128,128,128,0.2);display:grid;grid-template-columns:auto auto;gap:2px 14px;font-size:12px;line-height:1.6"><span style="opacity:0.55;color:#a78bfa">RSI</span><span style="color:${rc};font-weight:600">${v.toFixed(2)}</span></div>`;
        }
      }
      if (obvS) {
        const v = lineVal(sd, obvS);
        if (v !== null) {
          rows += `<div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(128,128,128,0.2);display:grid;grid-template-columns:auto auto;gap:2px 14px;font-size:12px;line-height:1.6"><span style="opacity:0.55;color:#34d399">OBV</span><span style="color:#34d399">${fmtObv(v)}</span></div>`;
        }
      }

      tooltip.innerHTML = `<div style="margin-bottom:5px;font-size:11px;opacity:0.5;font-weight:500">${candle.date}</div>${rows}`;
      tooltip.style.display = 'block';
      const cw = container.clientWidth, ch = container.clientHeight;
      const tw = tooltip.offsetWidth || 160, th = tooltip.offsetHeight || 120;
      // 좌우: 오른쪽에 공간 없으면 왼쪽으로
      const left = param.point.x + 16 + tw > cw
        ? param.point.x - tw - 16
        : param.point.x + 16;
      // 상하: 아래로 잘리면 커서 위로 올림
      let top = param.point.y - 40;
      if (top + th > ch) top = param.point.y - th - 10;
      tooltip.style.left = `${Math.max(4, left)}px`;
      tooltip.style.top  = `${Math.max(4, top)}px`;
    });

    // ResizeObserver
    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ 
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    });
    ro.observe(containerRef.current);

    chartRef.current        = chart;
    candleSeriesRef.current = candleSeries;

    return () => {
      // 서브 패널 높이만 저장 (가격 패널은 항상 나머지로 계산)
      let si = 1;
      if (indicators.volume) savePaneH(PANE_KEYS.vol, chart.panes()[si++].getHeight());
      if (indicators.rsi)    savePaneH(PANE_KEYS.rsi, chart.panes()[si++].getHeight());
      if (indicators.obv)    savePaneH(PANE_KEYS.obv, chart.panes()[si++].getHeight());
      ro.disconnect();
      chart.remove();
      chartRef.current        = null;
      candleSeriesRef.current = null;
      overlayRef.current      = { ma: [], bbUpper: null, bbMid: null, bbLower: null };
    };
  // MA·BB는 이 effect의 dep에서 제외 → 오버레이 변경 시 차트 재생성 없음
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles, isDark, indicators.volume, indicators.rsi, indicators.obv]);

  // ── Effect 2: 오버레이 시리즈만 교체 (차트 재생성 없음) ─────────────────────

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || candles.length === 0) return;

    // 기존 오버레이 제거
    for (const { s } of overlayRef.current.ma) chart.removeSeries(s);
    if (overlayRef.current.bbUpper) chart.removeSeries(overlayRef.current.bbUpper);
    if (overlayRef.current.bbMid)   chart.removeSeries(overlayRef.current.bbMid);
    if (overlayRef.current.bbLower) chart.removeSeries(overlayRef.current.bbLower);
    overlayRef.current = { ma: [], bbUpper: null, bbMid: null, bbLower: null };

    // 이평선 추가 (긴 기간 먼저 → 단기선이 위에 렌더)
    const newMa: typeof overlayRef.current.ma = [];
    for (const period of [...indicators.ma].sort((a, b) => b - a)) {
      const s = chart.addSeries(LineSeries, {
        color: MA_COLORS[period] ?? 'rgba(148,163,184,0.6)',
        lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      }, 0);
      s.setData(calcMA(candles, period).map((d) => ({ time: d.time as Time, value: d.value })));
      newMa.push({ period, s });
    }
    overlayRef.current.ma = newMa;

    // 볼린저밴드 추가
    if (indicators.bb) {
      const bbData = calcBB(candles);
      const addBB = (bbKey: 'upper' | 'middle' | 'lower', color: string, lineStyle: number) => {
        const s = chart.addSeries(LineSeries, {
          color, lineWidth: 1, lineStyle,
          priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
        }, 0);
        s.setData(bbData.map((d) => ({ time: d.time as Time, value: d[bbKey] })));
        return s;
      };
      overlayRef.current.bbUpper = addBB('upper',  'rgba(129,140,248,0.5)', 2);
      overlayRef.current.bbMid   = addBB('middle', 'rgba(99,102,241,0.45)', 1);
      overlayRef.current.bbLower = addBB('lower',  'rgba(129,140,248,0.5)', 2);
    }
  // Effect 1의 deps를 모두 포함 → Effect 1이 차트를 재생성하면 Effect 2도 반드시 실행
  // + maKey, bb → MA/BB만 바뀔 때는 Effect 2만 실행 (차트 재생성 없음)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles, isDark, indicators.volume, indicators.rsi, indicators.obv, maKey, indicators.bb]);

  // 외부 래퍼: CSS 고정 높이로 페이지 레이아웃을 anchor
  // 내부 containerRef: absolute inset-0 으로 래퍼를 채움
  // → lightweight-charts가 JS로 높이를 조정해도 래퍼 바깥 레이아웃에 영향 없음
  return (
    <div className="relative w-full h-[450px] md:h-[590px]">
      <div ref={containerRef} className="absolute inset-0" />
      <div
        ref={tooltipRef}
        style={{ display: 'none' }}
        className="pointer-events-none absolute z-10 rounded-lg border border-border bg-card/95 px-3 py-2.5 text-foreground shadow-lg backdrop-blur-sm"
      />
    </div>
  );
}
