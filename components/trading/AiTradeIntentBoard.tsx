"use client";

import { Badge, Card, Heading, Text } from "@/components/ui";
import type {
  AiTradeIntentDecision,
  AiTradePlan,
  AiTradePlanDashboard,
  AiTradePlanStatus,
} from "@/types/ai-trade-plan";

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
    READY: ["等待执行", "Awaiting execution"],
    SHADOW_READY: ["候选机会", "Candidate"],
    BLOCKED: ["暂不下单", "No order"],
    PARTIAL: ["部分止盈", "Reduced"],
    CLOSING: ["退出中", "Closing"],
    ERROR: ["扫描异常", "Scan error"],
  };
  const pair = labels[status];
  return pair ? pair[en ? 1 : 0] : status;
}

function statusVariant(status: string) {
  if (["OPEN", "REDUCED", "PARTIALLY_FILLED", "CLOSED"].includes(status)) return "success" as const;
  if (["ARMED", "READY", "ORDER_SUBMITTED"].includes(status)) return "warning" as const;
  if (["EXECUTION_ERROR", "ERROR", "INVALIDATED", "CANCELLED"].includes(status)) return "danger" as const;
  return "outline" as const;
}

function latestPlanBySymbol(plans: AiTradePlan[]): Map<string, AiTradePlan> {
  const map = new Map<string, AiTradePlan>();
  const ordered = [...plans].sort((a, b) => {
    const aTerminal = TERMINAL.has(a.status) ? 1 : 0;
    const bTerminal = TERMINAL.has(b.status) ? 1 : 0;
    if (aTerminal !== bTerminal) return aTerminal - bTerminal;
    if (a.version !== b.version) return b.version - a.version;
    return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
  });
  for (const plan of ordered) {
    const symbol = plan.symbol.toUpperCase();
    if (!map.has(symbol)) map.set(symbol, plan);
  }
  return map;
}

function latestDecisionBySymbol(decisions: AiTradeIntentDecision[]): Map<string, AiTradeIntentDecision> {
  const map = new Map<string, AiTradeIntentDecision>();
  const ordered = [...decisions].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  for (const decision of ordered) {
    const symbol = decision.symbol.toUpperCase();
    if (!map.has(symbol)) map.set(symbol, decision);
  }
  return map;
}

function activePlan(plan: AiTradePlan | undefined, generatedAt: number): AiTradePlan | undefined {
  if (!plan || TERMINAL.has(plan.status)) return undefined;
  if (EXECUTED.has(plan.status)) return plan;
  if (!Number.isFinite(generatedAt) || Date.parse(plan.expiresAt) > generatedAt) return plan;
  return undefined;
}

function midpoint(low: number, high: number): number {
  return (low + high) / 2;
}

function rewardRatio(
  entry: number | null | undefined,
  stop: number | null | undefined,
  target: number | null | undefined
): number | null {
  if (entry == null || stop == null || target == null) return null;
  const risk = Math.abs(entry - stop);
  if (!Number.isFinite(risk) || risk <= 0) return null;
  return Math.abs(target - entry) / risk;
}

function ratioLabel(value: number | null, en: boolean): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return en ? `1 : ${value.toFixed(2)}` : `1：${value.toFixed(2)}`;
}

