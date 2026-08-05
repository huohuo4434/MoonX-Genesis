"use client";

import { useMemo, useState } from "react";
import { Badge, Card, Heading, Text } from "@/components/ui";
import type {
  AiTradeIntentDecision,
  AiTradePlan,
  AiTradePlanDashboard,
  AiTradePlanStatus,
} from "@/types/ai-trade-plan";
import type { ThreeHorizonStrategyType } from "@/types/three-horizon-strategy";

const ASSETS = [
  ["BTCUSDT", "比特币", "Bitcoin"],
  ["ETHUSDT", "以太坊", "Ether"],
  ["HYPEUSDT", "HYPE", "HYPE"],
  ["MUUSDT", "美光", "Micron"],
  ["QQQUSDT", "纳指QQQ", "Nasdaq QQQ"],
  ["XAUTUSDT", "黄金", "Gold"],
  ["XAGUSDT", "白银", "Silver"],
  ["GOOGLUSDT", "谷歌", "Google"],
  ["CLUSDT", "WTI原油", "WTI Crude"],
  ["SPYUSDT", "标普", "S&P 500"],
] as const;

const HORIZONS: Array<{
  key: ThreeHorizonStrategyType;
  zh: string;
  en: string;
  formulaZh: string;
  formulaEn: string;
}> = [
  {
    key: "INTRADAY",
    zh: "短线",
    en: "Intraday",
    formulaZh: "1小时趋势环境 ∧ 15分钟方向结构 ∧ 5分钟收盘触发 ∧ 波动、成交和组合风控通过。",
    formulaEn: "1H trend environment AND 15m structure AND 5m closing trigger AND volatility, volume and portfolio risk gates.",
  },
  {
    key: "SWING",
    zh: "波段",
    en: "Swing",
    formulaZh: "周线/日线方向 ∧ 4小时结构 ∧ 1小时收盘确认 ∧ 预测与组合风控通过。",
    formulaEn: "Weekly/daily direction AND 4H structure AND 1H closing confirmation AND forecast and portfolio risk gates.",
  },
  {
    key: "POSITION",
    zh: "中长期",
    en: "Position",
    formulaZh: "月度/周度主方向 ∧ 日线结构 ∧ 4小时入场确认 ∧ 长周期预测与组合风控通过。",
    formulaEn: "Monthly/weekly direction AND daily structure AND 4H entry confirmation AND long-horizon forecast and portfolio risk gates.",
  },
];

const TERMINAL = new Set<AiTradePlanStatus>([
  "CLOSED",
  "CANCELLED",
  "EXPIRED",
  "INVALIDATED",
  "SUPERSEDED",
]);

const EXECUTED = new Set<AiTradePlanStatus>([
  "ORDER_SUBMITTED",
  "PARTIALLY_FILLED",
  "OPEN",
  "REDUCED",
]);

type HorizonFilter = "ALL" | ThreeHorizonStrategyType;

function number(value: number | null | undefined, digits = 4): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function time(value: string | null | undefined, en: boolean): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(en ? "en-GB" : "zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function quoteAge(ageSeconds: number | null, en: boolean): string {
  if (ageSeconds == null) return en ? "time unknown" : "时间未知";
  if (ageSeconds < 60) return en ? `${ageSeconds}s ago` : `${ageSeconds}秒前`;
  const minutes = Math.floor(ageSeconds / 60);
  return en ? `${minutes}m ago` : `${minutes}分钟前`;
}

function directionLabel(direction: string, en: boolean): string {
  if (direction === "LONG") return en ? "Long" : "做多";
  if (direction === "SHORT") return en ? "Short" : "做空";
  return en ? "Wait" : "观望";
}

function directionVariant(direction: string) {
  if (direction === "LONG") return "success" as const;
  if (direction === "SHORT") return "danger" as const;
  return "outline" as const;
}

