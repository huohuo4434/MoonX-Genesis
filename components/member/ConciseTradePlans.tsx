"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { concisePlanState, concisePrice, conciseSnapshotFresh, latestConcisePlans } from "@/lib/presentation/concise-trade-plan";
import type { AiTradingDeskSnapshot } from "@/types/ai-trading-desk";
import { startMemberDeskPolling } from "@/lib/member-ai-desk-polling-core";
import { readTradingSnapshot } from "@/lib/presentation/read-trading-snapshot";

const HORIZONS = [["POSITION", "长线", "Position"], ["SWING", "中线", "Swing"], ["INTRADAY", "短线", "Intraday"]] as const;
const LABELS = {
  WAIT: ["等待：有效计划或点位尚未齐全", "Wait: no complete valid plan"],
  CONDITIONAL: ["等条件确认，不追价", "Wait for confirmation; do not chase"],
  SUBMITTED: ["已委托，尚不代表成交", "Submitted; not necessarily filled"],
  POSITION: ["持仓管理，不是新买点", "Position management, not a new entry"],
};

export function ConciseTradePlans({ initial, blocked = false, symbol }: { initial?: AiTradingDeskSnapshot; blocked?: boolean; symbol?: string }) {
  const { locale } = useLocale();
  const en = locale === "en";
  const [snapshot, setSnapshot] = useState<AiTradingDeskSnapshot | null>(initial ?? null);
  const [horizon, setHorizon] = useState<string>("ALL");
  const [now, setNow] = useState<number>(NaN);
  const [busy, setBusy] = useState(!initial);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);
  const hasInitial = Boolean(initial);
  useEffect(() => {
    if (hasInitial) return; // The parent owns polling on the execution page.
    setBusy(true);
    return startMemberDeskPolling({
      read: readTradingSnapshot,
      onSnapshot: next => { setSnapshot(next); setError(false); setBusy(false); setNow(Date.now()); },
      onError: () => { setError(true); setBusy(false); setSnapshot(null); },
      intervalMs: 60_000,
      shouldPoll: () => document.visibilityState === "visible",
      setIntervalFn: window.setInterval.bind(window), clearIntervalFn: window.clearInterval.bind(window),
    });
  }, [hasInitial, refreshKey]);
  const data = initial ?? snapshot;
  const fresh = !blocked && !error && data?.syncStatus === "OK" && conciseSnapshotFresh(data.lastSyncedAt, now);
  const plans = data?.settings.enabled ? latestConcisePlans(data.publishedPlans ?? [], data.ledgerSource) : [];
  const visible = plans.filter((plan) => (!symbol || plan.symbol === symbol) && (horizon === "ALL" || plan.strategyType === horizon));
  const rows: Array<{ key: string; plan?: typeof plans[number]; label?: string }> = symbol
    ? HORIZONS.filter(([key]) => horizon === "ALL" || key === horizon).flatMap<{ key: string; plan?: typeof plans[number]; label?: string }>(([key, zh, english]) => {
      const found = visible.filter(plan => plan.strategyType === key);
      return found.length ? found.map(plan => ({ key: plan.id, plan, label: en ? english : zh })) : [{ key, plan: undefined, label: en ? english : zh }];
    }) : visible.map(plan => ({ key: plan.id, plan }));
  const time = (value: string) => Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat(en ? "en-GB" : "zh-CN", {
    timeZone: "Asia/Hong_Kong", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date(value)) : "—";

  return <section id="concise-trade-plans" data-testid="concise-trade-plans" className="mb-6 rounded-2xl border border-cyan-300/20 bg-[#0b1018] p-5 text-white">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-semibold">{en ? "Trade plans, at a glance" : "交易计划 · 一眼看懂"}</h2>
      {!initial ? <button type="button" disabled={busy} onClick={() => setRefreshKey(n => n + 1)} className="rounded-lg border border-white/20 px-3 py-2 text-sm disabled:opacity-40">{busy ? (en ? "Loading…" : "读取中…") : (en ? "Refresh plans" : "刷新计划")}</button> : null}
    </div>
    <p className="mt-2 text-sm text-white/65">{en ? "Entry → stop → targets → deadline. Follow the named contract and its time limit; a plan is not a fill." : "入场 → 止损 → 止盈 → 有效期。按卡片所列合约和期限判断；计划不等于成交。"}</p>
    <div className="my-4 flex gap-2" aria-label={en ? "Plan horizon" : "计划周期"}>
      <button type="button" aria-pressed={horizon === "ALL"} onClick={() => setHorizon("ALL")} className={`rounded-full border px-4 py-2 text-sm ${horizon === "ALL" ? "border-cyan-300 bg-cyan-300/15" : "border-white/15"}`}>{en ? "All" : "全部"}</button>
      {HORIZONS.map(([key, zh, english]) => <button key={key} type="button" aria-pressed={horizon === key} onClick={() => setHorizon(key)} className={`rounded-full border px-4 py-2 text-sm ${horizon === key ? "border-cyan-300 bg-cyan-300/15 text-cyan-100" : "border-white/15 text-white/65"}`}>{en ? english : zh}</button>)}
    </div>
    {!fresh && !busy ? <p role="status" className="mb-3 text-sm text-amber-200">{en ? "Current trading data is unverified. Entry levels are hidden; the page retries automatically." : "当前交易数据待核验，入场点位暂不展示；页面会自动重试。"}</p> : null}
    {fresh && data ? <p className="mb-3 text-xs text-white/60">{en ? "System new entries: " : "系统新开仓："}{data.executionAllowed && data.serverHealthy && !data.runtime.paused ? (en ? "permitted, still subject to order checks" : "允许，仍需逐单检查") : (en ? "not confirmed as permitted; plans are reference only" : "未确认允许，计划仅供参考")}</p> : null}
    {data && !data.settings.enabled ? <p className="text-sm text-white/60">{en ? "Member plan display is unavailable." : "会员计划展示暂未开放。"}</p> : null}
    <div className={symbol && horizon === "ALL" ? "grid gap-3 lg:grid-cols-3" : "space-y-3"}>
      {rows.map(({ key, plan, label }) => {
        if (!plan) return <article key={key} className="rounded-xl border border-white/10 p-4"><h3 className="font-semibold">{label}</h3><p className="mt-2 text-sm text-white/60">{busy ? (en ? "Loading…" : "读取中…") : (en ? "Wait — no active plan. No entry, stop or target is implied." : "等待：暂无有效计划，不安排入场、止盈或止损点位。")}</p></article>;
        const state = fresh ? concisePlanState(plan, now) : "WAIT";
        const available = state !== "WAIT";
        const stopVerb = plan.direction === "LONG" ? (en ? " below" : "跌破") : (en ? " above" : "突破");
        return <article key={plan.id} className="rounded-xl border border-white/10 bg-white/[0.025] p-4" data-plan-id={plan.id}>
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{plan.symbol} · {HORIZONS.find(([key]) => key === plan.strategyType)?.[en ? 2 : 1] ?? plan.strategyType} · {plan.executionMode === "BITGET_LIVE" ? (en ? "Live plan" : "实盘计划") : (en ? "Simulation plan" : "模拟计划")}</h3><span className="text-xs text-amber-100">{LABELS[state][en ? 1 : 0]}</span></div>
          {available ? <>
            <p className="mt-3 text-base leading-7">{en ? (plan.direction === "LONG" ? "Long setup" : "Short setup") : (plan.direction === "LONG" ? "做多预案" : "做空预案")}：<b className="text-cyan-200">{concisePrice(plan.entryZoneLow)}–{concisePrice(plan.entryZoneHigh)}</b>；{en ? "stop" : "止损"}{stopVerb} <b className="text-rose-200">{concisePrice(plan.protectiveStop)}</b>；{en ? "targets" : "分批止盈"} <b className="text-emerald-200">{[plan.target1, plan.target2, plan.target3].map(concisePrice).join(" / ")}</b>。</p>
            <p className="mt-2 text-sm text-white/80">{en ? "Required confirmation (original rule): " : "入场前必须确认："}{plan.triggerRule}</p>
            <p className="mt-2 text-xs text-white/55">{en ? "Entry window" : "入场有效期"} {time(plan.validFrom)} — {time(new Date(Math.min(Date.parse(plan.expiresAt), Date.parse(plan.forecastValidUntil!))).toISOString())} · {en ? "Beijing time (UTC+8)" : "北京时间"} · v{plan.version}</p>
          </> : <p className="mt-2 text-sm text-white/60">{en ? "Do not substitute a forecast direction or a support level for a complete entry plan." : "先等待，不把看涨方向或支撑位置当作买入指令。"}</p>}
          {available ? <details className="mt-3 text-sm text-white/60"><summary className="cursor-pointer">{en ? "Invalidation & original context" : "失效条件与详细判断"}</summary><p className="mt-2">{plan.invalidationRule || plan.cancelIf}</p><p className="mt-2">{plan.thesisSummary}</p><p className="mt-2">{en ? "Last strategy check" : "最近策略检查"}：{plan.lastCheckedAt ? time(plan.lastCheckedAt) : "—"}</p></details> : null}
        </article>;
      })}
      {!symbol && !visible.length ? <p role="status" className="py-3 text-sm text-white/65">{busy ? (en ? "Reading published plans…" : "正在读取已发布计划…") : (en ? "No active plan for this horizon. Wait; no entry or exit price is implied." : "该周期暂无有效交易计划：先等待，不给凑数买卖点。")}</p> : null}
    </div>
    {data?.lastSyncedAt ? <p className="mt-4 text-xs text-white/40">{en ? "Snapshot" : "快照"}：{time(data.lastSyncedAt)} · UTC+8</p> : null}
  </section>;
}
