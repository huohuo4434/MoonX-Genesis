"use client";

import { useEffect, useRef, useState } from "react";
import { CandlestickSeries, HistogramSeries, LineSeries, ColorType, CrosshairMode, LineStyle, createChart, createSeriesMarkers, type AutoscaleInfo, type IChartApi, type Time, type Logical } from "lightweight-charts";
import type { DailyProjectionData, CandleProjection } from "@/lib/research/daily-candle-projection-core";
import { chartLevelLadder } from "@/lib/presentation/key-date-chart";
import { technicalChartContext } from "@/lib/research/technical-chart-context";
import { czscInput, validateCzscSnapshot, type CzscSnapshot } from "@/lib/research/czsc-research-contract";

const formatPrice = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: n < .001 ? 10 : n < 1 ? 6 : 2 });

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
  const [allLevels, setAllLevels] = useState(true);
  const [macd, setMacd] = useState(true);
  const [czsc, setCzsc] = useState<{ key: string; report: CzscSnapshot } | null>(null);
  const [researchError, setResearchError] = useState(false);
  const technical = technicalChartContext(data.bars);
  const researchInput = !data.stale && data.bars.length >= 20 ? czscInput(data) : null;
  const researchKey = researchInput ? JSON.stringify(researchInput) : "";
  // A refresh, correction, or symbol change hides an old local report immediately.
  const overlay = czsc?.key === researchKey && researchKey ? czsc.report : null;
  const ladder = chartLevelLadder(data.bars);
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
        priceFormat: { type: "price", precision: data.bars.at(-1)!.close < .001 ? 10 : data.bars.at(-1)!.close < 1 ? 6 : 2, minMove: data.bars.at(-1)!.close < .001 ? 1e-10 : data.bars.at(-1)!.close < 1 ? .000001 : .01 },
        lastValueVisible: false, priceLineVisible: false,
      });
      const actualBars = data.bars.slice(-70);
      const modelBars = projection?.candles ?? [];
      series.setData([...actualBars.map(b => ({ time: b.date as Time, open: b.open, high: b.high, low: b.low, close: b.close })),
        ...modelBars.map(b => ({ time: b.date as Time, open: b.open, high: b.high, low: b.low, close: b.close,
          color: b.close >= b.open ? "#26a69a" : "#ef5350", borderColor: b.close >= b.open ? "#80cbc4" : "#ffab91", wickColor: b.close >= b.open ? "#80cbc4" : "#ffab91" }))]);
      const last = actualBars.at(-1)!;
      series.createPriceLine({ price: last.close, color: "#cbd5e1", lineStyle: LineStyle.Dotted, axisLabelVisible: true, title: en ? "Last real close" : "真实收盘" });
      const levels = chartLevelLadder(data.bars);
      const shown = [...levels.supports.slice(0, allLevels ? 5 : 3), ...levels.resistances.slice(0, allLevels ? 5 : 3)];
      series.applyOptions({ autoscaleInfoProvider: (original: () => AutoscaleInfo | null) => {
        const info = original();
        return info?.priceRange && shown.length ? { ...info, priceRange: {
          minValue: Math.min(info.priceRange.minValue, ...shown.map(z => z.low)),
          maxValue: Math.max(info.priceRange.maxValue, ...shown.map(z => z.high)),
        } } : info;
      } });
      for (const [zones, color, prefix] of [[levels.supports, "#38bdf8", "S"], [levels.resistances, "#fb7185", "R"]] as const) {
        zones.slice(0, allLevels ? 5 : 3).forEach((zone, index) => series.createPriceLine({
          price: (zone.high + zone.low) / 2, color,
          lineStyle: zone.touches >= 2 ? LineStyle.Dashed : LineStyle.Dotted,
          axisLabelVisible: true, title: `${prefix}${index + 1}`,
        }));
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
      if (macd) {
        const points = technicalChartContext(data.bars).points.filter(p => p.date >= actualBars[0]!.date);
        const histogram = chart.addSeries(HistogramSeries, { title: "MACD 2×(DIF−DEA)", priceLineVisible: false, lastValueVisible: false }, 1);
        histogram.setData(points.map(p => ({ time: p.date as Time, value: p.histogram, color: p.histogram >= 0 ? "#26a69a" : "#ef5350" })));
        histogram.createPriceLine({ price: 0, color: "#94a3b8", lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: "0" });
        for (const [key, color] of [["dif", "#fbbf24"], ["dea", "#a78bfa"]] as const) {
          chart.addSeries(LineSeries, { title: key.toUpperCase(), color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false }, 1)
            .setData(points.map(p => ({ time: p.date as Time, value: p[key] })));
        }
        chart.panes()[1]?.setHeight(135);
      }
      if (overlay) {
        for (const s of overlay.strokes.filter(s => s.start >= actualBars[0]!.date)) {
          chart.addSeries(LineSeries, { color: "#c4b5fd", lineWidth: 2, lastValueVisible: false, priceLineVisible: false })
            .setData([{ time: s.start as Time, value: s.startPrice }, { time: s.end as Time, value: s.endPrice }]);
        }
        for (const z of overlay.zones.slice(-3).filter(z => z.end >= actualBars[0]!.date)) {
          for (const value of [z.low, z.high]) chart.addSeries(LineSeries, { color: "#f59e0b", lineWidth: 1,
            lineStyle: LineStyle.Dashed, lastValueVisible: false, priceLineVisible: false })
            .setData([{ time: (z.start < actualBars[0]!.date ? actualBars[0]!.date : z.start) as Time, value }, { time: z.end as Time, value }]);
        }
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
  }, [data, projection, en, band, indicators, allLevels, macd, overlay]);

  return <div className="overflow-hidden rounded-xl border border-slate-700 bg-[#0b1220]" data-candle-terminal="v2">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 text-xs">
      <strong className="text-base">{data.quoteSymbol} · 1D</strong>
      <span className="text-emerald-300">■ {en ? "Up" : "涨"}</span><span className="text-red-300">■ {en ? "Down" : "跌"}</span>
      <label><input type="checkbox" checked={indicators} onChange={e => setIndicators(e.target.checked)} /> EMA20 / EMA60</label>
      <label><input type="checkbox" checked={macd} onChange={e => setMacd(e.target.checked)} /> MACD (12,26,9)</label>
      <label><input type="checkbox" checked={allLevels} onChange={e => setAllLevels(e.target.checked)} />{en ? "All levels (up to 5 per side)" : "全部层级（每侧最多5档）"}</label>
      <button type="button" onClick={() => { const n = data.bars.slice(-70).length; api.current?.timeScale().setVisibleLogicalRange({ from: Math.max(0, n - 18), to: n + future.length + 2 }); }} className="rounded border border-slate-600 px-3 py-1">{en ? "Reset view" : "重置视图"}</button>
      <button type="button" onClick={() => { const n = data.bars.slice(-70).length; api.current?.timeScale().setVisibleLogicalRange({ from: n - 2, to: n + future.length + 1 }); }} disabled={!future.length} className="rounded border border-slate-600 px-3 py-1 disabled:opacity-40">{en ? "Focus forecast" : "放大预测区"}</button>
    </div>
    <div className="flex flex-wrap gap-x-5 gap-y-1 border-b border-slate-700 px-4 py-2 text-xs text-slate-300" data-technical-context="v1">
      <span>1D · {data.asOf}{data.stale ? en ? " · STALE" : " · 数据待更新" : ""}</span>
      <span>EMA60: {technical.ema60 === null ? en ? "needs 60 closed bars" : "需60根闭合K线" : `${formatPrice(technical.ema60)} (${technical.ema60DistancePct! >= 0 ? "+" : ""}${technical.ema60DistancePct!.toFixed(1)}%)`}</span>
      <span>{en ? "DIF / DEA: " : "DIF／DEA："}{technical.zeroAxis === "ABOVE" ? en ? "both above zero" : "均在零轴上方" : technical.zeroAxis === "BELOW" ? en ? "both below zero" : "均在零轴下方" : technical.zeroAxis === "CROSSING" ? en ? "around zero" : "零轴交界" : en ? "warming up" : "样本不足"}</span>
      <span>{technical.side === "BULL" ? en ? "Bullish histogram · " : "多头柱 · " : technical.side === "BEAR" ? en ? "Bearish histogram · " : "空头柱 · " : ""}{technical.momentum === "EXPANDING" ? en ? "expanding" : "放大" : technical.momentum === "CONTRACTING" ? en ? "contracting" : "缩短" : technical.momentum === "FLIP" ? en ? "sign changed" : "刚换向" : technical.momentum === "FLAT" ? en ? "flat" : "持平" : en ? "unavailable" : "暂不可用"}</span>
      <span className="text-slate-400">{en ? "Closed bars only; histogram contraction alone is not confirmed divergence." : "只用闭合K线；柱体缩短不等于背驰成立。"}</span>
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
    <details className="border-t border-slate-700 p-4 text-sm" data-czsc-research="v1">
      <summary className="cursor-pointer">{en ? "CZSC structure comparison · research tools" : "CZSC结构对照 · 研究工具"}</summary>
      <p className="my-2 text-xs text-slate-400">{en ? "Export these closed candles, run the pinned CZSC offline worker, then load its JSON report here. Local overlay only; no server upload or orders. Matching symbol, dates and candle hash are required." : "导出当前闭合K线，经固定版本CZSC离线工具分析后，载入JSON报告画出笔与中枢。仅在当前浏览器叠加，不上传服务器、不下单；标的、日期和K线校验值必须一致。"}</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={!researchInput} className="rounded border border-slate-600 px-3 py-1 disabled:opacity-40" onClick={() => {
          if (!researchInput) return;
          const url = URL.createObjectURL(new Blob([JSON.stringify(researchInput)], { type: "application/json" }));
          const link = document.createElement("a"); link.href = url; link.download = `czsc-${data.assetId}-${data.asOf}.json`; link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }}>{en ? "Export candles" : "导出K线"}</button>
        <label className="rounded border border-slate-600 px-3 py-1">{en ? "Load CZSC report" : "载入CZSC报告"}
          <input type="file" accept="application/json,.json" disabled={!researchInput} className="ml-2 max-w-[220px] text-xs" onChange={async e => {
            const file = e.target.files?.[0]; e.target.value = "";
            if (!file) return;
            setResearchError(false);
            try {
              if (file.size > 2_000_000) throw new Error("FILE_TOO_LARGE");
              const report = await validateCzscSnapshot(JSON.parse(await file.text()), data);
              setCzsc({ key: researchKey, report });
            } catch { setCzsc(null); setResearchError(true); }
          }} />
        </label>
        {overlay ? <button type="button" onClick={() => setCzsc(null)}>{en ? "Clear overlay" : "清除叠加"}</button> : null}
      </div>
      {researchError ? <p role="alert" className="mt-2 text-amber-200">{en ? "Report rejected: invalid format or different candles. Export and analyze the current dataset again." : "报告未通过校验：格式不符或不是当前这批K线。请重新导出并分析。"}</p> : null}
      {overlay ? <div className="mt-3 space-y-2 text-xs text-slate-300">
        <p>CZSC 1.0.1 · {en ? `Strokes: ${overlay.strokes.length} / centers: ${overlay.zones.length}; ${overlay.replay.revisions} structure retractions during replay.` : `${overlay.strokes.length}笔／${overlay.zones.length}个中枢；逐根回放中结构撤回${overlay.replay.revisions}次。`}</p>
        <p>{en ? "Purple: strokes. Amber: centers. Endpoint date is NOT signal-availability date. This is structural replay, not a profit backtest." : "紫线为笔，橙线为中枢。拐点日期不等于信号可用日期；这是结构回放，未验证盈利。"}</p>
        {overlay.strokes.slice(-3).map(s => <p key={s.end}>{s.start} → {s.end} · {en ? "Observed in replay: " : "回放可见日："}{s.observedOn}</p>)}
      </div> : <p className="mt-2 text-xs text-slate-400">{en ? "CZSC overlay: no matching report loaded." : "CZSC叠加：尚未载入匹配报告。"}</p>}
    </details>
    <div className="border-t border-slate-700 p-4" data-price-level-ladder="v1">
      <h3 className="font-semibold">{en ? "Support / resistance ladder" : "多级支撑／压力地图"}</h3>
      <p className="mt-1 text-xs text-slate-400">{en ? "R1 → R2 → R3 after a confirmed breakout; S1 → S2 → S3 after a breakdown. Levels are candidates, not automatic orders. Uncheck all levels for a closer 3-level view." : "突破站稳R1，再看R2、R3；跌破S1，再看S2、S3。位置是观察区，不是自动买卖点；取消全部层级可聚焦最近3档。"}</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {([['supports', 'S', en ? 'Support below' : '下方支撑', 'text-sky-200'], ['resistances', 'R', en ? 'Resistance above' : '上方压力', 'text-rose-200']] as const).map(([side, prefix, title, color]) => <div key={side}>
          <h4 className={color}>{title}</h4>
          <ol className="mt-2 space-y-2 text-sm">{ladder[side].map((zone, index) => <li key={zone.low} className="flex flex-wrap justify-between gap-x-3 rounded bg-white/5 px-3 py-2">
            <strong className={color}>{prefix}{index + 1} · {formatPrice(zone.low)}{zone.high !== zone.low ? `–${formatPrice(zone.high)}` : ''}</strong>
            <span className="text-xs text-slate-400">{zone.touches >= 2 ? en ? `${zone.touches} pivot tests` : `${zone.touches}次拐点测试` : en ? 'Single historical pivot' : '单次历史拐点'}</span>
          </li>)}</ol>
          {!ladder[side].length ? <p className="mt-2 text-sm text-slate-400">{en ? 'No confirmed historical pivot on this side in the loaded data; no invented target.' : '当前历史范围内该侧没有已确认拐点，不虚构下一目标。'}</p> : null}
        </div>)}
      </div>
      <p className="mt-3 text-xs text-slate-400">{en ? `Based on ${data.bars.length} closed daily candles through ${data.asOf}. Dashed = clustered pivots; dotted = single pivot. Not volume profile. Broken levels need retest confirmation; future simulated candles do not create these levels.` : `基于截至${data.asOf}的${data.bars.length}根闭合日K。虚线为重复拐点区，点线为单次拐点，并非筹码分布。突破后的支撑压力转换需回踩确认；不拿未来模拟K线生成这些位置。`}</p>
    </div>
  </div>;
}
