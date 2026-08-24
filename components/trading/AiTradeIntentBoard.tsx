"use client";

import { Badge, Card, Heading, Text } from "@/components/ui";
import {
  aiTradingAssetName,
  aiTradingFocusPriority,
  listAiTradingDisplayFocus,
  type AiTradingFocusDirection,
  type AiTradingFocusPlaybook,
} from "@/lib/trading-signals/ai-trading-focus";
import type {
  AiTradeIntentDecision,
  AiTradePlan,
  AiTradePlanDashboard,
  AiTradePlanStatus,
} from "@/types/ai-trade-plan";

const TERMINAL = new Set<AiTradePlanStatus>([
  "CLOSED",
  "CANCELLED",
  "EXPIRED",
  "INVALIDATED",
  "SUPERSEDED",
]);

function n(value: number | null | undefined, digits = 4): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function directionLabel(direction: string, en: boolean): string {
  if (direction === "LONG") return en ? "Long" : "做多";
  if (direction === "SHORT") return en ? "Short" : "做空";
  return en ? "Wait" : "等待";
}

function directionVariant(direction: string) {
  if (direction === "LONG") return "success" as const;
  if (direction === "SHORT") return "danger" as const;
  return "outline" as const;
}

function statusLabel(status: string, en: boolean): string {
  const map: Record<string, [string, string]> = {
    PUBLISHED: ["计划已发布", "Published"],
    WATCHING: ["等待入场", "Watching"],
    ARMED: ["接近触发", "Near trigger"],
    READY: ["可执行", "Ready"],
    SHADOW_READY: ["候选", "Candidate"],
    ORDER_SUBMITTED: ["已委托", "Submitted"],
    PARTIALLY_FILLED: ["部分成交", "Partial fill"],
    OPEN: ["持仓中", "Open"],
    REDUCED: ["已减仓", "Reduced"],
    PARTIAL: ["已减仓", "Reduced"],
    CLOSING: ["退出中", "Closing"],
    BLOCKED: ["风控拦截", "Blocked"],
    OBSERVING: ["观察", "Watching"],
    ERROR: ["异常", "Error"],
    EXECUTION_ERROR: ["执行异常", "Execution error"],
  };
  return map[status]?.[en ? 1 : 0] ?? status;
}

function statusVariant(status: string) {
  if (["READY", "ARMED", "ORDER_SUBMITTED"].includes(status)) return "warning" as const;
  if (["OPEN", "REDUCED", "PARTIALLY_FILLED", "PARTIAL"].includes(status)) return "success" as const;
  if (["BLOCKED", "ERROR", "EXECUTION_ERROR"].includes(status)) return "danger" as const;
  return "outline" as const;
}

function horizonKey(strategyType: string, symbol: string): string {
  return `${strategyType}:${symbol.toUpperCase()}`;
}

function horizonLabel(strategyType: string, en: boolean): string {
  if (strategyType === "INTRADAY") return en ? "Intraday" : "短线";
  if (strategyType === "SWING") return en ? "Swing" : "中线";
  if (strategyType === "POSITION") return en ? "Position" : "长线";
  return strategyType;
}

function latestPlanByHorizon(plans: AiTradePlan[]): Map<string, AiTradePlan> {
  const map = new Map<string, AiTradePlan>();
  // Terminal plans are audit history, not current execution intent. Never let an old EXPIRED
  // plan mask a newer live decision in the Top 10 board.
  for (const plan of [...plans]
    .filter((row) => !TERMINAL.has(row.status))
    .sort((a, b) => {
      if (a.version !== b.version) return b.version - a.version;
      return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
    })) {
    const key = horizonKey(plan.strategyType, plan.symbol);
    if (!map.has(key)) map.set(key, plan);
  }
  return map;
}

function latestDecisionByHorizon(decisions: AiTradeIntentDecision[]): Map<string, AiTradeIntentDecision> {
  const map = new Map<string, AiTradeIntentDecision>();
  for (const decision of [...decisions].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))) {
    const key = horizonKey(decision.strategyType ?? "INTRADAY", decision.symbol);
    if (!map.has(key)) map.set(key, decision);
  }
  return map;
}

