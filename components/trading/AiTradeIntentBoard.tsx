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

const STATUS_PRIORITY: Partial<Record<AiTradePlanStatus, number>> = {
  OPEN: 1,
  REDUCED: 2,
  PARTIALLY_FILLED: 3,
  ORDER_SUBMITTED: 4,
  ARMED: 5,
  WATCHING: 6,
  PUBLISHED: 7,
  EXECUTION_ERROR: 8,
};

function n(value: number | null, digits = 4): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function time(value: string | null, en: boolean): string {
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

function quoteAgeLabel(ageSeconds: number | null, en: boolean): string {
  if (ageSeconds == null) return en ? "time unknown" : "时间未知";
  if (ageSeconds < 60) return en ? `${ageSeconds}s ago` : `${ageSeconds}秒前`;
  return en ? `${Math.floor(ageSeconds / 60)}m ago` : `${Math.floor(ageSeconds / 60)}分钟前`;
}

function assetName(symbol: string, en: boolean): string {
  const asset = ASSETS.find(([code]) => code === symbol.toUpperCase());
  return asset ? asset[en ? 2 : 1] : symbol;
}

function directionLabel(direction: string, en: boolean): string {
  if (direction === "LONG") return en ? "Long" : "做多";
  if (direction === "SHORT") return en ? "Short" : "做空";
  return en ? "Watch" : "观望";
}

function directionVariant(direction: string) {
  if (direction === "LONG") return "success" as const;
  if (direction === "SHORT") return "danger" as const;
  return "outline" as const;
}

function statusLabel(status: AiTradePlanStatus | string, en: boolean): string {
  const labels: Record<string, [string, string]> = {
    PUBLISHED: ["已发布", "Published"],
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
    OBSERVING: ["观察中", "Observing"],
    READY: ["等待确认", "Ready"],
    SHADOW_READY: ["候选机会", "Candidate"],
    BLOCKED: ["风控拦截", "Risk blocked"],
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
    const aActive = TERMINAL.has(a.status) ? 1 : 0;
    const bActive = TERMINAL.has(b.status) ? 1 : 0;
    if (aActive !== bActive) return aActive - bActive;
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
  for (const decision of [...decisions].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))) {
    const symbol = decision.symbol.toUpperCase();
    if (!map.has(symbol)) map.set(symbol, decision);
  }
  return map;
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
  const plansBySymbol = latestPlanBySymbol(dashboard.plans);
  const decisionsBySymbol = latestDecisionBySymbol(dashboard.decisions ?? []);
  const quotesBySymbol = new Map((dashboard.quotes ?? []).map((quote) => [quote.symbol.toUpperCase(), quote] as const));
  const generatedAt = Date.parse(dashboard.generatedAt);
  const activePlans = Array.from(plansBySymbol.values())
    .filter((plan) => !TERMINAL.has(plan.status) && (
      ["ORDER_SUBMITTED", "PARTIALLY_FILLED", "OPEN", "REDUCED"].includes(plan.status) ||
      !Number.isFinite(generatedAt) || Date.parse(plan.expiresAt) > generatedAt
    ))
    .sort((a, b) => {
      const priority = (STATUS_PRIORITY[a.status] ?? 99) - (STATUS_PRIORITY[b.status] ?? 99);
      return priority || b.planningConfidence - a.planningConfidence;
    });

  return (
    <Card padding="lg" className="space-y-5 border-primary/20 bg-primary/[0.018]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Heading size="h3">{en ? "AI Trade Intent" : "AI当前交易意图"}</Heading>
          <Text variant="body-sm" color="secondary" className="mt-1 block">
            {en
              ? "Plans are published and locked before an order can be submitted."
              : "显示Bitget最新行情、当前方向和锁定计划；达到技术触发与风控条件后才允许提交订单。"}
          </Text>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{en ? "10 markets" : "10个品种"}</Badge>
          <Badge variant={activePlans.length ? "warning" : "outline"}>
            {en ? `${activePlans.length} active plans` : `${activePlans.length}个有效计划`}
          </Badge>
          <Badge variant={dashboard.summary.submittedOrOpen ? "success" : "outline"}>
            {en ? `${dashboard.summary.submittedOrOpen} orders / positions` : `${dashboard.summary.submittedOrOpen}个委托或持仓`}
          </Badge>
        </div>
      </div>

      {activePlans.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {activePlans.slice(0, 6).map((plan) => {
            const quote = quotesBySymbol.get(plan.symbol.toUpperCase());
            const livePrice = quote?.price ?? plan.currentPrice;
            return (
            <div key={plan.id} className="rounded-xl border border-white/10 bg-black/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Text variant="body" weight="semibold">{assetName(plan.symbol, en)}</Text>
                    <Text variant="caption" color="tertiary">{plan.symbol}</Text>
                    <Badge variant={directionVariant(plan.direction)}>{directionLabel(plan.direction, en)}</Badge>
                  </div>
                  <Text variant="caption" color="tertiary" className="mt-1 block">
                    {plan.strategyLabel} · V{plan.version} · {time(plan.publishedAt, en)}
                  </Text>
                </div>
                <Badge variant={statusVariant(plan.status)}>{statusLabel(plan.status, en)}</Badge>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
                <div><Text variant="caption" color="tertiary">{en ? "Confidence" : "置信度"}</Text><Text variant="body-sm" className="mt-1 block">{plan.planningConfidence}%</Text></div>
                <div>
                  <Text variant="caption" color="tertiary">{en ? "Live price" : "实时价"}</Text>
                  <Text variant="body-sm" className="mt-1 block">{n(livePrice)}</Text>
                  <Text variant="caption" className={`mt-0.5 block ${quote?.fresh ? "text-emerald-300" : "text-amber-300"}`}>
                    {quote ? quoteAgeLabel(quote.ageSeconds, en) : (en ? "plan snapshot" : "计划快照")}
                  </Text>
                </div>
                <div className="col-span-2"><Text variant="caption" color="tertiary">{en ? "Entry zone" : "计划入场区"}</Text><Text variant="body-sm" className="mt-1 block">{n(plan.entryZoneLow)} — {n(plan.entryZoneHigh)}</Text></div>
                <div><Text variant="caption" color="tertiary">{en ? "Stop" : "止损"}</Text><Text variant="body-sm" className="mt-1 block text-red-300">{n(plan.protectiveStop)}</Text></div>
                <div><Text variant="caption" color="tertiary">TP1</Text><Text variant="body-sm" className="mt-1 block text-emerald-300">{n(plan.target1)}</Text></div>
                <div><Text variant="caption" color="tertiary">TP2</Text><Text variant="body-sm" className="mt-1 block text-emerald-300">{n(plan.target2)}</Text></div>
                <div><Text variant="caption" color="tertiary">TP3</Text><Text variant="body-sm" className="mt-1 block text-emerald-300">{n(plan.target3)}</Text></div>
              </div>

              <div className="mt-4 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2">
                <Text variant="body-sm">{plan.thesisSummary}</Text>
                <Text variant="caption" color="secondary" className="mt-1 block line-clamp-2">
                  {en ? "Trigger: " : "触发："}{plan.triggerRule}
                </Text>
                <Text variant="caption" color="tertiary" className="mt-1 block">
                  {en ? "Conditions" : "条件"} {plan.conditionsMet}/{plan.conditionsTotal}
                  {" · "}{en ? "Risk" : "计划风险"} {plan.riskPercent}%
                  {" · "}{en ? "Leverage" : "杠杆"} ≤{plan.maxLeverage}x
                  {" · "}{en ? "Valid until" : "有效至"} {time(plan.expiresAt, en)}
                </Text>
              </div>
            </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-black/10 px-4 py-5">
          <Text variant="body-sm" color="secondary">
            {en ? "No plan has reached the publication threshold. The system remains in watch mode." : "目前没有达到发布门槛的交易计划，系统保持观望，不会勉强下单。"}
          </Text>
        </div>
      )}

      <div>
        <Text variant="caption" color="tertiary" className="mb-2 block">
          {en ? "All monitored markets" : "全部监控品种"}
        </Text>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {ASSETS.map(([symbol, zh, english]) => {
            const plan = plansBySymbol.get(symbol);
            const activePlan = plan && !TERMINAL.has(plan.status) && (
              ["ORDER_SUBMITTED", "PARTIALLY_FILLED", "OPEN", "REDUCED"].includes(plan.status) ||
              !Number.isFinite(generatedAt) || Date.parse(plan.expiresAt) > generatedAt
            ) ? plan : undefined;
            const decision = decisionsBySymbol.get(symbol);
            const quote = quotesBySymbol.get(symbol);
            const direction = activePlan?.direction ?? decision?.direction ?? "NEUTRAL";
            const status = activePlan?.status ?? decision?.status ?? "OBSERVING";
            const confidence = activePlan?.planningConfidence ?? decision?.confidence ?? 0;
            const reason = activePlan?.thesisSummary || decision?.rejectionReason || (en ? "No formal plan." : "暂无正式计划。");
            return (
              <div key={symbol} className="min-w-0 rounded-lg border border-white/[0.08] bg-white/[0.018] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Text variant="body-sm" weight="semibold" className="block truncate">{en ? english : zh}</Text>
                    <Text variant="caption" color="tertiary">{symbol}</Text>
                  </div>
                  <Badge variant={directionVariant(direction)}>{directionLabel(direction, en)}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <Text variant="caption" color="secondary" className="truncate">{statusLabel(status, en)}</Text>
                  <Text variant="caption" color="tertiary">{confidence ? `${confidence}%` : "—"}</Text>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <Text variant="body-sm" weight="semibold">{n(quote?.price ?? activePlan?.currentPrice ?? decision?.currentPrice ?? null)}</Text>
                  <Text variant="caption" className={quote?.fresh ? "text-emerald-300" : "text-white/35"}>
                    {quote ? quoteAgeLabel(quote.ageSeconds, en) : (en ? "no live quote" : "暂无实时价")}
                  </Text>
                </div>
                <Text variant="caption" color="tertiary" className="mt-1 block line-clamp-2">{reason}</Text>
              </div>
            );
          })}
        </div>
      </div>

      {showHistory && dashboard.plans.length ? (
        <details className="rounded-lg border border-white/10 bg-black/10">
          <summary className="cursor-pointer px-4 py-3 text-sm text-white/70">
            {en ? "Recent locked versions" : "最近锁定版本"}
          </summary>
          <div className="border-t border-white/10">
            {dashboard.plans.slice(0, 10).map((plan) => (
              <div key={plan.id} className="grid gap-2 border-b border-white/[0.07] px-4 py-3 text-xs last:border-0 sm:grid-cols-[1.1fr_0.7fr_1fr_1.4fr]">
                <span>{assetName(plan.symbol, en)} · {plan.symbol}</span>
                <span>V{plan.version} · {directionLabel(plan.direction, en)}</span>
                <span>{statusLabel(plan.status, en)}</span>
                <span className="text-white/45">{time(plan.publishedAt, en)} · {plan.contentHash.slice(0, 10)}</span>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </Card>
  );
}
