"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { MemberStockPathSnapshot, MemberStockPickResearchRow } from "@/types/member-stock-picks-dashboard";

type SnapshotState =
  | { status: "loading"; snapshot: null }
  | { status: "ready"; snapshot: MemberStockPathSnapshot }
  | { status: "error"; snapshot: null };

function directionTone(value: string | null): string {
  if (!value) return "border-white/10 bg-white/[0.03] text-white/45";
  if (/先跌后涨|上涨|震荡上涨|回升|修复/u.test(value)) return "border-emerald-300/25 bg-emerald-300/[0.06] text-emerald-100";
  if (/先涨后跌|下跌|震荡下跌|回落|转弱/u.test(value)) return "border-rose-300/25 bg-rose-300/[0.06] text-rose-100";
  return "border-amber-300/25 bg-amber-300/[0.06] text-amber-100";
}

function relationTone(value: MemberStockPickResearchRow["dailyMethods"][number]["relation"]): string {
  if (value === "RESONANCE") return "border-emerald-300/25 bg-emerald-300/[0.06] text-emerald-100";
  if (value === "DIVERGENCE") return "border-rose-300/25 bg-rose-300/[0.06] text-rose-100";
  return "border-white/10 bg-white/[0.03] text-white/50";
}

function price(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: value < 20 ? 3 : 2 });
}

function directionDelta(direction: string, index: number, total: number): number {
  const phase = total <= 1 ? 1 : index / (total - 1);
  if (/先跌后涨/u.test(direction)) return phase < 0.45 ? -0.75 : 1.25;
  if (/先涨后跌/u.test(direction)) return phase < 0.45 ? 0.75 : -1.25;
  if (/震荡上涨/u.test(direction)) return index % 2 === 0 ? -0.25 : 0.8;
  if (/震荡下跌/u.test(direction)) return index % 2 === 0 ? 0.25 : -0.8;
  if (/上涨|回升|修复|反弹/u.test(direction)) return 0.9;
  if (/下跌|回落|转弱|探底/u.test(direction)) return -0.9;
  return index % 2 === 0 ? 0.25 : -0.25;
}