function statusLabel(status: string, en: boolean): string {
  const labels: Record<string, [string, string]> = {
    PUBLISHED: ["计划已发布", "Published"],
    WATCHING: ["等待条件", "Monitoring"],
    ARMED: ["接近触发", "Near trigger"],
    ORDER_SUBMITTED: ["订单已提交", "Order submitted"],
    PARTIALLY_FILLED: ["部分成交", "Partially filled"],
    OPEN: ["持仓中", "Open"],
    REDUCED: ["已部分止盈", "Reduced"],
    CLOSED: ["已结束", "Closed"],
    CANCELLED: ["已取消", "Cancelled"],
    EXPIRED: ["已过期", "Expired"],
    INVALIDATED: ["已失效", "Invalidated"],
    SUPERSEDED: ["旧版本", "Superseded"],
    EXECUTION_ERROR: ["执行异常", "Execution error"],
    OBSERVING: ["分析中", "Analysing"],
    READY: ["等待执行闸门", "Awaiting execution gate"],
    SHADOW_READY: ["候选机会", "Candidate"],
    BLOCKED: ["暂不下单", "No order"],
    PARTIAL: ["部分止盈", "Reduced"],
    CLOSING: ["退出中", "Closing"],
    ERROR: ["扫描异常", "Scan error"],
  };
  const value = labels[status];
  return value ? value[en ? 1 : 0] : status;
}

function statusVariant(status: string) {
  if (["OPEN", "REDUCED", "PARTIALLY_FILLED", "CLOSED"].includes(status)) return "success" as const;
  if (["ARMED", "READY", "ORDER_SUBMITTED"].includes(status)) return "warning" as const;
  if (["EXECUTION_ERROR", "ERROR", "INVALIDATED", "CANCELLED"].includes(status)) return "danger" as const;
  return "outline" as const;
}

function key(strategyType: ThreeHorizonStrategyType, symbol: string): string {
  return `${strategyType}:${symbol.toUpperCase()}`;
}

function latestDecisionMap(decisions: AiTradeIntentDecision[]): Map<string, AiTradeIntentDecision> {
  const map = new Map<string, AiTradeIntentDecision>();
  for (const decision of [...decisions].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))) {
    if (!decision.strategyType) continue;
    const decisionKey = key(decision.strategyType, decision.symbol);
    if (!map.has(decisionKey)) map.set(decisionKey, decision);
  }
  return map;
}

function latestPlanMap(plans: AiTradePlan[]): Map<string, AiTradePlan> {
  const map = new Map<string, AiTradePlan>();
  const ordered = [...plans].sort((a, b) => {
    const aTerminal = TERMINAL.has(a.status) ? 1 : 0;
    const bTerminal = TERMINAL.has(b.status) ? 1 : 0;
    if (aTerminal !== bTerminal) return aTerminal - bTerminal;
    if (a.version !== b.version) return b.version - a.version;
    return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
  });
  for (const plan of ordered) {
    const planKey = key(plan.strategyType, plan.symbol);
    if (!map.has(planKey)) map.set(planKey, plan);
  }
  return map;
}

function rr(entry: number | null, stop: number | null, target: number | null): number | null {
  if (entry == null || stop == null || target == null) return null;
  const risk = Math.abs(entry - stop);
  if (!Number.isFinite(risk) || risk <= 0) return null;
  return Math.abs(target - entry) / risk;
}

function rrLabel(value: number | null): string {
  return value == null || !Number.isFinite(value) ? "—" : `1 : ${value.toFixed(2)}`;
}

function inferredFormula(
  horizon: ThreeHorizonStrategyType,
  direction: string,
  en: boolean
): string {
  const definition = HORIZONS.find((item) => item.key === horizon);
  if (direction === "NEUTRAL") {
    return en
      ? `NO TRADE: ${definition?.formulaEn ?? "The required multi-timeframe alignment is incomplete."}`
      : `不下单：${definition?.formulaZh ?? "所需多周期共振尚未完成。"}`;
  }
  return `${directionLabel(direction, en)} = ${en ? definition?.formulaEn : definition?.formulaZh}`;
}

