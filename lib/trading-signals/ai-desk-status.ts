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
  LIVE_POSITION: "实盘持仓中",
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
  // A plan check is not proof of a fresh exchange quote. Runtime market time is the only source.
  const latestQuoteAt = snapshot.latestQuoteAt ?? null;
  const runtimeQuoteCheck = timeMs(latestQuoteAt);
  // Persisted runtime ages describe the instant when the snapshot was generated. Advance
  // them by wall-clock time when an older snapshot is read so frozen ages can never make
  // historical data look live.
  const generatedAtMs = timeMs(snapshot.generatedAt);
  const elapsedSinceSnapshot = generatedAtMs == null
    ? 0
    : Math.max(0, now.getTime() - generatedAtMs);
  const quoteAge = snapshot.runtime.quoteAgeSeconds != null
    ? Math.max(0, snapshot.runtime.quoteAgeSeconds * 1000) + elapsedSinceSnapshot
    : ageMs(latestQuoteAt, now);
  const heartbeatAge = snapshot.runtime.heartbeatAgeSeconds != null
    ? Math.max(0, snapshot.runtime.heartbeatAgeSeconds * 1000) + elapsedSinceSnapshot
    : ageMs(snapshot.runtime.lastHeartbeatAt, now);
  const heartbeatStale = heartbeatAge == null || heartbeatAge > AI_DESK_HEARTBEAT_STALE_MS;
  const quoteMissing = runtimeQuoteCheck == null;
  const quoteStale = !quoteMissing && (quoteAge == null || quoteAge > AI_DESK_QUOTE_STALE_MS);
  const quoteReady = !quoteMissing && !quoteStale;
  const executionConfigured = snapshot.executionConfigured ?? snapshot.executionAllowed;

  if (snapshot.mode === "BITGET_LIVE_EXPERIMENT") {
    const experimentStatus = snapshot.experiment.status;
    let state: AiTradingDeskOperationalState;
    let label: string;
    let message: string;
    if (experimentStatus === "COMPLETED") {
      state = "PAUSED";
      label = "实验已结束";
      message = snapshot.experiment.stopReason || "30天实盘实验已结束。";
    } else if (experimentStatus === "STOPPED") {
      state = "PAUSED";
      label = "止损停止";
      message = snapshot.experiment.stopReason || "实盘实验已按风控停止。";
    } else if (experimentStatus === "NOT_STARTED" || experimentStatus === "DISABLED") {
      state = "PAUSED";
      label = "待启动";
      message = snapshot.syncMessage || "等待完成实盘环境配置和安全检查。";
    } else if (snapshot.runtime.paused) {
      state = "PAUSED";
      label = "执行已暂停";
      message = snapshot.runtime.pauseReason || "服务器执行已暂停。";
    } else if (heartbeatStale || snapshot.syncStatus === "ERROR") {
      state = "SERVICE_ERROR";
      label = "服务异常";
      message = `服务器心跳异常${delayMinutes(heartbeatAge) == null ? "" : `（约${delayMinutes(heartbeatAge)}分钟未更新）`}，实盘禁止新开仓。`;
    } else if (quoteMissing) {
      state = "DATA_DISCONNECTED";
      label = "行情未连接";
      message = "尚未取得可验证的Bitget行情，实盘禁止新开仓。";
    } else if (quoteStale) {
      state = "DATA_DELAYED";
      label = "行情延迟，禁止开仓";
      message = `行情数据已延迟${delayMinutes(quoteAge) == null ? "" : `约${delayMinutes(quoteAge)}分钟`}，实盘禁止新开仓；恢复后会重新验证全部条件。`;
    } else if (snapshot.positions.length) {
      state = "LIVE_POSITION";
      label = "实盘持仓中";
      message = "实盘账户、行情和持仓对账正常。";
    } else {
      state = "WAITING_ENTRY";
      label = "等待交易机会";
      message = "实盘实验运行正常，当前没有持仓。";
    }
    const executionAllowed = Boolean(
      executionConfigured &&
      experimentStatus === "ACTIVE" &&
      quoteReady &&
      !heartbeatStale &&
      !snapshot.runtime.paused &&
      snapshot.strategyEnabled
    );
    return {
      ...snapshot,
      executionConfigured,
      executionAllowed,
      operationalState: state,
      operationalStateLabel: label,
      quoteReady,
      latestQuoteAt,
      syncStatus: state === "SERVICE_ERROR" || state === "DATA_DISCONNECTED"
        ? "ERROR"
        : state === "DATA_DELAYED"
          ? "PARTIAL"
          : state === "PAUSED"
            ? "DISABLED"
            : "OK",
      syncMessage: message,
    };
  }

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
  const message =
    state === "PLAN_ONLY"
      ? "行情连接正常，但当前只有研究观察，尚无达到公开执行条件的可验证计划。"
      : state === "DATA_DELAYED"
        ? `行情数据已延迟${delayMinutes(quoteAge) == null ? "" : `约${delayMinutes(quoteAge)}分钟`}，模拟执行已自动暂停；恢复后会重新验证全部条件。`
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
                : `服务器心跳异常${delayMinutes(heartbeatAge) == null ? "" : `（约${delayMinutes(heartbeatAge)}分钟未更新）`}，模拟执行已自动暂停。`;

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

export function markAiDeskSnapshotReadOnly(
  snapshot: AiTradingDeskSnapshot,
  message: string,
  now = new Date()
): AiTradingDeskSnapshot {
  const evaluated = applyAiDeskOperationalState(snapshot, now);
  return {
    ...evaluated,
    executionAllowed: false,
    serverHealthy: false,
    quoteReady: false,
    operationalState: "SERVICE_ERROR",
    operationalStateLabel: "只读历史快照",
    syncStatus: "ERROR",
    syncMessage: message,
  };
}
