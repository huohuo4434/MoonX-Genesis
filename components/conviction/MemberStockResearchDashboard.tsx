"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { buildMemberStockForecastProjection } from "@/lib/research/member-stock-forecast-candles";
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

function signedPct(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function PathOverlayChart({ row, snapshot }: { row: MemberStockPickResearchRow; snapshot: MemberStockPathSnapshot | null }) {
  const candles = snapshot?.dailyCandles ?? [];
  if (!candles.length) return <div className="flex h-[300px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 px-6 text-center text-sm leading-6 text-white/45">真实日K暂不可用；页面不会用假历史K线补齐。</div>;
  const recent = candles.slice(-22);
  const projection = buildMemberStockForecastProjection({ row, snapshot: snapshot! });
  const actual = recent.map((candle) => ({ ...candle, date: new Date(candle.timestamp).toISOString().slice(0, 10), forecast: false, keyDay: false, keyLabel: null as string | null }));
  const forecast = projection.candles.map((candle) => ({ ...candle, volume: null, forecast: true }));
  const combined = [...actual, ...forecast];
  const rawMin = Math.min(...combined.map((item) => item.low));
  const rawMax = Math.max(...combined.map((item) => item.high));
  const margin = Math.max((rawMax - rawMin) * 0.08, recent.at(-1)!.close * 0.005);
  const min = rawMin - margin;
  const max = rawMax + margin;
  const width = 920;
  const height = 390;
  const pad = { left: 16, right: 78, top: 46, bottom: 52 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const y = (value: number) => pad.top + (max - value) / Math.max(max - min, 0.001) * plotH;
  const x = (index: number) => pad.left + (index + 0.5) / Math.max(combined.length, 1) * plotW;
  const candleWidth = Math.max(4, Math.min(11, plotW / Math.max(combined.length, 1) * 0.58));
  const dividerX = actual.length ? pad.left + actual.length / Math.max(combined.length, 1) * plotW : pad.left;
  const yTicks = Array.from({ length: 6 }, (_, index) => max - index / 5 * (max - min));
  const xStride = Math.max(1, Math.ceil(combined.length / 8));
  const firstClose = recent.at(-6)?.close ?? recent[0]!.close;
  const movePct = (recent.at(-1)!.close / firstClose - 1) * 100;
  const observed = movePct > 1 ? "偏强" : movePct < -1 ? "偏弱" : "震荡";
  const official = row.weekly.direction ?? row.monthly.direction;
  const officialBull = Boolean(official && /涨|回升|修复|反弹/u.test(official));
  const officialBear = Boolean(official && /跌|回落|转弱/u.test(official));
  const observedBull = observed === "偏强";
  const observedBear = observed === "偏弱";
  const relation = official && ((officialBull && observedBull) || (officialBear && observedBear)) ? "同向" : official && ((officialBull && observedBear) || (officialBear && observedBull)) ? "相反，需谨慎" : "等待确认";
  const keyForecasts = forecast.filter((candle) => candle.keyDay).slice(0, 8);
  const latestClose = recent.at(-1)!.close;
  const projectedLowPct = projection.projectedLow == null ? null : (projection.projectedLow / latestClose - 1) * 100;
  const projectedHighPct = projection.projectedHigh == null ? null : (projection.projectedHigh / latestClose - 1) * 100;

  return <div className="rounded-2xl border border-white/[0.08] bg-black/25 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0"><h3 className="text-base font-semibold text-white">真实日K × 月周卦模拟K线</h3><p className="mt-1 max-w-2xl text-xs leading-5 text-white/45">{projection.basisLabel}</p></div>
      <div className="text-right text-xs"><p className="text-white/65">近5日K线 {observed} · 与正式方向 {relation}</p><p className="mt-1 text-white/35">最新收盘 {price(recent.at(-1)!.close)} · ATR14 {price(projection.atr14)}</p></div>
    </div>
    <div className="mt-3 overflow-x-auto"><svg viewBox={`0 0 ${width} ${height}`} className="min-w-[820px] w-full" role="img" aria-label={`${row.symbol}真实日K与未来模拟K线叠加图，纵轴为价格，横轴为日期`}>
      <rect x={dividerX} y={pad.top} width={Math.max(0, width-pad.right-dividerX)} height={plotH} fill="rgba(139,92,246,.07)" />
      {yTicks.map((tick) => <g key={tick}><line x1={pad.left} x2={width-pad.right} y1={y(tick)} y2={y(tick)} stroke="rgba(255,255,255,.07)"/><text x={width-pad.right+8} y={y(tick)+4} fill="rgba(255,255,255,.52)" fontSize="11">{price(tick)}</text></g>)}
      {combined.map((candle, index) => {
        const cx = x(index); const up = candle.close >= candle.open; const color = candle.forecast ? up ? "#fb923c" : "#22d3ee" : up ? "#fb7185" : "#34d399"; const top = y(Math.max(candle.open, candle.close)); const bottom = y(Math.min(candle.open, candle.close));
        return <g key={`${candle.date}-${index}`}><line x1={cx} x2={cx} y1={y(candle.high)} y2={y(candle.low)} stroke={color} strokeWidth={candle.forecast ? "1.5" : "1.2"} strokeDasharray={candle.forecast ? "3 2" : undefined}/><rect x={cx-candleWidth/2} y={top} width={candleWidth} height={Math.max(bottom-top,1.5)} fill={up ? color : "transparent"} fillOpacity={candle.forecast ? ".72" : "1"} stroke={color} strokeWidth={candle.forecast ? "1.5" : "1"}/>{candle.forecast && candle.keyDay ? <g><circle cx={cx} cy={Math.max(16,y(candle.high)-12)} r="4" fill="#fde68a"/><text x={cx} y={Math.max(12,y(candle.high)-20)} textAnchor="middle" fill="#fde68a" fontSize="10">关键日</text></g> : null}</g>;
      })}
      <line x1={dividerX} x2={dividerX} y1={pad.top} y2={pad.top+plotH} stroke="rgba(196,181,253,.8)" strokeDasharray="5 5"/>
      <text x={Math.max(pad.left,dividerX-54)} y={pad.top-15} fill="rgba(255,255,255,.48)" fontSize="11">真实已闭合</text><text x={dividerX+10} y={pad.top-15} fill="rgba(196,181,253,.9)" fontSize="11">未来模拟</text>
      {combined.map((candle,index) => index % xStride === 0 || index === combined.length-1 ? <text key={`date-${candle.date}-${index}`} x={x(index)} y={height-20} textAnchor="middle" fill="rgba(255,255,255,.48)" fontSize="10">{candle.date.slice(5).replace("-","/")}</text> : null)}
    </svg></div>
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/45"><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-rose-400"/>真实上涨</span><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-emerald-400"/>真实下跌</span><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-orange-400"/>模拟上涨</span><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-cyan-400"/>模拟下跌</span><span className="text-violet-200/65">可信度 {projection.evidenceLevel === "HIGH" ? "高" : projection.evidenceLevel === "MEDIUM" ? "中" : "低"}</span>{projection.projectedLow != null && projection.projectedHigh != null ? <span>模拟区间 {price(projection.projectedLow)}–{price(projection.projectedHigh)}（{signedPct(projectedLowPct)} / {signedPct(projectedHighPct)}）</span> : null}</div>
    {keyForecasts.length ? <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2 text-xs"><span className="text-amber-100/55">月周卦关键窗</span>{keyForecasts.map((candle) => <span key={candle.date} className="max-w-full break-words rounded-full border border-amber-200/15 bg-amber-200/[.04] px-2.5 py-1 text-amber-100/75">{candle.date.slice(5).replace("-", "/")} · {candle.keyLabel}</span>)}</div> : <p className="mt-3 text-xs text-white/35">当前资料没有可追溯的结构化关键日，因此不额外制造转折日期。</p>}
    <p className="mt-3 text-xs leading-5 text-amber-100/55">模拟K线不是报价或目标价：方向与关键窗来自已发布月卦/周卦，幅度由真实ATR和4H缠论结构约束；非交易日不画假K，缺少同周期周卦时可信度自动降低。</p>
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
      <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-3">
        <article className="min-w-0 rounded-xl border border-amber-300/15 bg-amber-300/[.03] p-4"><p className="text-xs text-amber-100/55">① 周卦拆分 / 日节奏</p><h3 className="mt-2 text-lg font-semibold text-white">{day?.derivedDirection ?? "待生成"}</h3><p className="mt-2 break-words text-sm leading-6 text-white/60">{day?.derivedSummary ?? "没有独立日卦时，只能从已锁定周卦拆分，不补造日卦。"}</p></article>
        <article className="min-w-0 rounded-xl border border-violet-300/15 bg-violet-300/[.03] p-4"><p className="text-xs text-violet-100/55">② 奇门独立观点</p><h3 className="mt-2 text-lg font-semibold text-white">{day?.qimenDirection ?? "证据不足"}</h3><p className="mt-2 break-all text-sm leading-6 text-white/60">{day?.qimenSummary ?? "没有可追溯用神或盘局时不强行给方向。"}</p></article>
        <article className="min-w-0 rounded-xl border border-cyan-300/15 bg-cyan-300/[.03] p-4"><p className="text-xs text-cyan-100/55">③ 4H缠论技术面</p><h3 className="mt-2 text-lg font-semibold text-white">{snapshot?.chan4h?.labelZh ?? (market.status === "loading" ? "读取中" : "行情暂不可用")}</h3><p className="mt-2 break-words text-sm leading-6 text-white/60">{snapshot?.chan4h ? `${snapshot.chan4h.waitingFor}；确认 ${price(snapshot.chan4h.confirmation)}，失效 ${price(snapshot.chan4h.invalidation)}。` : "只读真实已闭合4H K线；数据不足时不猜支撑压力。"}</p></article>
      </div>
    </section>

    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4"><p className="text-xs leading-6 text-white/42">预测路线只表达先后顺序；真实价格、支撑和压力以已闭合K线动态计算。任何分歧都会保留，不回写已经锁定的历史预测。</p><Link href={href(selected.detailHref)} className="rounded-xl border border-violet-300/25 px-4 py-2 text-sm font-semibold text-violet-100">查看{en ? selected.nameEn : selected.nameZh}完整卦象 →</Link></div>
  </div>;
}