function stopBasis(horizon: ThreeHorizonStrategyType, direction: string, en: boolean): string {
  const side = direction === "SHORT" ? (en ? "above the structural high" : "结构高点上方") : (en ? "below the structural low" : "结构低点下方");
  const timeframe = horizon === "INTRADAY" ? (en ? "15m structure" : "15分钟结构") : horizon === "SWING" ? (en ? "4H structure" : "4小时结构") : (en ? "daily structure" : "日线结构");
  return en
    ? `Stop is placed ${side}; the wider of ${timeframe} distance and ATR protection is used.`
    : `止损放在${side}；${timeframe}距离与ATR保护距离取更宽者，避免止损过紧。`;
}

function targetBasis(entry: number | null, stop: number | null, targets: Array<number | null>, en: boolean): string {
  const labels = targets.map((target, index) => {
    const ratio = rr(entry, stop, target);
    return ratio == null ? null : `TP${index + 1}≈${ratio.toFixed(2)}R`;
  }).filter(Boolean);
  if (!labels.length) return en ? "Targets are generated after a valid direction, entry and stop exist." : "方向、入场和止损有效后才生成目标位；观望状态不编造价格。";
  return en
    ? `${labels.join(" · ")}. TP1 reduces risk; later targets manage the remaining position.`
    : `${labels.join(" · ")}。TP1先降低风险，后续目标管理剩余仓位。`;
}

