import type {
  AiTradingDeskOperationalState,
  AiTradingDeskSnapshot,
} from "@/types/ai-trading-desk";

/** Public desk and execution safety use the same three-minute freshness gate. */
export const AI_DESK_QUOTE_STALE_MS = 3 * 60_000;
export const AI_DESK_HEARTBEAT_STALE_MS = 3 * 60_000;

const LABELS: Record<AiTradingDeskOperationalState, string> = {
  DATA_DISCONNECTED: "数据未连接",
  CONNECTING: "正在连接",
  DATA_DELAYED: "行情延迟，执行暂停",
  PLAN_ONLY: "仅生成研究计划",
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

function ageMs(value: string | null | undefined, now: Date): number | null {
  const parsed = timeMs(value);
  return parsed == null ? null : Math.max(0, now.getTime() - parsed);
}

function delayMinutes(milliseconds: number | null): number | null {
  return milliseconds == null ? null : Math.max(0, Math.floor(milliseconds / 60_000));
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
  // Market freshness must come from the runtime market timestamp. A newly checked
  // plan is not proof that a fresh exchange quote was received.
  const latestQuoteAt = snapshot.latestQuoteAt ?? null;
  const quoteAge = snapshot.runtime.quoteAgeSeconds != null
    ? Math.max(0, snapshot.runtime.quoteAgeSeconds * 1000)
    : ageMs(latestQuoteAt, now);
  const heartbeatAge = snapshot.runtime.heartbeatAgeSeconds != null
    ? Math.max(0, snapshot.runtime.heartbeatAgeSeconds * 1000)
    : ageMs(snapshot.runtime.lastHeartbeatAt, now);
  const heartbeatStale = heartbeatAge == null || heartbeatAge > AI_DESK_HEARTBEAT_STALE_MS;
  const quoteMissing = timeMs(latestQuoteAt) == null;
  const quoteStale = !quoteMissing && (quoteAge == null || quoteAge > AI_DESK_QUOTE_STALE_MS);
  const hasReferencePrice = snapshot.plans.some(
    (plan) => plan.currentPrice != null && Number.isFinite(plan.currentPrice)
  );

  let state: AiTradingDeskOperationalState;
  if (!snapshot.settings.enabled || snapshot.runtime.paused) state = "PAUSED";
  else if (!snapshot.strategyEnabled) state = "PAUSED";
  else if (heartbeatStale) state = "SERVICE_ERROR";
  else if (quoteMissing) state = "DATA_DISCONNECTED";
  else if (quoteStale) state = "DATA_DELAYED";
  else if (!snapshot.plans.length || !hasReferencePrice) state = "PLAN_ONLY";
  else if (snapshot.positions.length) state = "SIMULATION_POSITION";
  else state = "WAITING_ENTRY";

  const quoteReady = !quoteMissing && !quoteStale;
  const executionConfigured = snapshot.executionConfigured ?? snapshot.executionAllowed;
  const executionAllowed = Boolean(
    executionConfigured &&
    quoteReady &&
    !heartbeatStale &&
    !snapshot.runtime.paused &&
    snapshot.strategyEnabled
  );
  const syncStatus: AiTradingDeskSnapshot["syncStatus"] =
    state === "PAUSED"
      ? "DISABLED"
      : state === "SERVICE_ERROR" || state === "DATA_DISCONNECTED"
        ? "ERROR"
        : state === "PLAN_ONLY" || state === "DATA_DELAYED"
          ? "PARTIAL"
          : "OK";

  const quoteDelay = delayMinutes(quoteAge);
  const heartbeatDelay = delayMinutes(heartbeatAge);
  const message =
    state === "PLAN_ONLY"
      ? "行情连接正常，但当前只有研究观察，尚无达到公开执行条件的可验证计划。"
      : state === "DATA_DELAYED"
        ? `行情数据已延迟${quoteDelay == null ? "" : `约${quoteDelay}分钟`}，模拟执行已自动暂停；恢复后会重新验证价格、入场区间与全部触发条件。`
        : state === "WAITING_ENTRY"
          ? "行情与策略检查正常，当前等待入场条件。"
          : state === "SIMULATION_POSITION"
            ? "行情与策略检查正常，当前存在模拟持仓。"
            : state === "PAUSED"
              ? snapshot.runtime.pauseReason
                ? `AI策略执行已暂停：${snapshot.runtime.pauseReason}`
                : "AI策略公开台已暂停。"
              : state === "DATA_DISCONNECTED"
                ? "尚未取得可验证的Bitget行情，模拟执行已自动暂停。"
                : `服务器心跳异常${heartbeatDelay == null ? "" : `（约${heartbeatDelay}分钟未更新）`}，模拟执行已自动暂停。`;

  return {
    ...snapshot,
    executionConfigured,
    executionAllowed,
    operationalState: state,
    operationalStateLabel: LABELS[state],
    quoteReady,
    latestQuoteAt,
    syncStatus,
    syncMessage: message,
  };
}