function referenceDate(value: string): Date {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date("2026-08-08T00:00:00+08:00") : parsed;
}

function beijingDateKey(now: Date): string {
  return new Date(now.getTime() + 8 * 60 * 60_000).toISOString().slice(0, 10);
}

function candidateScore(
  symbol: string,
  now: Date,
  plan: AiTradePlan | undefined,
  decision: AiTradeIntentDecision | undefined
): number {
  const completion = decision && decision.conditionsTotal > 0
    ? decision.conditionsMet / decision.conditionsTotal
    : 0;
  const stateBonus = decision?.status === "READY" ? 22 : plan?.status === "ARMED" ? 18 : plan?.status === "OPEN" ? 15 : 0;
  return aiTradingFocusPriority(symbol, now) * 2
    + (plan?.planningConfidence ?? 0) * 0.8
    + (decision?.confidence ?? 0) * 0.8
    + completion * 35
    + stateBonus;
}

function actionDirection(playbook: AiTradingFocusPlaybook, en: boolean): string {
  const main = playbook.weeklyDirection === "LONG"
    ? (en ? "Main: buy the dip" : "主策略：等回落做多")
    : playbook.weeklyDirection === "SHORT"
      ? (en ? "Main: sell the rally" : "主策略：等反弹做空")
      : (en ? "Main: follow the phase" : "主策略：按周内阶段切换");
  if (playbook.countertrendPolicy !== "STRONG_ONLY") return main;
  return `${main} · ${en ? "Countertrend only on strong 1H/15m confluence" : "反向只在1H/15m强共振时小仓"}`;
}

function focusDirectionBadge(direction: AiTradingFocusDirection, en: boolean) {
  return <Badge variant={directionVariant(direction)}>{directionLabel(direction, en)}</Badge>;
}

