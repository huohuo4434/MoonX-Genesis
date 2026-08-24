import type { AiTradePlan, AiTradePlanSummary } from "@/types/ai-trade-plan";
import type { AiTradingDeskPlan, AiTradingDeskPlanStatus } from "@/types/ai-trading-desk";

export function aiTradePlanDashboardReadPolicy(readOnly: boolean): {
  ensureSchema: boolean;
  expirePlans: boolean;
} {
  return readOnly
    ? { ensureSchema: false, expirePlans: false }
    : { ensureSchema: true, expirePlans: true };
}

function status(plan: AiTradePlan, hasPosition: boolean): { value: AiTradingDeskPlanStatus; label: string } {
  if (hasPosition) {
    return { value: "POSITION_OPEN", label: "持仓中" };
  }
  if (["OPEN", "PARTIALLY_FILLED", "REDUCED"].includes(plan.status)) {
    return { value: "ERROR", label: "计划账本待对账" };
  }
  if (plan.status === "EXECUTION_ERROR") return { value: "ERROR", label: "检查异常" };
  if (plan.status === "CLOSED") return { value: "BLOCKED", label: "计划已结束" };
  if (["CANCELLED", "EXPIRED", "INVALIDATED", "SUPERSEDED"].includes(plan.status)) {
    return { value: "BLOCKED", label: "计划已停止" };
  }
  if (plan.status === "ORDER_SUBMITTED" || plan.status === "ARMED") return { value: "READY", label: "已触发" };
  if (plan.direction === "LONG") return { value: "WAIT_LONG", label: "等待低吸" };
  if (plan.direction === "SHORT") return { value: "WAIT_SHORT", label: "等待高空" };
  return { value: "OBSERVE", label: "暂不交易" };
}

export function buildMemberDeskPlansFromPersistedAudit(input: {
  plans: readonly AiTradePlan[];
  openPositions: readonly { symbol: string; posSide: "long" | "short" }[];
  executionMode: AiTradePlan["executionMode"];
}): AiTradingDeskPlan[] {
  const latest = new Map<string, AiTradePlan>();
  const compare = (left: AiTradePlan, right: AiTradePlan): number =>
    left.updatedAt.localeCompare(right.updatedAt) ||
    left.publishedAt.localeCompare(right.publishedAt) ||
    left.version - right.version ||
    left.id.localeCompare(right.id);
  for (const plan of input.plans.filter((row) => row.executionMode === input.executionMode)) {
    const symbol = plan.symbol.toUpperCase();
    const strategyType = plan.strategyType ?? (plan.forecastHorizon === "MONTH" ? "POSITION" : "INTRADAY");
    const key = `${strategyType}:${symbol}`;
    const current = latest.get(key);
    if (!current || compare(plan, current) > 0) latest.set(key, plan);
  }
  return Array.from(latest.values()).map((plan) => {
    const strategyType = plan.strategyType ?? (plan.forecastHorizon === "MONTH" ? "POSITION" : "INTRADAY");
    const planSide = plan.direction === "LONG" ? "long" : plan.direction === "SHORT" ? "short" : null;
    const hasPosition = input.openPositions.some((position) =>
      position.symbol.toUpperCase() === plan.symbol.toUpperCase() &&
      planSide !== null && position.posSide === planSide
    );
    const planStatus = status(plan, hasPosition);
    const locked = plan.forecastVersion && plan.forecastLockedAt
      ? `${plan.forecastHorizon ?? "正式"}锁定预测 ${plan.forecastVersion}`
      : "已持久化交易计划";
    return {
      symbol: plan.symbol,
      assetName: plan.symbol.replace(/USDT$/i, ""),
      strategyType,
      strategyLabel: plan.strategyLabel || (strategyType === "INTRADAY" ? "短线" : strategyType === "SWING" ? "中线" : "长线"),
      forecastHorizon: plan.forecastHorizon,
      holdingWindow: strategyType === "INTRADAY" ? "30分钟—8小时" : strategyType === "SWING" ? "1—7天" : "1—4周",
      status: planStatus.value,
      statusLabel: planStatus.label,
      direction: plan.direction,
      confidence: plan.planningConfidence,
      weeklyText: plan.forecastHorizon === "WEEK" || plan.forecastHorizon === "MONTH" ? locked : plan.thesisSummary,
      dailyText: plan.forecastHorizon === "DAY" ? locked : plan.triggerRule,
      actionText: plan.closeReason || plan.triggerRule,
      triggerText: `${plan.triggerRule} 条件进度 ${plan.conditionsMet}/${plan.conditionsTotal}`,
      invalidationText: plan.invalidationRule || plan.cancelIf,
      keyLevel: plan.direction === "LONG" ? plan.entryZoneHigh : plan.direction === "SHORT" ? plan.entryZoneLow : null,
      currentPrice: plan.currentPrice,
      lastCheckedAt: plan.lastCheckedAt ?? plan.updatedAt,
    };
  });
}

export function summarizePersistedPlans(plans: readonly AiTradePlan[], now: Date): AiTradePlanSummary {
  const latestByGroup = new Map<string, AiTradePlan>();
  const earliestPublishedByGroup = new Map<string, AiTradePlan>();
  const compare = (left: AiTradePlan, right: AiTradePlan): number =>
    left.version - right.version ||
    left.updatedAt.localeCompare(right.updatedAt) ||
    left.publishedAt.localeCompare(right.publishedAt) ||
    left.id.localeCompare(right.id);
  for (const plan of plans) {
    const current = latestByGroup.get(plan.planGroupId);
    if (!current || compare(plan, current) > 0) latestByGroup.set(plan.planGroupId, plan);
    const earliest = earliestPublishedByGroup.get(plan.planGroupId);
    if (!earliest || plan.publishedAt < earliest.publishedAt ||
      (plan.publishedAt === earliest.publishedAt && plan.id < earliest.id)) {
      earliestPublishedByGroup.set(plan.planGroupId, plan);
    }
  }
  const latestPlans = Array.from(latestByGroup.values());
  const firstPublications = Array.from(earliestPublishedByGroup.values());
  const day = new Date(now.getTime() + 8 * 60 * 60_000).toISOString().slice(0, 10);
  const isToday = (value: string | null) => Boolean(value) &&
    new Date(new Date(value as string).getTime() + 8 * 60 * 60_000).toISOString().slice(0, 10) === day;
  return {
    publishedToday: firstPublications.filter((plan) => isToday(plan.publishedAt)).length,
    watching: latestPlans.filter((plan) => ["PUBLISHED", "WATCHING"].includes(plan.status)).length,
    armed: latestPlans.filter((plan) => plan.status === "ARMED").length,
    submittedOrOpen: latestPlans.filter((plan) => ["ORDER_SUBMITTED", "PARTIALLY_FILLED", "OPEN", "REDUCED"].includes(plan.status)).length,
    closedToday: latestPlans.filter((plan) => plan.status === "CLOSED" && isToday(plan.closedAt)).length,
  };
}
