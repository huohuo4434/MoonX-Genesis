import type {
  AiTradingDeskOperationalState,
  AiTradingDeskSnapshot,
} from "@/types/ai-trading-desk";

export const AI_DESK_QUOTE_STALE_MS = 10 * 60_000;

const LABELS: Record<AiTradingDeskOperationalState, string> = {
  DATA_DISCONNECTED: "数据未连接",
  CONNECTING: "正在连接",
  DATA_DELAYED: "行情延迟",
  PLAN_ONLY: "仅生成计划",
  WAITING_ENTRY: "等待入场条件",
  SIMULATION_POSITION: "模拟持仓中",
  PAUSED: "已暂停",
  SERVICE_ERROR: "服务异常",
};

function timeMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

export function sanitizePlanHorizonText(
  value: string | null | undefined,
  horizon: "DAILY" | "WEEKLY"
): string {
  const text = String(value ?? "").trim();
  if (!text) return horizon === "DAILY" ? "日内节奏待重新确认" : "周度方向待重新确认";
  const hasLongHorizon = /季度|全年|年内|未来数月|\d{1,2}\s*[—–-]\s*\d{1,2}\s*月/.test(text);
  if (horizon === "WEEKLY" && hasLongHorizon) return "周度方向待重新确认";
  if (horizon === "DAILY" && (/本周|周初|周中|周末|前半周|后半周/.test(text) || hasLongHorizon)) {
    return "日内节奏待重新确认";
  }
  return text;
}

export function applyAiDeskOperationalState(
  snapshot: AiTradingDeskSnapshot,
  now = new Date(snapshot.generatedAt)
): AiTradingDeskSnapshot {
  const latestPlanCheck = snapshot.plans
    .map((plan) => timeMs(plan.lastCheckedAt))
    .filter((value): value is number => value != null)
    .sort((a, b) => b - a)[0] ?? null;
  const runtimeQuoteCheck = timeMs(snapshot.latestQuoteAt);
  const latestQuoteCheck = Math.max(latestPlanCheck ?? 0, runtimeQuoteCheck ?? 0) || null;
  const latestQuoteAt = latestQuoteCheck == null ? null : new Date(latestQuoteCheck).toISOString();
  const hasQuote = snapshot.plans.some(
    (plan) => plan.currentPrice != null && Number.isFinite(plan.currentPrice)
  ) || Boolean(snapshot.quoteReady && runtimeQuoteCheck != null);
  const stale = latestQuoteCheck == null || now.getTime() - latestQuoteCheck > AI_DESK_QUOTE_STALE_MS;

  let state: AiTradingDeskOperationalState;
  if (!snapshot.settings.enabled || snapshot.runtime.paused) state = "PAUSED";
  else if (snapshot.syncStatus === "ERROR" || !snapshot.serverHealthy) state = "SERVICE_ERROR";
  else if (!snapshot.strategyEnabled) state = "PAUSED";
  else if (!snapshot.plans.length) state = "DATA_DISCONNECTED";
  else if (!hasQuote || latestPlanCheck == null) state = "PLAN_ONLY";
  else if (stale) state = "DATA_DELAYED";
  else if (snapshot.positions.length) state = "SIMULATION_POSITION";
  else state = "WAITING_ENTRY";

  const quoteReady = hasQuote && latestPlanCheck != null && !stale;
  const syncStatus: AiTradingDeskSnapshot["syncStatus"] =
    state === "PAUSED"
      ? "DISABLED"
      : state === "SERVICE_ERROR" || state === "DATA_DISCONNECTED"
        ? "ERROR"
        : state === "PLAN_ONLY" || state === "DATA_DELAYED"
          ? "PARTIAL"
          : "OK";
  const message =
    state === "PLAN_ONLY"
      ? "已有分析计划，但尚未取得可验证的实时参考价和最近检查时间。"
      : state === "DATA_DELAYED"
        ? "行情时间戳已超过允许延迟，暂不显示为运行正常。"
        : state === "WAITING_ENTRY"
          ? "行情与策略检查正常，当前等待入场条件。"
          : state === "SIMULATION_POSITION"
            ? "行情与策略检查正常，当前存在模拟持仓。"
            : state === "PAUSED"
              ? snapshot.runtime.pauseReason
                ? `AI交易执行已暂停：${snapshot.runtime.pauseReason}`
                : "AI交易公开台已暂停。"
              : state === "DATA_DISCONNECTED"
                ? "尚未连接到可用行情数据。"
                : snapshot.syncMessage || "服务检查异常。";

  return {
    ...snapshot,
    operationalState: state,
    operationalStateLabel: LABELS[state],
    quoteReady,
    latestQuoteAt,
    syncStatus,
    syncMessage: message,
  };
}