function PathOverlayChart({ row, snapshot }: { row: MemberStockPickResearchRow; snapshot: MemberStockPathSnapshot | null }) {
  const candles = snapshot?.dailyCandles ?? [];
  if (!candles.length) return <div className="flex h-[300px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 px-6 text-center text-sm leading-6 text-white/45">真实日K暂不可用；页面不会用假历史K线补齐。</div>;
  const recent = candles.slice(-28);
  const anchor = recent.at(-1)!.close;
  const actual = recent.map((candle) => ({
    open: candle.open / anchor * 100,
    high: candle.high / anchor * 100,
    low: candle.low / anchor * 100,
    close: candle.close / anchor * 100,
  }));
  const forecastSource = row.forecastPath.length ? row.forecastPath : [{ date: "", direction: row.weekly.direction ?? row.monthly.direction ?? "震荡", summary: "" }];
  const forecast: Array<{ value: number; direction: string }> = [{ value: 100, direction: "起点" }];
  for (let index = 0; index < forecastSource.length; index += 1) {
    const source = forecastSource[index]!;
    forecast.push({ value: forecast.at(-1)!.value + directionDelta(source.direction, index, forecastSource.length), direction: source.direction });
  }
  const lows = actual.map((item) => item.low).concat(forecast.map((item) => item.value));
  const highs = actual.map((item) => item.high).concat(forecast.map((item) => item.value));
  const min = Math.min(...lows) - 0.8;
  const max = Math.max(...highs) + 0.8;
  const width = 760;
  const height = 280;
  const pad = { left: 46, right: 22, top: 24, bottom: 34 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const actualW = plotW * 0.7;
  const forecastW = plotW - actualW;
  const y = (value: number) => pad.top + (max - value) / Math.max(max - min, 0.001) * plotH;
  const actualX = (index: number) => pad.left + index / Math.max(actual.length - 1, 1) * actualW;
  const forecastX = (index: number) => pad.left + actualW + index / Math.max(forecast.length - 1, 1) * forecastW;
  const candleWidth = Math.max(3, Math.min(9, actualW / Math.max(actual.length, 1) * 0.55));
  const path = forecast.map((point, index) => `${index ? "L" : "M"}${forecastX(index).toFixed(1)},${y(point.value).toFixed(1)}`).join(" ");
  const firstClose = recent.at(-6)?.close ?? recent[0]!.close;
  const movePct = (recent.at(-1)!.close / firstClose - 1) * 100;
  const observed = movePct > 1 ? "偏强" : movePct < -1 ? "偏弱" : "震荡";
  const official = row.weekly.direction ?? row.monthly.direction;
  const officialBull = Boolean(official && /涨|回升|修复|反弹/u.test(official));
  const officialBear = Boolean(official && /跌|回落|转弱/u.test(official));
  const observedBull = observed === "偏强";
  const observedBear = observed === "偏弱";
  const relation = official && ((officialBull && observedBull) || (officialBear && observedBear)) ? "同向" : official && ((officialBull && observedBear) || (officialBear && observedBull)) ? "相反，需谨慎" : "等待确认";

  return <div className="rounded-2xl border border-white/[0.08] bg-black/25 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="text-base font-semibold text-white">真实日K × 预测路线</h3><p className="mt-1 text-xs text-white/40">历史为真实已闭合日K；未来是以100为起点的形态指数，不是价格目标。</p></div>
      <div className="text-right text-xs"><p className="text-white/65">近5日K线 {observed} · 与正式方向 {relation}</p><p className="mt-1 text-white/35">最新真实收盘 {price(recent.at(-1)!.close)}</p></div>
    </div>
    <div className="mt-3 overflow-x-auto"><svg viewBox={`0 0 ${width} ${height}`} className="min-w-[700px] w-full" role="img" aria-label={`${row.symbol}真实日K与归一化预测路线叠加图`}>
      <rect x={pad.left + actualW} y={pad.top} width={forecastW} height={plotH} fill="rgba(139,92,246,.06)" />
      {[0, .25, .5, .75, 1].map((fraction) => <line key={fraction} x1={pad.left} x2={width-pad.right} y1={pad.top+plotH*fraction} y2={pad.top+plotH*fraction} stroke="rgba(255,255,255,.07)" />)}
      {actual.map((candle, index) => {
        const x = actualX(index); const up = candle.close >= candle.open; const color = up ? "#fb7185" : "#34d399"; const top = y(Math.max(candle.open, candle.close)); const bottom = y(Math.min(candle.open, candle.close));
        return <g key={index}><line x1={x} x2={x} y1={y(candle.high)} y2={y(candle.low)} stroke={color} strokeWidth="1.2"/><rect x={x-candleWidth/2} y={top} width={candleWidth} height={Math.max(bottom-top,1.5)} fill={up ? color : "transparent"} stroke={color}/></g>;
      })}
      <line x1={pad.left+actualW} x2={pad.left+actualW} y1={pad.top} y2={pad.top+plotH} stroke="rgba(196,181,253,.65)" strokeDasharray="5 5"/>
      <path d={path} fill="none" stroke="#c4b5fd" strokeWidth="2.5" strokeDasharray="7 5"/>
      {forecast.map((point,index)=><circle key={index} cx={forecastX(index)} cy={y(point.value)} r="3" fill="#c4b5fd"/>)}
      <text x={pad.left} y={height-10} fill="rgba(255,255,255,.42)" fontSize="11">真实日K</text><text x={pad.left+actualW+10} y={height-10} fill="rgba(196,181,253,.8)" fontSize="11">预测形态 · 非目标价</text>
      <text x="6" y={y(100)+4} fill="rgba(255,255,255,.38)" fontSize="10">100</text>
    </svg></div>
  </div>;
}

function PeriodCard({ title, view }: { title: string; view: MemberStockPickResearchRow["monthly"] }) {
  return <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-white/40">{title}</p><h2 className="mt-2 text-2xl font-semibold text-white">{view.direction ?? "待补"}</h2></div><span className={`rounded-full border px-3 py-1 text-xs ${directionTone(view.direction)}`}>{view.sourceLabel}</span></div>
    <p className="mt-3 text-sm leading-7 text-white/70">{view.summary}</p>
    {view.expectedPath ? <p className="mt-3 rounded-xl border border-white/[0.06] bg-black/20 p-3 text-sm leading-6 text-cyan-100/65"><b className="text-cyan-100">路线：</b>{view.expectedPath}</p> : null}
    <p className="mt-3 text-xs text-white/35">{view.periodStart && view.periodEnd ? `${view.periodStart} 至 ${view.periodEnd}` : "周期资料待补"}{view.version ? ` · V${view.version}` : ""}</p>
  </section>;
}

export function MemberStockResearchDashboard({ rows }: { rows: MemberStockPickResearchRow[] }) {
  const { locale, href } = useLocale();
  const en = locale === "en";
  const initial = rows.find((row) => row.slug === "sandisk" && row.dataCompleteness !== "MISSING") ?? rows.find((row) => row.dataCompleteness === "READY") ?? rows[0];
  const [selectedSlug, setSelectedSlug] = useState(initial?.slug ?? "");
  const selected = rows.find((row) => row.slug === selectedSlug) ?? initial;
  const [market, setMarket] = useState<SnapshotState>({ status: "loading", snapshot: null });

  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    let active = true;
    const timer = window.setTimeout(() => controller.abort(), 9_000);
    setMarket({ status: "loading", snapshot: null });
    void fetch(`/api/member/stock-path?key=${encodeURIComponent(selected.technicalKey)}`, { credentials: "same-origin", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP_${response.status}`);
        const body = await response.json() as { ok?: boolean; snapshot?: MemberStockPathSnapshot };
        if (!body.ok || !body.snapshot) throw new Error("INVALID_STOCK_PATH_RESPONSE");
        if (active) setMarket({ status: "ready", snapshot: body.snapshot });
      })
      .catch(() => { if (active) setMarket({ status: "error", snapshot: null }); })
      .finally(() => window.clearTimeout(timer));
    return () => { active = false; window.clearTimeout(timer); controller.abort(); };
  }, [selected]);

  const day = selected?.dailyMethods[0] ?? null;
  const snapshot = market.status === "ready" ? market.snapshot : null;
  const coverage = useMemo(() => ({ ready: rows.filter((row) => row.dataCompleteness === "READY").length, partial: rows.filter((row) => row.dataCompleteness === "PARTIAL").length }), [rows]);
  if (!selected) return <div className="rounded-2xl border border-white/10 p-6 text-white/55">暂无已发布股票研究。</div>;

  return <div className="space-y-6">
    <section className="rounded-[24px] border border-violet-300/15 bg-[radial-gradient(circle_at_85%_0%,rgba(139,92,246,.14),transparent_36%),#0b0d12] p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-violet-200/65">MONTH → WEEK → DAY</p><h2 className="mt-2 text-2xl font-semibold">先定整月，再找当前阶段</h2><p className="mt-2 max-w-3xl text-sm leading-7 text-white/55">老师同周期原卦优先；没有老师卦才采用自起卦并按老师方法解读。日内三种观点并列，不拿奇门或技术面改写六爻周方向。</p></div><p className="text-xs text-white/40">完整 {coverage.ready} · 待补周期 {coverage.partial}</p></div>
      <div className="mt-5 flex gap-2 overflow-x-auto pb-2">{rows.map((row) => <button key={row.slug} type="button" onClick={() => setSelectedSlug(row.slug)} className={`shrink-0 rounded-xl border px-4 py-3 text-left transition ${row.slug === selected.slug ? "border-violet-300/45 bg-violet-300/[.1] text-white" : "border-white/10 bg-black/20 text-white/55 hover:border-white/20"}`}><span className="block text-sm font-semibold">{en ? row.nameEn : row.nameZh}</span><span className="mt-1 block font-mono text-[11px] opacity-55">{row.symbol} · {row.dataCompleteness === "READY" ? "月周齐" : row.dataCompleteness === "PARTIAL" ? "待补一层" : "资料待补"}</span></button>)}</div>
    </section>

    <div className="grid gap-4 lg:grid-cols-[1.45fr_.75fr]">
      <PeriodCard title="整月长线走势" view={selected.monthly}/>
      <section className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.035] p-5"><p className="text-xs font-semibold uppercase tracking-[.16em] text-cyan-100/55">NOW · 当前阶段</p><h2 className="mt-2 text-2xl font-semibold text-white">{selected.currentStage.label}</h2><p className="mt-3 text-sm leading-7 text-white/65">{selected.currentStage.note}</p>{selected.currentStage.progressPct != null ? <div className="mt-4"><div className="h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-cyan-300/70" style={{ width: `${selected.currentStage.progressPct}%` }}/></div><p className="mt-2 text-xs text-white/35">日期进度 {selected.currentStage.progressPct}% · 不是涨跌幅</p></div> : null}</section>
    </div>

    {market.status === "loading" ? (
      <div className="flex h-[300px] items-center justify-center rounded-2xl border border-white/[0.08] bg-black/20 text-sm text-white/45">正在读取真实已闭合日K与4H缠论结构…</div>
    ) : (
      <PathOverlayChart row={selected} snapshot={snapshot}/>
    )}

    <PeriodCard title="本周路线 · 独立周卦优先" view={selected.weekly}/>

    <section className="rounded-2xl border border-white/[0.08] bg-[#0c0e12] p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-white/40">DAILY CROSS-CHECK</p><h2 className="mt-2 text-xl font-semibold">日分析 · 三方并列</h2></div>{day ? <span className={`rounded-full border px-3 py-1 text-xs ${relationTone(day.relation)}`}>{day.relationLabel}</span> : null}</div>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <article className="rounded-xl border border-amber-300/15 bg-amber-300/[.03] p-4"><p className="text-xs text-amber-100/55">① 周卦拆分 / 日节奏</p><h3 className="mt-2 text-lg font-semibold text-white">{day?.derivedDirection ?? "待生成"}</h3><p className="mt-2 text-sm leading-6 text-white/60">{day?.derivedSummary ?? "没有独立日卦时，只能从已锁定周卦拆分，不补造日卦。"}</p></article>
        <article className="rounded-xl border border-violet-300/15 bg-violet-300/[.03] p-4"><p className="text-xs text-violet-100/55">② 奇门独立观点</p><h3 className="mt-2 text-lg font-semibold text-white">{day?.qimenDirection ?? "证据不足"}</h3><p className="mt-2 text-sm leading-6 text-white/60">{day?.qimenSummary ?? "没有可追溯用神或盘局时不强行给方向。"}</p></article>
        <article className="rounded-xl border border-cyan-300/15 bg-cyan-300/[.03] p-4"><p className="text-xs text-cyan-100/55">③ 4H缠论技术面</p><h3 className="mt-2 text-lg font-semibold text-white">{snapshot?.chan4h?.labelZh ?? (market.status === "loading" ? "读取中" : "行情暂不可用")}</h3><p className="mt-2 text-sm leading-6 text-white/60">{snapshot?.chan4h ? `${snapshot.chan4h.waitingFor}；确认 ${price(snapshot.chan4h.confirmation)}，失效 ${price(snapshot.chan4h.invalidation)}。` : "只读真实已闭合4H K线；数据不足时不猜支撑压力。"}</p></article>
      </div>
    </section>

    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4"><p className="text-xs leading-6 text-white/42">预测路线只表达先后顺序；真实价格、支撑和压力以已闭合K线动态计算。任何分歧都会保留，不回写已经锁定的历史预测。</p><Link href={href(selected.detailHref)} className="rounded-xl border border-violet-300/25 px-4 py-2 text-sm font-semibold text-violet-100">查看{en ? selected.nameEn : selected.nameZh}完整卦象 →</Link></div>
  </div>;
}