export function AiTradeIntentBoard({
  dashboard,
  locale = "zh",
  showHistory = false,
}: {
  dashboard: AiTradePlanDashboard;
  locale?: "zh" | "en";
  showHistory?: boolean;
}) {
  const en = locale === "en";
  const now = referenceDate(dashboard.generatedAt);
  const focusPlaybooks = listAiTradingDisplayFocus(now);
  const plansByHorizon = latestPlanByHorizon(dashboard.plans);
  const decisionsByHorizon = latestDecisionByHorizon(dashboard.decisions ?? []);
  const hero = focusPlaybooks[0] ?? null;
  const heroIsUpcoming = Boolean(hero && hero.periodStart > beijingDateKey(now));
  const heroPlan = hero ? plansByHorizon.get(horizonKey("INTRADAY", hero.symbol)) ?? Array.from(plansByHorizon.values()).find((row) => row.symbol === hero.symbol) : undefined;
  const heroDecision = hero ? decisionsByHorizon.get(horizonKey("INTRADAY", hero.symbol)) ?? Array.from(decisionsByHorizon.values()).find((row) => row.symbol === hero.symbol) : undefined;
  const horizonSet = new Set<string>();
  for (const row of focusPlaybooks) horizonSet.add(horizonKey("INTRADAY", row.symbol));
  for (const row of dashboard.plans) if (!TERMINAL.has(row.status)) horizonSet.add(horizonKey(row.strategyType, row.symbol));
  for (const row of dashboard.decisions ?? []) horizonSet.add(horizonKey(row.strategyType ?? "INTRADAY", row.symbol));
  const candidates = Array.from(horizonSet)
    .map((key) => {
      const plan = plansByHorizon.get(key);
      const decision = decisionsByHorizon.get(key);
      const [strategyType, symbol] = key.split(":") as [string, string];
      return {
        key,
        symbol,
        strategyType,
        plan,
        decision,
        score: candidateScore(symbol, now, plan, decision),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return (
    <div className="space-y-4">
      {hero ? (
        <Card padding="lg" className="overflow-hidden border-amber-300/20 bg-gradient-to-br from-amber-300/[0.06] via-white/[0.015] to-primary/[0.035]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="warning">{en ? (heroIsUpcoming ? "NEXT WEEK FOCUS" : "TOP FOCUS") : (heroIsUpcoming ? "下周重点交易" : "本周重点交易")}</Badge>
                <Text variant="caption" color="tertiary">{hero.periodStart} — {hero.periodEnd}</Text>
              </div>
              <Heading size="h2" className="mt-3">{hero.assetName} · {hero.weeklyLabel}</Heading>
              <Text variant="body" className="mt-2 block text-white/90">{hero.weeklyPath}</Text>
              <Text variant="body-sm" color="secondary" className="mt-2 block">{actionDirection(hero, en)}</Text>
            </div>
            <div className="flex flex-wrap gap-2">
              {focusDirectionBadge(hero.weeklyDirection, en)}
              <Badge variant="outline">{en ? "AI picks entry / stop / targets" : "AI技术选入场 · 止损 · 目标"}</Badge>
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1.45fr_0.85fr]">
            <div>
              <Text variant="caption" color="tertiary" className="mb-2 block">{en ? "WEEK PATH" : "每日走势预案"}</Text>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                {hero.days.map((day) => (
                  <div key={day.date} className="rounded-xl border border-white/[0.08] bg-black/15 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Text variant="caption" weight="semibold">{day.shortDate}</Text>
                      {focusDirectionBadge(day.tacticalDirection === "NEUTRAL" ? day.mainDirection : day.tacticalDirection, en)}
                    </div>
                    <Text variant="body-sm" weight="semibold" className="mt-2 block">{day.label}</Text>
                    <Text variant="caption" color="secondary" className="mt-1 block leading-5">{day.action}</Text>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <Text variant="caption" color="tertiary">{en ? "AI TECHNICAL EXECUTION" : "AI技术执行"}</Text>
                  <Text variant="body-sm" weight="semibold" className="mt-1 block">
                    {heroPlan ? statusLabel(heroPlan.status, en) : heroDecision ? statusLabel(heroDecision.status, en) : (en ? "Waiting for live technical pricing" : "等待实时技术定价")}
                  </Text>
                </div>
                <Badge variant={statusVariant(heroPlan?.status ?? heroDecision?.status ?? "OBSERVING")}>{hero.symbol}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><Text variant="caption" color="tertiary">{en ? "Current" : "现价"}</Text><Text variant="body-sm" className="mt-1 block">{n(heroPlan?.currentPrice ?? heroDecision?.currentPrice)}</Text></div>
                <div><Text variant="caption" color="tertiary">{en ? "Confidence" : "置信度"}</Text><Text variant="body-sm" className="mt-1 block">{heroPlan?.planningConfidence ?? heroDecision?.confidence ?? "—"}{heroPlan || heroDecision ? "%" : ""}</Text></div>
                <div className="col-span-2"><Text variant="caption" color="tertiary">{en ? "Entry zone" : "AI入场区"}</Text><Text variant="body-sm" className="mt-1 block text-sky-200">{heroPlan ? `${n(heroPlan.entryZoneLow)} — ${n(heroPlan.entryZoneHigh)}` : n(heroDecision?.entryPrice)}</Text></div>
                <div><Text variant="caption" color="tertiary">{en ? "Stop" : "止损"}</Text><Text variant="body-sm" className="mt-1 block text-red-300">{n(heroPlan?.protectiveStop ?? heroDecision?.stopLoss)}</Text></div>
                <div><Text variant="caption" color="tertiary">{en ? "Target 1" : "目标1"}</Text><Text variant="body-sm" className="mt-1 block text-emerald-300">{n(heroPlan?.target1 ?? heroDecision?.target1)}</Text></div>
                <div><Text variant="caption" color="tertiary">{en ? "Target 2" : "目标2"}</Text><Text variant="body-sm" className="mt-1 block text-emerald-300">{n(heroPlan?.target2 ?? heroDecision?.target2)}</Text></div>
                <div><Text variant="caption" color="tertiary">{en ? "Conditions" : "技术条件"}</Text><Text variant="body-sm" className="mt-1 block">{heroPlan ? `${heroPlan.conditionsMet}/${heroPlan.conditionsTotal}` : heroDecision ? `${heroDecision.conditionsMet}/${heroDecision.conditionsTotal}` : "—"}</Text></div>
              </div>
              <Text variant="caption" color="secondary" className="mt-4 block leading-5">
                {heroPlan?.triggerRule ?? heroDecision?.rejectionReason ?? (en
                  ? "Forecast comes first; the AI waits for real price structure to calculate the entry, stop and targets."
                  : "先有周度走势预案，再由真实K线确认入场位、止损位和目标位；没有技术确认不猜价格。")}
              </Text>
            </div>
          </div>
        </Card>
      ) : null}

      <Card padding="lg" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Heading size="h3">{en ? "Dynamic Top 10" : "动态候选池 Top 10"}</Heading>
            <Text variant="body-sm" color="secondary" className="mt-1 block">
              {en
                ? "Ranked from the live allow-list by MOOX focus, forecast, technical confirmation and trigger progress."
                : "从实盘允许池里按MOOX方向明确度、技术入场进度和实时可执行性动态排序；过期计划只进入历史审计，不再占据当前Top10状态。"}
            </Text>
          </div>
          <Badge variant="outline">{en ? "Hard risk gates remain" : "硬风控仍不可绕过"}</Badge>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="min-w-[820px] w-full text-left text-sm">
            <thead className="border-b border-white/[0.08] bg-white/[0.02] text-white/45">
              <tr>
                <th className="px-3 py-3">#</th>
                <th className="px-3 py-3">{en ? "Asset" : "品种"}</th>
                <th className="px-3 py-3">{en ? "Horizon" : "周期"}</th>
                <th className="px-3 py-3">{en ? "Bias" : "方向"}</th>
                <th className="px-3 py-3">{en ? "State" : "状态"}</th>
                <th className="px-3 py-3">{en ? "Confidence" : "置信度"}</th>
                <th className="px-3 py-3">{en ? "Entry" : "入场"}</th>
                <th className="px-3 py-3">{en ? "Stop" : "止损"}</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((row, index) => {
                const direction = row.plan?.direction ?? row.decision?.direction ?? "NEUTRAL";
                const status = row.plan?.status ?? row.decision?.status ?? "OBSERVING";
                return (
                  <tr key={row.key} className="border-b border-white/[0.055] last:border-0">
                    <td className="px-3 py-3 text-white/35">{index + 1}</td>
                    <td className="px-3 py-3"><span className="font-medium text-white/90">{aiTradingAssetName(row.symbol, en)}</span><span className="ml-2 text-xs text-white/35">{row.symbol}</span></td>
                    <td className="px-3 py-3"><Badge variant="outline">{horizonLabel(row.strategyType, en)}</Badge></td>
                    <td className="px-3 py-3"><Badge variant={directionVariant(direction)}>{directionLabel(direction, en)}</Badge></td>
                    <td className="px-3 py-3"><Badge variant={statusVariant(status)}>{statusLabel(status, en)}</Badge></td>
                    <td className="px-3 py-3">{row.plan?.planningConfidence ?? row.decision?.confidence ?? "—"}{row.plan || row.decision ? "%" : ""}</td>
                    <td className="px-3 py-3 text-sky-200">{row.plan ? `${n(row.plan.entryZoneLow)}–${n(row.plan.entryZoneHigh)}` : n(row.decision?.entryPrice)}</td>
                    <td className="px-3 py-3 text-red-300">{n(row.plan?.protectiveStop ?? row.decision?.stopLoss)}</td>
                  </tr>
                );
              })}
              {!candidates.length ? <tr><td colSpan={8} className="px-4 py-7 text-center text-white/45">{en ? "Waiting for the first scan." : "等待第一轮动态扫描。"}</td></tr> : null}
            </tbody>
          </table>
        </div>

        {showHistory ? (
          <details className="rounded-xl border border-white/[0.07] bg-black/10 px-4 py-3">
            <summary className="cursor-pointer text-sm text-white/65">{en ? "Older plan versions" : "旧计划版本（审计）"}</summary>
            <Text variant="caption" color="tertiary" className="mt-2 block">{en ? `${dashboard.plans.filter((row) => TERMINAL.has(row.status)).length} archived versions` : `历史/旧版本 ${dashboard.plans.filter((row) => TERMINAL.has(row.status)).length} 条，默认折叠。`}</Text>
          </details>
        ) : null}
      </Card>
    </div>
  );
}
