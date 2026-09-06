"use client";

import { useEffect, useRef, useState } from "react";
import { CandlestickSeries, HistogramSeries, LineSeries, ColorType, CrosshairMode, LineStyle, createChart, createSeriesMarkers, type IChartApi, type Time, type Logical } from "lightweight-charts";
import type { DailyProjectionData, CandleProjection } from "@/lib/research/daily-candle-projection-core";

const formatPrice = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: n < 1 ? 6 : 2 });

/** Actual provider OHLC only on the left. Future scenario has its own shading,
 * label and immutable archive. No fabricated volume or historical candles. */
export function ResearchCandleTerminal({ data, projection, en, band }: {
  data: DailyProjectionData; projection?: CandleProjection; en: boolean; band: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const divider = useRef<HTMLDivElement>(null);
  const api = useRef<IChartApi | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [indicators, setIndicators] = useState(false);
  const [fault, setFault] = useState(false);
  const future = projection?.candles ?? [];
  const selected = future.find(b => b.date === hoverDate) ?? data.bars.find(b => b.date === hoverDate) ?? future[0] ?? data.bars.at(-1)!;
  const isFuture = future.some(b => b.date === selected.date);

  useEffect(() => {
    if (!container.current) return;
    const root = container.current;
    setFault(false);
    let chart: IChartApi | null = null;
    let observer: ResizeObserver | null = null;
    let frame = 0;
    try {
      chart = createChart(root, {
        width: root.clientWidth, height: 560,
        layout: { background: { type: ColorType.Solid, color: "#0b1220" }, textColor: "#bdc9dc", fontSize: 12, attributionLogo: true },
        grid: { vertLines: { color: "#172235" }, horzLines: { color: "#172235" } },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: { minimumWidth: 92, borderColor: "#334155", scaleMargins: { top: .12, bottom: .23 } },
        timeScale: { borderColor: "#334155", rightOffset: 3, minBarSpacing: 5, timeVisible: false },
        localization: { locale: en ? "en-US" : "zh-CN", dateFormat: "yyyy-MM-dd", priceFormatter: formatPrice },
        handleScroll: { mouseWheel: false, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      });
      api.current = chart;
      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#26a69a", downColor: "#ef5350", borderVisible: true,
        borderUpColor: "#26a69a", borderDownColor: "#ef5350", wickUpColor: "#26a69a", wickDownColor: "#ef5350",
        priceFormat: { type: "price", precision: data.bars.at(-1)!.close < 1 ? 6 : 2, minMove: data.bars.at(-1)!.close < 1 ? .000001 : .01 },
        lastValueVisible: false, priceLineVisible: false,
      });
      const actualBars = data.bars.slice(-70);
      const modelBars = projection?.candles ?? [];
      series.setData([...actualBars.map(b => ({ time: b.date as Time, open: b.open, high: b.high, low: b.low, close: b.close })),
        ...modelBars.map(b => ({ time: b.date as Time, open: b.open, high: b.high, low: b.low, close: b.close,
          color: b.close >= b.open ? "#26a69a" : "#ef5350", borderColor: b.close >= b.open ? "#80cbc4" : "#ffab91", wickColor: b.close >= b.open ? "#80cbc4" : "#ffab91" }))]);
      const last = actualBars.at(-1)!;
      series.createPriceLine({ price: last.close, color: "#cbd5e1", lineStyle: LineStyle.Dotted, axisLabelVisible: true, title: en ? "Last real close" : "真实收盘" });
      for (const [zone, color, title] of [[data.support, "#38bdf8", en ? "Support" : "支撑"], [data.resistance, "#fb7185", en ? "Resistance" : "压力"]] as const) {
        if (zone) series.createPriceLine({ price: (zone.high + zone.low) / 2, color, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title });
      }
      const volume = chart.addSeries(HistogramSeries, { priceScaleId: "volume", priceFormat: { type: "volume" }, lastValueVisible: false, priceLineVisible: false });
      volume.priceScale().applyOptions({ scaleMargins: { top: .84, bottom: 0 } });
      volume.setData(actualBars.filter(b => b.volume !== null).map(b => ({ time: b.date as Time, value: b.volume!, color: b.close >= b.open ? "#26a69a66" : "#ef535066" })));
      if (indicators) for (const [period, color] of [[20, "#fbbf24"], [60, "#60a5fa"]] as const) {
        let value = data.bars.slice(0, period).reduce((sum, b) => sum + b.close, 0) / period;
        const points = data.bars.flatMap((bar, i) => {
          if (i >= period) value += 2 / (period + 1) * (bar.close - value);
          return i >= period - 1 && bar.date >= actualBars[0]!.date ? [{ time: bar.date as Time, value }] : [];
        });
        chart.addSeries(LineSeries, { color, lineWidth: 1, lastValueVisible: false, priceLineVisible: false, title: `EMA${period}` }).setData(points);
      }
      if (band) for (const key of ["rangeLow", "rangeHigh"] as const) {
        chart.addSeries(LineSeries, { color: "#a78bfa", lineWidth: 1, lineStyle: LineStyle.Dashed, lastValueVisible: false, priceLineVisible: false }).setData(modelBars.map(b => ({ time: b.date as Time, value: b[key] })));
      }
      const dates = new Set(modelBars.map(b => b.date));
      const markers = (projection?.windows ?? []).filter(w => w.evidence === "EXPLICIT")
        .map(w => ({ date: w.closed ? w.nextSessionDate : w.focusDate, text: w.focusDate.slice(5) + (en ? " watch" : "观察") }))
        .filter((w): w is { date: string; text: string } => w.date !== null && dates.has(w.date));
      createSeriesMarkers(series, markers.sort((a, b) => a.date.localeCompare(b.date)).map(w => ({ time: w.date as Time, position: "aboveBar", shape: "circle", color: "#c4b5fd", text: w.text })));
      const updateDivider = () => {
        if (!divider.current || !chart || !modelBars.length) return;
        const coord = chart.timeScale().logicalToCoordinate(actualBars.length as Logical);
        if (coord === null) return;
        const spacing = chart.timeScale().options().barSpacing;
        divider.current.style.display = "block";
        divider.current.style.left = `${Math.max(0, Math.min(root.clientWidth - 92, coord - spacing / 2))}px`;
      };
      chart.timeScale().subscribeVisibleLogicalRangeChange(updateDivider);
      chart.subscribeCrosshairMove(param => {
        if (!param.time) return;
        const time = typeof param.time === "string" ? param.time : typeof param.time === "number" ? new Date(param.time * 1000).toISOString().slice(0, 10) : `${param.time.year}-${String(param.time.month).padStart(2, "0")}-${String(param.time.day).padStart(2, "0")}`;
        setHoverDate(time);
      });
      chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, actualBars.length - 18), to: actualBars.length + modelBars.length + 2 });
      updateDivider();
      frame = requestAnimationFrame(updateDivider);
      observer = new ResizeObserver(() => { chart?.applyOptions({ width: root.clientWidth }); updateDivider(); });
      observer.observe(root);
    } catch { chart?.remove(); chart = null; api.current = null; setFault(true); }
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); chart?.remove(); api.current = null; };
    // Hover must not recreate the chart or reset the user's zoom.
  }, [data, projection, en, band, indicators]);

  return <div className="overflow-hidden rounded-xl border border-slate-700 bg-[#0b1220]" data-candle-terminal="v2">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 text-xs">
      <strong className="text-base">{data.quoteSymbol} · 1D</strong>
      <span className="text-emerald-300">■ {en ? "Up" : "涨"}</span><span className="text-red-300">■ {en ? "Down" : "跌"}</span>
      <label><input type="checkbox" checked={indicators} onChange={e => setIndicators(e.target.checked)} /> EMA20 / EMA60</label>
      <button type="button" onClick={() => { const n = data.bars.slice(-70).length; api.current?.timeScale().setVisibleLogicalRange({ from: Math.max(0, n - 18), to: n + future.length + 2 }); }} className="rounded border border-slate-600 px-3 py-1">{en ? "Reset view" : "重置视图"}</button>
      <button type="button" onClick={() => { const n = data.bars.slice(-70).length; api.current?.timeScale().setVisibleLogicalRange({ from: n - 2, to: n + future.length + 1 }); }} disabled={!future.length} className="rounded border border-slate-600 px-3 py-1 disabled:opacity-40">{en ? "Focus forecast" : "放大预测区"}</button>
    </div>
    <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-3 font-mono text-sm" aria-live="polite">
      <span className={isFuture ? "text-amber-200" : "text-cyan-200"}>{isFuture ? en ? "SIMULATION" : "模拟情景" : en ? "ACTUAL" : "真实行情"} {selected.date}</span>
      {[ [en ? "O" : "开", selected.open], [en ? "H" : "高", selected.high], [en ? "L" : "低", selected.low], [en ? "C" : "收", selected.close] ].map(([label, value]) => <span key={label}>{label} <strong>{formatPrice(Number(value))}</strong></span>)}
    </div>
    <div className="relative" style={{ minHeight: 560 }}>
      <div ref={container} style={{ height: 560 }} role="img" aria-label={en ? "Interactive actual and simulated OHLC chart. Drag or pinch to zoom. Daily prices available in table below." : "可缩放真实与模拟K线图，日期开高低收可在下方表格读取。"} />
      {future.length ? <div ref={divider} style={{ display: "none", pointerEvents: "none", position: "absolute", zIndex: 3, top: 0, bottom: 28, right: 92, borderLeft: "2px dashed #fbbf24", background: "rgba(251,191,36,.045)" }}><span style={{ position: "absolute", top: 5, left: 6, whiteSpace: "nowrap", background: "#322b1b" }} className="rounded px-2 py-1 text-xs text-amber-200">{en ? "SIMULATED · NOT ACTUAL" : "未来模拟区 · 非真实行情"}</span></div> : null}
      {fault ? <p role="alert" className="absolute inset-0 bg-slate-900 p-6 text-amber-200">{en ? "Chart could not load. Use the dated OHLC table below and refresh." : "图表加载失败，请先查看下方逐日价格表并刷新。"}</p> : null}
    </div>
    <div className="flex flex-wrap justify-between gap-2 px-4 py-2 text-xs text-slate-400"><span>{en ? "Drag / pinch to zoom · Volume is historical only" : "拖动查看／双指缩放 · 成交量仅为历史真实数据"}</span><a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">Charts by TradingView Lightweight Charts™</a></div>
  </div>;
}