function orderState(plan: AiTradePlan | undefined, en: boolean): { label: string; detail: string; variant: "success" | "warning" | "outline" } {
  if (plan && EXECUTED.has(plan.status)) {
    return {
      label: en ? "BITGET ORDER / POSITION" : "BITGET真实委托/持仓",
      detail: en ? "This item has reached exchange execution." : "该项已经进入交易所执行阶段，不再只是AI纸面分析。",
      variant: "success",
    };
  }
  if (plan && !TERMINAL.has(plan.status)) {
    return {
      label: en ? "LOCKED AI PLAN" : "AI锁定计划·尚未下单",
      detail: en ? "The plan is published and locked, but no exchange order has been submitted yet." : "计划已事前发布并锁定，但尚未向Bitget提交订单。",
      variant: "warning",
    };
  }
  return {
    label: en ? "AI ANALYSIS · NOT AN ORDER" : "AI分析·不是订单",
    detail: en ? "The market is analysed, but no formal execution plan has passed the gate." : "该品种已完成本轮分析，但尚未通过正式计划发布与执行闸门。",
    variant: "outline",
  };
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
  const [filter, setFilter] = useState<HorizonFilter>("ALL");
  const decisions = useMemo(() => latestDecisionMap(dashboard.decisions ?? []), [dashboard.decisions]);
  const plans = useMemo(() => latestPlanMap(dashboard.plans ?? []), [dashboard.plans]);
  const quotes = useMemo(() => new Map((dashboard.quotes ?? []).map((quote) => [quote.symbol.toUpperCase(), quote] as const)), [dashboard.quotes]);
  const selectedHorizons = filter === "ALL" ? HORIZONS : HORIZONS.filter((item) => item.key === filter);
  const totalExpected = selectedHorizons.length * ASSETS.length;
  const analysed = selectedHorizons.reduce((sum, horizon) => sum + ASSETS.filter(([symbol]) => decisions.has(key(horizon.key, symbol))).length, 0);
  const realOrders = Array.from(plans.values()).filter((plan) => EXECUTED.has(plan.status)).length;

  return (
    <Card padding="lg" className="space-y-6 border-primary/20 bg-primary/[0.018]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Heading size="h3">{en ? "AI Trade Logic · 10 Markets · 3 Horizons" : "AI交易思路公开 · 10品种 · 三周期"}</Heading>
          <Text variant="body-sm" color="secondary" className="mt-1 block max-w-4xl">
            {en
              ? "Choose intraday, swing, position, or all. Each card shows direction, formula, conditions, entry, stop, targets, risk/reward, confidence and the reason no order was placed."
              : "用户可选择短线、波段、中长期或全部查看。每张卡展示方向、触发公式、条件明细、入场、止盈止损、盈亏比、信心度和未下单原因。"}
          </Text>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={analysed === totalExpected ? "success" : "warning"}>{en ? `${analysed}/${totalExpected} analysed` : `已分析 ${analysed}/${totalExpected}`}</Badge>
          <Badge variant={realOrders ? "success" : "outline"}>{en ? `${realOrders} real orders / positions` : `${realOrders}个真实委托/持仓`}</Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-black/10 p-2">
        {(["ALL", ...HORIZONS.map((item) => item.key)] as HorizonFilter[]).map((value) => {
          const label = value === "ALL" ? (en ? "All" : "全部") : HORIZONS.find((item) => item.key === value)?.[en ? "en" : "zh"];
          const active = filter === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-lg px-4 py-2 text-sm transition ${active ? "bg-primary text-white" : "text-white/60 hover:bg-white/5 hover:text-white"}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.035] px-4 py-3">
        <Text variant="body-sm" className="text-amber-100">
          {en
            ? "Analysis is not an order. Only cards marked BITGET ORDER / POSITION have reached exchange execution."
            : "有AI方向和价格计划，不等于已经下单。只有标记“BITGET真实委托/持仓”的卡片，才代表已经进入交易所执行。"}
        </Text>
      </div>

      {selectedHorizons.map((horizon) => {
        const horizonAnalysed = ASSETS.filter(([symbol]) => decisions.has(key(horizon.key, symbol))).length;
        return (
          <section key={horizon.key} className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <Heading as="h4" size="h3" className="text-xl">{en ? horizon.en : horizon.zh}</Heading>
                <Text variant="caption" color="tertiary" className="mt-1 block">{en ? horizon.formulaEn : horizon.formulaZh}</Text>
              </div>
              <Badge variant={horizonAnalysed === 10 ? "success" : "warning"}>{horizonAnalysed}/10</Badge>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {ASSETS.map(([symbol, zh, english]) => {
                const decision = decisions.get(key(horizon.key, symbol));
                const plan = plans.get(key(horizon.key, symbol));
                const quote = quotes.get(symbol);
                const direction = plan?.direction ?? decision?.direction ?? "NEUTRAL";
                const status = plan?.status ?? decision?.status ?? "OBSERVING";
                const confidence = Math.max(0, Math.min(100, plan?.planningConfidence ?? decision?.confidence ?? 0));
                const currentPrice = quote?.price ?? plan?.currentPrice ?? decision?.currentPrice ?? null;
                const entry = plan ? (plan.entryZoneLow + plan.entryZoneHigh) / 2 : decision?.entryPrice ?? null;
                const stop = plan?.protectiveStop ?? decision?.stopLoss ?? null;
                const target1 = plan?.target1 ?? decision?.target1 ?? null;
                const target2 = plan?.target2 ?? decision?.target2 ?? null;
                const target3 = plan?.target3 ?? null;
                const conditions = decision?.conditions ?? [];
                const conditionsMet = plan?.conditionsMet ?? decision?.conditionsMet ?? 0;
                const conditionsTotal = plan?.conditionsTotal ?? decision?.conditionsTotal ?? 0;
                const state = orderState(plan, en);
                const conclusion = plan?.thesisSummary || decision?.rejectionReason || (en ? "Waiting for this horizon's next complete scan." : "等待该周期下一轮完整策略扫描。 ");
                const formula = plan?.triggerRule || inferredFormula(horizon.key, direction, en);
                const technical = decision?.technicalScore;
                const forecast = decision?.forecastScore;

                return (
                  <article key={`${horizon.key}:${symbol}`} className="rounded-2xl border border-white/10 bg-black/10 p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Text variant="body" weight="semibold">{en ? english : zh}</Text>
                          <Text variant="caption" color="tertiary">{symbol}</Text>
                          <Badge variant={directionVariant(direction)}>{directionLabel(direction, en)}</Badge>
                        </div>
                        <Text variant="caption" color="tertiary" className="mt-1 block">{en ? horizon.en : horizon.zh} · {time(decision?.updatedAt ?? plan?.updatedAt, en)}</Text>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Badge variant={statusVariant(status)}>{statusLabel(status, en)}</Badge>
                        <Badge variant={state.variant}>{state.label}</Badge>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-lg border border-white/[0.07] p-3">
                        <Text variant="caption" color="tertiary">{en ? "Live price" : "实时价"}</Text>
                        <Text variant="body-sm" weight="semibold" className="mt-1 block">{number(currentPrice)}</Text>
                        <Text variant="caption" className={`mt-1 block ${quote?.fresh ? "text-emerald-300" : "text-amber-300"}`}>{quote ? quoteAge(quote.ageSeconds, en) : (en ? "snapshot" : "策略快照")}</Text>
                      </div>
                      <div className="rounded-lg border border-white/[0.07] p-3">
                        <Text variant="caption" color="tertiary">{en ? "Confidence" : "信心程度"}</Text>
                        <Text variant="body-sm" weight="semibold" className="mt-1 block">{confidence}%</Text>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-primary" style={{ width: `${confidence}%` }} /></div>
                      </div>
                      <div className="rounded-lg border border-white/[0.07] p-3">
                        <Text variant="caption" color="tertiary">{en ? "Technical / forecast" : "技术 / 预测"}</Text>
                        <Text variant="body-sm" weight="semibold" className="mt-1 block">{technical == null ? "—" : `${technical}%`} / {forecast == null ? "—" : `${forecast}%`}</Text>
                        <Text variant="caption" color="tertiary" className="mt-1 block">{conditionsMet}/{conditionsTotal || "—"} {en ? "conditions" : "项条件"}</Text>
                      </div>
                      <div className="rounded-lg border border-white/[0.07] p-3">
                        <Text variant="caption" color="tertiary">{en ? "Risk / reward to TP2" : "至TP2盈亏比"}</Text>
                        <Text variant="body-sm" weight="semibold" className="mt-1 block">{rrLabel(rr(entry, stop, target2))}</Text>
                        <Text variant="caption" color="tertiary" className="mt-1 block">{plan ? `${plan.riskPercent}% · ≤${plan.maxLeverage}x` : (en ? "set after lock" : "锁定计划后定仓")}</Text>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-primary/15 bg-primary/[0.025] p-3">
                      <Text variant="caption" color="tertiary">{en ? "AI conclusion" : "AI当前结论"}</Text>
                      <Text variant="body-sm" className="mt-1 block leading-relaxed">{conclusion}</Text>
                    </div>

                    <div className="mt-3 rounded-xl border border-white/[0.08] p-3">
                      <Text variant="caption" color="tertiary">{en ? "Execution formula" : "触发条件公式"}</Text>
                      <Text variant="body-sm" className="mt-1 block leading-relaxed">{formula}</Text>
                    </div>

                    <div className="mt-3 rounded-xl border border-white/[0.08] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <Text variant="caption" color="tertiary">{en ? "Condition details" : "条件明细"}</Text>
                        <Text variant="caption" color="tertiary">{conditionsMet}/{conditionsTotal || "—"}</Text>
                      </div>
                      <div className="mt-2 space-y-2">
                        {conditions.length ? conditions.map((condition) => (
                          <div key={condition.key} className="rounded-lg border border-white/[0.06] bg-white/[0.015] px-3 py-2">
                            <div className="flex gap-2 text-sm"><span className={condition.met ? "text-emerald-300" : "text-white/35"}>{condition.met ? "✓" : "○"}</span><span className="font-medium text-white/85">{condition.label}</span></div>
                            <p className="mt-1 pl-5 text-xs leading-relaxed text-white/45">{condition.value}</p>
                          </div>
                        )) : <Text variant="caption" color="tertiary">{en ? "No completed scan stored for this market and horizon yet." : "该品种该周期尚未写入完整扫描结果。"}</Text>}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <div className="rounded-lg border border-white/[0.07] p-3 sm:col-span-2">
                        <Text variant="caption" color="tertiary">{en ? "Entry condition / zone" : "计划入场条件/区域"}</Text>
                        <Text variant="body-sm" weight="semibold" className="mt-1 block">{plan ? `${number(plan.entryZoneLow)} — ${number(plan.entryZoneHigh)}` : entry == null ? (en ? "Not generated" : "尚未生成") : `${en ? "reference" : "参考"} ${number(entry)}`}</Text>
                      </div>
                      <div className="rounded-lg border border-red-300/10 p-3">
                        <Text variant="caption" color="tertiary">{en ? "Protective stop" : "保护止损"}</Text>
                        <Text variant="body-sm" weight="semibold" className="mt-1 block text-red-300">{number(stop)}</Text>
                      </div>
                      <div className="rounded-lg border border-emerald-300/10 p-3"><Text variant="caption" color="tertiary">TP1 · {rrLabel(rr(entry, stop, target1))}</Text><Text variant="body-sm" weight="semibold" className="mt-1 block text-emerald-300">{number(target1)}</Text></div>
                      <div className="rounded-lg border border-emerald-300/10 p-3"><Text variant="caption" color="tertiary">TP2 · {rrLabel(rr(entry, stop, target2))}</Text><Text variant="body-sm" weight="semibold" className="mt-1 block text-emerald-300">{number(target2)}</Text></div>
                      <div className="rounded-lg border border-emerald-300/10 p-3"><Text variant="caption" color="tertiary">TP3 · {rrLabel(rr(entry, stop, target3))}</Text><Text variant="body-sm" weight="semibold" className="mt-1 block text-emerald-300">{number(target3)}</Text></div>
                    </div>

                    <div className="mt-3 space-y-2 rounded-xl border border-white/[0.08] px-3 py-3 text-sm text-white/65">
                      <p><span className="text-white/40">{en ? "Stop basis: " : "止损依据："}</span>{stopBasis(horizon.key, direction, en)}</p>
                      <p><span className="text-white/40">{en ? "Target basis: " : "止盈依据："}</span>{targetBasis(entry, stop, [target1, target2, target3], en)}</p>
                      <p><span className="text-white/40">{en ? "Order state: " : "订单状态："}</span>{state.detail}</p>
                      {plan ? <p><span className="text-white/40">{en ? "Invalidation: " : "失效条件："}</span>{plan.invalidationRule} {plan.cancelIf}</p> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}

      {showHistory && dashboard.plans.length ? (
        <details className="rounded-lg border border-white/10 bg-black/10">
          <summary className="cursor-pointer px-4 py-3 text-sm text-white/70">{en ? "Recent locked plan versions" : "最近锁定计划版本"}</summary>
          <div className="border-t border-white/10">
            {dashboard.plans.slice(0, 30).map((plan) => (
              <div key={plan.id} className="grid gap-2 border-b border-white/[0.07] px-4 py-3 text-xs last:border-0 sm:grid-cols-[0.8fr_1fr_0.7fr_1fr_1.4fr]">
                <span>{en ? HORIZONS.find((item) => item.key === plan.strategyType)?.en : HORIZONS.find((item) => item.key === plan.strategyType)?.zh}</span>
                <span>{plan.symbol}</span>
                <span>V{plan.version} · {directionLabel(plan.direction, en)}</span>
                <span>{statusLabel(plan.status, en)}</span>
                <span className="text-white/45">{time(plan.publishedAt, en)} · {plan.contentHash.slice(0, 10)}</span>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      <Text variant="caption" color="tertiary" className="block">{dashboard.notice}</Text>
    </Card>
  );
}