function strategyFormula(
  decision: AiTradeIntentDecision | undefined,
  plan: AiTradePlan | undefined,
  en: boolean
): string {
  if (plan?.triggerRule) return plan.triggerRule;
  const direction = decision?.direction ?? "NEUTRAL";
  const strategy = decision?.strategyType ?? "INTRADAY";
  const side = direction === "LONG" ? (en ? "long" : "做多") : direction === "SHORT" ? (en ? "short" : "做空") : "";
  if (direction === "NEUTRAL") {
    return en
      ? "No order while the higher-timeframe direction is neutral. The system waits for trend, structure, closing-candle confirmation and risk filters to agree."
      : "高周期方向为中性时不下单。系统继续等待趋势、结构、收盘K线确认、成交与波动风控同时一致。";
  }
  if (strategy === "SWING") {
    return en
      ? `Weekly and daily direction must not conflict; 4H structure must remain valid; a completed 1H candle confirms the ${side} trigger; forecast and risk filters must pass.`
      : `周线与日线方向不冲突 ∧ 4小时结构有效 ∧ 1小时K线收盘确认${side} ∧ 预测方向与组合风控通过。`;
  }
  if (strategy === "POSITION") {
    return en
      ? `Monthly and weekly direction must agree; daily structure must remain valid; a completed 4H candle confirms the ${side} trigger; forecast and risk filters must pass.`
      : `月度与周度方向一致 ∧ 日线结构有效 ∧ 4小时K线收盘确认${side} ∧ 预测方向与组合风控通过。`;
  }
  return en
    ? `1H environment and 15m direction must agree; a completed 5m candle confirms the ${side} trigger; volume, volatility and portfolio risk filters must pass.`
    : `1小时环境与15分钟方向一致 ∧ 5分钟K线收盘确认${side} ∧ 成交量、波动率和组合风控全部通过。`;
}

function entryLabel(plan: AiTradePlan | undefined, decision: AiTradeIntentDecision | undefined, en: boolean): string {
  if (plan) return `${number(plan.entryZoneLow)} — ${number(plan.entryZoneHigh)}`;
  if (decision?.entryPrice != null) return `${en ? "reference" : "参考"} ${number(decision.entryPrice)}`;
  return en ? "Not generated" : "尚未生成";
}

function stopBasis(direction: string, plan: AiTradePlan | undefined, en: boolean): string {
  if (plan?.invalidationRule) return plan.invalidationRule;
  if (direction === "LONG") {
    return en
      ? "Below the recent structural low; the wider of structure distance and ATR protection is used."
      : "放在最近结构低点下方；结构距离与ATR保护距离取更宽者，避免止损过紧。";
  }
  if (direction === "SHORT") {
    return en
      ? "Above the recent structural high; the wider of structure distance and ATR protection is used."
      : "放在最近结构高点上方；结构距离与ATR保护距离取更宽者，避免止损过紧。";
  }
  return en
    ? "A stop is generated only after direction, entry and ATR structure become valid."
    : "只有方向、入场和ATR结构有效后才生成止损；观望状态不虚构止损价格。";
}

function orderState(plan: AiTradePlan | undefined, en: boolean) {
  if (plan && EXECUTED.has(plan.status)) {
    return {
      label: en ? "BITGET ORDER / POSITION" : "BITGET真实委托/持仓",
      detail: en ? "This item has reached exchange execution." : "该项已进入交易所执行阶段，不再只是AI纸面计划。",
      variant: "success" as const,
    };
  }
  if (plan) {
    return {
      label: en ? "LOCKED AI PLAN" : "AI锁定计划·尚未下单",
      detail: en ? "Published and locked before execution; not an exchange order yet." : "计划已事前发布并锁定，但尚未向Bitget提交订单。",
      variant: "warning" as const,
    };
  }
  return {
    label: en ? "AI ANALYSIS · NO ORDER" : "AI分析·不是订单",
    detail: en ? "The market was analysed, but no formal plan passed the publication and execution gates." : "该品种已完成本轮分析，但尚未通过正式计划发布和执行闸门。",
    variant: "outline" as const,
  };
}

