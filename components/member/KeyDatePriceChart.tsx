"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { ChartWindow, ChartZone } from "@/lib/presentation/key-date-chart";
import type { DailyProjectionData } from "@/lib/research/daily-candle-projection-core";
import type { ForecastPath } from "@/lib/presentation/forecast-path";
import { DailyCandleChart } from "./DailyCandleChart";

const DAY = 86_400_000;
const day = (date: string) => Date.parse(`${date}T00:00:00Z`);
const labels = {
  strength: ["转强观察", "Strength watch"], risk: ["回撤风险", "Pullback risk"],
  low: ["低点候选", "Potential low"], high: ["高点候选", "Potential high"], watch: ["节奏观察", "Timing watch"],
};
const colors = { strength: "#34d399", risk: "#fb7185", low: "#38bdf8", high: "#fbbf24", watch: "#a78bfa" };
const format = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: value < 10 ? 4 : 2 });
const zoneText = (zone: ChartZone | null) => zone ? `${format(zone.low)}–${format(zone.high)}` : "—";

export function KeyDatePriceChart({ windows, asOfDate: initialDate }: { windows: ChartWindow[]; paths: ForecastPath[]; asOfDate: string }) {
  const { locale } = useLocale();
  const en = locale === "en";
  const assets = [...new Map(windows.map(w => [w.assetId, w.symbol])).entries()];
  const [asset, setAsset] = useState(assets.some(([id]) => id === "btc") ? "btc" : assets[0]?.[0] ?? "btc");
  const [request, setRequest] = useState(0);
  const [state, setState] = useState<{ asset: string; data?: DailyProjectionData; error?: string } | null>(null);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") setRequest(n => n + 1); };
    const timer = window.setInterval(refresh, 5 * 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setState(null);
    fetch(`/api/member/key-date-chart?asset=${encodeURIComponent(asset)}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "MARKET_DATA_UNAVAILABLE");
        if (result.assetId !== asset || !Array.isArray(result.bars) || !result.bars.length) throw new Error("MARKET_DATA_UNAVAILABLE");
        if (!controller.signal.aborted) setState({ asset, data: result });
      }).catch(error => { if (!controller.signal.aborted) setState({ asset, error: error.message }); });
    return () => controller.abort();
  }, [asset, request]);
  const data = state?.asset === asset ? state.data : undefined;
  const error = state?.asset === asset ? state.error : undefined;
  const asOfDate = data?.projectionDate ?? initialDate;
  const end = day(asOfDate) + 40 * DAY;
  const rows = windows.filter(w => w.assetId === asset && day(w.endDate) >= day(asOfDate) && day(w.startDate) <= end);
  const bars = data?.bars ?? [];
  const start = bars.length ? day(bars[0]!.date) : day(asOfDate) - 30 * DAY;
  const x = (date: string) => 52 + (day(date) - start) / (end - start) * 730;
  const levels = data ? [data.support?.low, data.support?.high, data.resistance?.low, data.resistance?.high].filter((v): v is number => v !== undefined) : [];
  const low = Math.min(...bars.map(b => b.low), ...levels);
  const high = Math.max(...bars.map(b => b.high), ...levels);
  const padding = Math.max((high - low) * 0.1, high * 0.002);
  const y = (price: number) => 42 + (high + padding - price) / (high - low + 2 * padding) * 215;
  const step = 730 * DAY / (end - start);
  const label = (w: ChartWindow) => labels[w.kind][en ? 1 : 0];
  const nearest = rows.slice().sort((a, b) => a.focusDate.localeCompare(b.focusDate))[0];
  const atResistance = data?.resistance && bars.length && data.resistance.low - bars.at(-1)!.close <= bars.at(-1)!.close * 0.015;
  return <section id="price-time-chart" className="rounded-3xl border border-cyan-300/20 bg-[#0b1018] p-4 sm:p-6 text-slate-100" data-key-date-chart="v3">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h2 className="text-xl font-semibold">{en ? "Daily candle forecast · dates & prices" : "未来日K预测 · 日期与价格"}</h2>
        <p className="mt-1 text-sm text-slate-400">{en ? "Actual daily candles on the left · conditional forecast candles on the right · updated after daily closes" : "左侧真实日K · 右侧未来日K情景推演 · 收盘后自动更新"}</p></div>
      <div className="flex items-center gap-2"><label className="sr-only" htmlFor="chart-asset">{en ? "Asset" : "标的"}</label>
        <select id="chart-asset" value={asset} onChange={e => setAsset(e.target.value)} className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2">
          {assets.map(([id, symbol]) => <option key={id} value={id}>{symbol}</option>)}
        </select><button type="button" onClick={() => setRequest(n => n + 1)} className="rounded-lg border border-slate-600 px-3 py-2 text-sm">{en ? "Refresh" : "刷新"}</button></div>
    </div>
    <div aria-live="polite" className="mt-4">
      {!data && !error ? <p className="p-4 text-slate-400">{en ? "Loading closed daily candles…" : "读取已闭合日K线…"}</p> : null}
      {error ? <p className="rounded-lg border border-amber-300/20 p-4 text-amber-200">{error === "UNSUPPORTED_MARKET"
        ? en ? "No verified price feed for this asset yet. Its key dates remain below; no substitute ticker or simulated candles are used." : "该标的暂未接入已核实行情。下方关键日仍保留，不用其他标的或模拟K线替代。"
        : error === "MEMBER_ACCESS_REQUIRED" ? en ? "Please sign in with an active member device to load the chart." : "请确认会员登录与设备权限后刷新图表。"
          : en ? "Price data could not be loaded. Retry shortly; no previous asset's chart is shown." : "行情暂未读取成功，请稍后刷新；不会残留上一个标的的图。"}</p> : null}
    </div>
    {data ? <DailyCandleChart key={asset} data={data} en={en} /> : null}
    <details className="mt-5"><summary className="cursor-pointer text-sm text-cyan-200">{en ? "Detailed support / resistance & timing bands" : "展开支撑压力与月周关键日色带"}</summary>
    {data ? <>
      <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
        <div className="rounded-xl bg-sky-400/10 p-3">{en ? "Daily support zone" : "日线支撑区"}<strong className="mt-1 block text-sky-200">{zoneText(data.support)}</strong></div>
        <div className="rounded-xl bg-rose-400/10 p-3">{en ? "Daily resistance zone" : "日线压力区"}<strong className="mt-1 block text-rose-200">{zoneText(data.resistance)}</strong></div>
        <div className="rounded-xl bg-white/5 p-3">{en ? "Nearest timing watch" : "最近时间观察"}<strong className="mt-1 block">{nearest ? `${nearest.focusDate} · ${label(nearest)}` : en ? "No dated window" : "暂无明确日期"}</strong>{nearest?.closed ? <span className="mt-1 block text-xs text-amber-200">{en ? `Closed / verify session. Next: ${nearest.nextSessionDate ?? 'unconfirmed'}` : `休市／时段待核实。下一交易日：${nearest.nextSessionDate ?? '待核实'}`}</span> : null}</div>
      </div>
      <p className={`mt-3 text-sm ${data.stale || atResistance ? "text-amber-200" : "text-slate-300"}`}>{data.stale
        ? en ? "Stale snapshot — do not use these levels for a current entry." : "行情快照已过期，不作为当前入场依据。"
        : atResistance ? en ? "Last closed price is near daily resistance. Wait for a confirmed breakout; a bullish outlook is not a reason to chase." : "最新闭合价格已接近日线压力；等突破站稳，不因方向看涨就追高。"
          : en ? "Hold above support and confirm demand; at resistance, watch for rejection or a sustained breakout." : "回踩支撑先看企稳；到压力区，区分冲高受阻和突破站稳。"}</p>
      <div className="mt-4 overflow-x-auto" tabIndex={0} role="region" aria-label={en ? "Scrollable price and timing chart" : "可横向滚动的价格与时间图"}>
        <svg viewBox="0 0 900 395" className="w-full min-w-[760px]" role="img" aria-label={en ? `${data.quoteSymbol}: real daily candles and separate monthly/weekly forecast windows` : `${data.quoteSymbol}真实日K与月周关键日色带`}>
          <title>{en ? "Observed candles and dated research windows, not a forecast price curve" : "真实K线及已记录时间窗口，不是未来价格曲线"}</title>
          <rect x={x(asOfDate)} y="35" width={Math.max(0, 782 - x(asOfDate))} height="230" fill="#94a3b8" opacity="0.04" />
          {[0, 1, 2, 3].map(i => { const price = low + (high - low) * i / 3; return <g key={i}><line x1="52" x2="782" y1={y(price)} y2={y(price)} stroke="#334155" strokeDasharray="3 5" /><text x="790" y={y(price) + 4} fontSize="11" fill="#94a3b8">{format(price)}</text></g>; })}
          {([['support', '#38bdf8'], ['resistance', '#fb7185']] as const).map(([key, color]) => { const zone = data[key]; return zone ? <g key={key}><rect x="52" width="730" y={y(zone.high)} height={Math.max(2, y(zone.low) - y(zone.high))} fill={color} opacity="0.2" /><line x1="52" x2="782" y1={y(zone.low)} y2={y(zone.low)} stroke={color} strokeDasharray="5 4" /><title>{zoneText(zone)} · {zone.touches} {en ? "confirmed pivots" : "已确认拐点"}</title></g> : null; })}
          {bars.map(bar => { const color = bar.close >= bar.open ? "#34d399" : "#fb7185"; return <g key={bar.date}><title>{`${bar.date} O ${format(bar.open)} H ${format(bar.high)} L ${format(bar.low)} C ${format(bar.close)}`}</title><line x1={x(bar.date)} x2={x(bar.date)} y1={y(bar.high)} y2={y(bar.low)} stroke={color} /><rect x={x(bar.date) - step * 0.3} width={step * 0.6} y={y(Math.max(bar.open, bar.close))} height={Math.max(1, Math.abs(y(bar.open) - y(bar.close)))} fill={color} /></g>; })}
          <line x1={x(asOfDate)} x2={x(asOfDate)} y1="22" y2="365" stroke="#e2e8f0" strokeDasharray="3 4" />
          <text x={x(asOfDate) - 4} y="17" textAnchor="end" fill="#cbd5e1" fontSize="11">{en ? "Today" : "今天"} {asOfDate.slice(5)}</text>
          {(["MONTH", "WEEK"] as const).map((level, lane) => <g key={level}><text x="2" y={310 + lane * 36} fill="#cbd5e1" fontSize="11">{level === "MONTH" ? en ? "Month" : "月" : en ? "Week" : "周"}</text><rect x="52" y={291 + lane * 36} width="730" height="27" fill="#1e293b" />{rows.filter(w => w.level === level).map(w => <g key={w.id}><rect x={Math.max(52, x(w.startDate))} y={293 + lane * 36} width={Math.max(3, Math.min(782, x(w.endDate) + step) - Math.max(52, x(w.startDate)))} height="23" fill={colors[w.kind]} fillOpacity="0.22" stroke={colors[w.kind]} strokeDasharray={w.evidence === "DERIVED" ? "3 3" : undefined}><title>{`${w.startDate}–${w.endDate}: ${label(w)}${w.closed ? en ? ' (market closed on focus date)' : '（重点日休市）' : ''}`}</title></rect><circle cx={Math.min(782, x(w.focusDate))} cy={305 + lane * 36} r="2" fill={colors[w.kind]} /></g>)}</g>)}
          {Array.from({ length: Math.ceil((end - start) / (14 * DAY)) + 1 }, (_, i) => new Date(start + i * 14 * DAY).toISOString().slice(0, 10)).filter(date => day(date) <= end).map(date => <text key={date} x={x(date)} y="383" textAnchor="middle" fill="#94a3b8" fontSize="11">{date.slice(5)}</text>)}
        </svg>
      </div>
      <p className="text-xs text-slate-400">{data.quoteSymbol} · {data.source} · 1D · {data.timeZone} · {en ? "Last closed session" : "最新闭合交易日"}: {data.asOf}</p>
      <p className="mt-1 text-xs text-slate-400">{en ? "Candles: green up / red down. Zones: repeated daily pivots, not volume profile or guaranteed support. — means insufficient repeated pivots." : "K线：绿涨红跌。价格区间来自日线重复拐点，并非筹码分布或保证有效的支撑；— 表示重复拐点不足。"}</p>
    </> : null}
    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs">{Object.entries(labels).map(([kind, names]) => <span key={kind} style={{ color: colors[kind as keyof typeof colors] }}>■ {names[en ? 1 : 0]}</span>)}</div>
    <p className="mt-2 text-xs text-slate-400">{en ? "Solid border: explicitly dated. Dashed: derived window. Overlaps retain separate opinions; colours do not multiply confidence. Showing the next 40 days." : "实线边框：明确日期；虚线：推演窗口。重叠保留各自记录，不因色块叠加提高信心。展示未来40天。"}</p>
    <details className="mt-4"><summary className="cursor-pointer text-sm text-cyan-200">{en ? "Read dates and market closures" : "展开日期与休市说明"} ({rows.length})</summary>
      <ul className="mt-3 space-y-2 text-sm">{rows.map(w => <li key={w.id} className="border-l-2 pl-3" style={{ borderColor: colors[w.kind] }}><span className="font-medium">{w.level === "MONTH" ? en ? "Monthly" : "月" : en ? "Weekly" : "周"} · {w.startDate}–{w.endDate} · {label(w)}</span><span className="ml-2 text-slate-400">{w.evidence === "DERIVED" ? en ? "Derived" : "推演" : en ? "Explicit date" : "明确日期"}</span>{w.closed ? <p className="text-amber-200">{en ? `Focus date ${w.focusDate}: closed / session needs verification. ${w.nextSessionDate ? `Next session: ${w.nextSessionDate}.` : ''} No automatic trade.` : `重点日 ${w.focusDate} 休市／时段待核实；${w.nextSessionDate ? `下一交易日 ${w.nextSessionDate}。` : ''}不按日期直接买卖。`}</p> : null}</li>)}</ul>
      {!rows.length ? <p className="mt-2 text-slate-400">{en ? "No active dated window for this asset in this range." : "该标的在此区间暂无有效关键日。"}</p> : null}
    </details>
    </details>
  </section>;
}