function conditionRows(decision: AiTradeIntentDecision | undefined, en: boolean) {
  if (decision?.conditions?.length) return decision.conditions;
  return [
    {
      key: "scan",
      label: en ? "Strategy scan" : "策略扫描",
      met: false,
      value: en ? "No stored decision for the latest scan yet." : "最新一轮尚未写入可展示的数据库决策。",
      weight: 0,
    },
  ];
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
  const planMap = latestPlanBySymbol(dashboard.plans ?? []);
  const decisionMap = latestDecisionBySymbol(dashboard.decisions ?? []);
  const quoteMap = new Map((dashboard.quotes ?? []).map((quote) => [quote.symbol.toUpperCase(), quote] as const));
  const generatedAt = Date.parse(dashboard.generatedAt);
  const analysed = ASSETS.filter(([symbol]) => decisionMap.has(symbol)).length;
  const lockedPlans = ASSETS.filter(([symbol]) => Boolean(activePlan(planMap.get(symbol), generatedAt))).length;

  return (
    <Card padding="lg" className="space-y-6 border-primary/20 bg-primary/[0.018]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Heading size="h3">{en ? "AI Trade Logic — 10 Markets" : "AI交易思路公开 · 10品种全分析"}</Heading>
          <Text variant="body-sm" color="secondary" className="mt-1 block max-w-4xl">
            {en
              ? "Direction, conditions, entry, stop, targets, risk/reward, confidence and no-order reasons are shown for every market."
              : "十个品种逐一展示方向、条件明细、入场、止盈止损依据、盈亏比、信心度与不下单原因。"}
          </Text>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={analysed === 10 ? "success" : "warning"}>{en ? `${analysed}/10 analysed` : `已分析 ${analysed}/10`}</Badge>
          <Badge variant={lockedPlans ? "warning" : "outline"}>{en ? `${lockedPlans} locked plans` : `${lockedPlans}个锁定计划`}</Badge>
          <Badge variant={dashboard.summary.submittedOrOpen ? "success" : "outline"}>
            {en ? `${dashboard.summary.submittedOrOpen} real orders / positions` : `${dashboard.summary.submittedOrOpen}个真实委托/持仓`}
          </Badge>
        </div>
      </div>

      <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.035] px-4 py-3">
        <Text variant="body-sm" className="text-amber-100">
          {en
            ? "Analysis is not an order. Only cards labelled BITGET ORDER / POSITION have reached exchange execution."
            : "AI方向和价格计划不等于已经下单；只有标记“BITGET真实委托/持仓”的卡片，才代表已经进入交易所执行。"}
        </Text>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {ASSETS.map(([symbol, zh, english]) => {
          const plan = activePlan(planMap.get(symbol), generatedAt);
          const decision = decisionMap.get(symbol);
          const quote = quoteMap.get(symbol);
          const direction = plan?.direction ?? decision?.direction ?? "NEUTRAL";
          const status = plan?.status ?? decision?.status ?? "OBSERVING";
          const confidence = Math.max(0, Math.min(100, plan?.planningConfidence ?? decision?.confidence ?? 0));
          const currentPrice = quote?.price ?? plan?.currentPrice ?? decision?.currentPrice ?? null;
          const entry = plan ? midpoint(plan.entryZoneLow, plan.entryZoneHigh) : decision?.entryPrice ?? null;
          const stop = plan?.protectiveStop ?? decision?.stopLoss ?? null;
          const target1 = plan?.target1 ?? decision?.target1 ?? null;
          const target2 = plan?.target2 ?? decision?.target2 ?? null;
          const target3 = plan?.target3 ?? null;
          const rr1 = rewardRatio(entry, stop, target1);
          const rr2 = rewardRatio(entry, stop, target2);
          const rr3 = rewardRatio(entry, stop, target3);
          const conditions = conditionRows(decision, en);
          const conditionsMet = plan?.conditionsMet ?? decision?.conditionsMet ?? conditions.filter((row) => row.met).length;
          const conditionsTotal = plan?.conditionsTotal ?? decision?.conditionsTotal ?? conditions.length;
          const state = orderState(plan, en);
          const updatedAt = quote?.capturedAt ?? plan?.lastCheckedAt ?? plan?.updatedAt ?? decision?.updatedAt ?? null;
          const conclusion = plan?.thesisSummary || decision?.rejectionReason || (en ? "Waiting for the next completed strategy scan." : "等待下一轮完整策略扫描。 ");

          return (
            <article key={symbol} className="rounded-2xl border border-white/10 bg-black/10 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Text variant="body" weight="semibold">{en ? english : zh}</Text>
                    <Text variant="caption" color="tertiary">{symbol}</Text>
                    <Badge variant={directionVariant(direction)}>{directionLabel(direction, en)}</Badge>
                  </div>
                  <Text variant="caption" color="tertiary" className="mt-1 block">
                    {plan ? `${plan.strategyLabel} · V${plan.version}` : decision ? `${decision.strategyLabel ?? (en ? "Strategy" : "策略")} · ${en ? "latest decision" : "最新决策"}` : (en ? "waiting for decision" : "等待决策")}
                    {" · "}{time(updatedAt, en)}
                  </Text>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Badge variant={statusVariant(status)}>{statusLabel(status, en)}</Badge>
                  <Badge variant={state.variant}>{state.label}</Badge>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-white/[0.07] bg-white/[0.018] p-3">
                  <Text variant="caption" color="tertiary">{en ? "Live price" : "实时价"}</Text>
                  <Text variant="body-sm" weight="semibold" className="mt-1 block">{number(currentPrice)}</Text>
                  <Text variant="caption" className={`mt-1 block ${quote?.fresh ? "text-emerald-300" : "text-amber-300"}`}>
                    {quote ? quoteAge(quote.ageSeconds, en) : (en ? "strategy snapshot" : "策略快照")}
                  </Text>
                </div>
                <div className="rounded-lg border border-white/[0.07] bg-white/[0.018] p-3">
                  <Text variant="caption" color="tertiary">{en ? "Confidence" : "信心程度"}</Text>
                  <Text variant="body-sm" weight="semibold" className="mt-1 block">{confidence}%</Text>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${confidence}%` }} />
                  </div>
                </div>
                <div className="rounded-lg border border-white/[0.07] bg-white/[0.018] p-3">
                  <Text variant="caption" color="tertiary">{en ? "Technical / forecast" : "技术 / 预测"}</Text>
                  <Text variant="body-sm" weight="semibold" className="mt-1 block">
                    {decision ? `${decision.technicalScore ?? 0}% / ${decision.forecastScore ?? 0}%` : "—"}
                  </Text>
                  <Text variant="caption" color="tertiary" className="mt-1 block">{conditionsMet}/{conditionsTotal || "—"} {en ? "conditions" : "项条件"}</Text>
                </div>
                <div className="rounded-lg border border-white/[0.07] bg-white/[0.018] p-3">
                  <Text variant="caption" color="tertiary">{en ? "Risk / reward to TP2" : "至TP2盈亏比"}</Text>
                  <Text variant="body-sm" weight="semibold" className="mt-1 block">{ratioLabel(rr2, en)}</Text>
                  <Text variant="caption" color="tertiary" className="mt-1 block">
                    {plan ? `${plan.riskPercent}% · ≤${plan.maxLeverage}x` : decision?.riskPct != null ? `${decision.riskPct}%` : (en ? "not sized" : "尚未定仓")}
                  </Text>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-primary/15 bg-primary/[0.025] p-3">
                <Text variant="caption" color="tertiary">{en ? "AI conclusion" : "AI当前结论"}</Text>
                <Text variant="body-sm" className="mt-1 block leading-relaxed">{conclusion}</Text>
              </div>

              <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.018] p-3">
                <Text variant="caption" color="tertiary">{en ? "Execution formula" : "触发条件公式"}</Text>
                <Text variant="body-sm" className="mt-1 block leading-relaxed">{strategyFormula(decision, plan, en)}</Text>
              </div>

              <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.018] p-3">
                <div className="flex items-center justify-between gap-3">
                  <Text variant="caption" color="tertiary">{en ? "Condition checklist" : "条件明细"}</Text>
                  <Text variant="caption" color="tertiary">{conditionsMet}/{conditionsTotal || conditions.length}</Text>
                </div>
                <div className="mt-2 space-y-2">
                  {conditions.map((condition) => (
                    <div key={`${symbol}-${condition.key}`} className="flex gap-2 rounded-lg border border-white/[0.06] px-3 py-2">
                      <span className={condition.met ? "text-emerald-300" : "text-white/30"}>{condition.met ? "✓" : "○"}</span>
                      <div className="min-w-0">
                        <Text variant="body-sm" weight="semibold">{condition.label}</Text>
                        <Text variant="caption" color="secondary" className="mt-0.5 block leading-relaxed">{condition.value}</Text>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div className="rounded-lg border border-white/[0.07] p-3 sm:col-span-2">
                  <Text variant="caption" color="tertiary">{en ? "Entry condition / zone" : "计划入场条件/区域"}</Text>
                  <Text variant="body-sm" weight="semibold" className="mt-1 block">{entryLabel(plan, decision, en)}</Text>
                </div>
                <div className="rounded-lg border border-red-300/10 p-3">
                  <Text variant="caption" color="tertiary">{en ? "Protective stop" : "保护止损"}</Text>
                  <Text variant="body-sm" weight="semibold" className="mt-1 block text-red-300">{number(stop)}</Text>
                </div>
                <div className="rounded-lg border border-emerald-300/10 p-3">
                  <Text variant="caption" color="tertiary">TP1 · {ratioLabel(rr1, en)}</Text>
                  <Text variant="body-sm" weight="semibold" className="mt-1 block text-emerald-300">{number(target1)}</Text>
                </div>
                <div className="rounded-lg border border-emerald-300/10 p-3">
                  <Text variant="caption" color="tertiary">TP2 · {ratioLabel(rr2, en)}</Text>
                  <Text variant="body-sm" weight="semibold" className="mt-1 block text-emerald-300">{number(target2)}</Text>
                </div>
                <div className="rounded-lg border border-emerald-300/10 p-3">
                  <Text variant="caption" color="tertiary">TP3 · {ratioLabel(rr3, en)}</Text>
                  <Text variant="body-sm" weight="semibold" className="mt-1 block text-emerald-300">{number(target3)}</Text>
                </div>
              </div>

              <div className="mt-3 space-y-2 rounded-xl border border-white/[0.08] px-3 py-3 text-sm text-white/65">
                <p><span className="text-white/40">{en ? "Stop basis: " : "止损依据："}</span>{stopBasis(direction, plan, en)}</p>
                <p><span className="text-white/40">{en ? "Target logic: " : "止盈依据："}</span>{en ? "TP1 reduces risk; TP2 is the main target; TP3 is an extended target. After TP1, the remaining position can move toward breakeven protection." : "TP1先降风险，TP2为主要目标，TP3为延伸目标；TP1完成后，剩余仓位可转为保本保护。"}</p>
                <p><span className="text-white/40">{en ? "Order state: " : "订单状态："}</span>{state.detail}</p>
                {decision?.maxHoldingUntil ? <p><span className="text-white/40">{en ? "Maximum holding until: " : "最长持有至："}</span>{time(decision.maxHoldingUntil, en)}</p> : null}
                {plan?.cancelIf ? <p><span className="text-white/40">{en ? "Cancel if: " : "取消条件："}</span>{plan.cancelIf}</p> : null}
              </div>
            </article>
          );
        })}
      </div>

      {showHistory && dashboard.plans.length ? (
        <details className="rounded-lg border border-white/10 bg-black/10">
          <summary className="cursor-pointer px-4 py-3 text-sm text-white/70">
            {en ? "Recent locked plan versions" : "最近锁定计划版本"}
          </summary>
          <div className="border-t border-white/10">
            {dashboard.plans.slice(0, 20).map((plan) => (
              <div key={plan.id} className="grid gap-2 border-b border-white/[0.07] px-4 py-3 text-xs last:border-0 sm:grid-cols-[1.1fr_0.7fr_1fr_1.4fr]">
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
