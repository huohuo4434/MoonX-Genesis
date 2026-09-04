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
  return parsed == null || parsed > now.getTime() + 60_000 ? null : Math.max(0, now.getTime() - parsed);
}

function delayMinutes(milliseconds: number | null): number | null {
  return milliseconds == null ? null : Math.max(0, Math.floor(milliseconds / 60_000));
}

function memberSafeAuditText(value: string | null | undefined, fallback: string): string {
  const text = String(value ?? "").trim();
  return /clientOid|orderId|订单.{0,4}[A-Za-z0-9_-]{6,}/iu.test(text) ? fallback : text || fallback;
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
  now = new Date()
): AiTradingDeskSnapshot {
  // Apply publication settings at every read, including retained snapshots created
  // before a setting changed. Internal order IDs, sizes and audit rows are not member data.
  const { enabled, showAbsolutePnl, showCurrentPositions, showTradeHistory } = snapshot.settings;
  const showAmounts = enabled && showAbsolutePnl;
  snapshot = {
    ...snapshot,
    strategies: [],
    positions: enabled && showCurrentPositions ? snapshot.positions.map((row) => ({
      ...row, unrealisedPnlUsdt: showAmounts ? row.unrealisedPnlUsdt : null,
    })) : [],
    recentTrades: enabled && showTradeHistory ? snapshot.recentTrades.map((row) => ({
      ...row, netProfitUsdt: showAmounts ? row.netProfitUsdt : null,
    })) : [],
    intentDecisions: enabled ? (snapshot.intentDecisions ?? []).map((decision) => ({ ...decision,
      rejectionReason: memberSafeAuditText(decision.rejectionReason, "当前条件未通过，等待重新检查。"),
    })) : [],
    plans: enabled ? (snapshot.plans ?? []).map((plan) => ({ ...plan,
      actionText: memberSafeAuditText(plan.actionText, "本轮计划已结束，等待下一版本。"),
    })) : [],
    publishedPlans: enabled ? (snapshot.publishedPlans ?? []).map((plan) => ({
      ...plan, bitgetOrderId: null, clientOid: null, sourceDecisionId: null,
      closeReason: plan.closeReason ? memberSafeAuditText(plan.closeReason, "本轮计划已结束。") : null,
      events: plan.events.map((event) => ({ ...event, bitgetOrderId: null, clientOid: null,
        quantity: null, detail: "" })),
    })) : [],
    experiment: snapshot.experiment ? {
      ...snapshot.experiment, initialEquityUsdt: null, currentEquityUsdt: null,
      pnlUsdt: showAmounts ? snapshot.experiment.pnlUsdt : null,
      dailyPnlUsdt: showAmounts ? snapshot.experiment.dailyPnlUsdt : null,
      maxDrawdownUsdt: showAmounts ? snapshot.experiment.maxDrawdownUsdt : null,
      dailyHistory: showAmounts && showTradeHistory ? snapshot.experiment.dailyHistory.map((row) => ({
        ...row, openingEquityUsdt: null, closingEquityUsdt: null,
      })) : [],
      stopReason: "", securityMessage: "账户总资产、订单标识与真实持仓数量不对会员公开。",
    } : snapshot.experiment,
    stats: { ...snapshot.stats, netProfitUsdt: showAmounts ? snapshot.stats.netProfitUsdt : null },
  };
  if (!snapshot.settings.enabled) {
    return { ...snapshot, executionAllowed: false, operationalState: "PAUSED",
      operationalStateLabel: "会员展示已关闭", syncStatus: "DISABLED",
      syncMessage: "管理员已关闭会员交易台展示；不代表修改了服务器交易状态。",
      serverHealthy: false, strategyEnabled: false, mirrorEnabled: false, executionConfigured: false,
      quoteReady: false, latestQuoteAt: null,
      experiment: { status: "DISABLED", startedAt: null, endsAt: null, initialEquityUsdt: null,
        currentEquityUsdt: null, pnlUsdt: null, pnlPct: null, maxDrawdownUsdt: null,
        maxDrawdownPct: null, dailyPnlUsdt: null, dailyPnlPct: null, dailyHistory: [], stopReason: "", securityMessage: "" },
      stats: { closedTrades: 0, wins: 0, losses: 0, winRatePct: null, averageReturnPct: null,
        bestReturnPct: null, worstReturnPct: null, tradeCurveMaxDrawdownPct: null, netProfitUsdt: null },
      planSummary: { publishedToday: 0, watching: 0, armed: 0, submittedOrOpen: 0, closedToday: 0 },
      runtime: { paused: false, pauseReason: "", lastHeartbeatAt: null, lastStrategyAt: null,
        lastReconcileAt: null, heartbeatAgeSeconds: null, quoteAgeSeconds: null,
        decisionStatsToday: { scanRuns: 0, symbolsEvaluated: 0, confidenceBlocked: 0, alignmentBlocked: 0,
          triggerWaiting: 0, riskBlocked: 0, marketErrors: 0, orderAttempts: 0, executed: 0 } },
      positions: [], recentTrades: [], plans: [], publishedPlans: [], strategies: [], intentDecisions: [], marketQuotes: [] };
  }
  const snapshotAge = ageMs(snapshot.lastSyncedAt, now);
  if (snapshotAge == null || snapshotAge > AI_DESK_HEARTBEAT_STALE_MS || !snapshot.serverHealthy
    || snapshot.syncStatus === "ERROR" || snapshot.syncStatus === "PARTIAL") {
    return { ...snapshot, executionAllowed: false, serverHealthy: false, quoteReady: false,
      operationalState: "SERVICE_ERROR", operationalStateLabel: "同步待核验",
      syncStatus: snapshot.syncStatus === "ERROR" ? "ERROR" : "PARTIAL",
      syncMessage: snapshot.syncStatus === "ERROR" || snapshot.syncStatus === "PARTIAL"
        ? snapshot.syncMessage || "本轮数据读取未完成；旧快照不能代表当前账户状态。"
        : !snapshot.serverHealthy ? "服务器状态待重新核验；不会把旧快照标为当前健康状态。"
          : "会员快照已过期或尚未同步；旧快照不能代表当前账户状态。" };
  }
  // A plan check is not proof of a fresh exchange quote. Runtime market time is the only source.
  const latestQuoteAt = snapshot.latestQuoteAt ?? null;
  const runtimeQuoteCheck = timeMs(latestQuoteAt);
  const quoteAge = ageMs(latestQuoteAt, now);
  const heartbeatAge = ageMs(snapshot.runtime.lastHeartbeatAt, now);
  const heartbeatStale = heartbeatAge == null || heartbeatAge > AI_DESK_HEARTBEAT_STALE_MS;
  const quoteMissing = runtimeQuoteCheck == null;
  const quoteStale = !quoteMissing && (quoteAge == null || quoteAge > AI_DESK_QUOTE_STALE_MS);
  const quoteReady = !quoteMissing && !quoteStale;
  const executionConfigured = snapshot.executionConfigured ?? snapshot.executionAllowed;

  if (snapshot.mode === "BITGET_LIVE_EXPERIMENT") {
    const endsAt = timeMs(snapshot.experiment.endsAt);
    const experimentStatus = snapshot.experiment.status === "ACTIVE" && endsAt != null && now.getTime() >= endsAt
      ? "COMPLETED" : snapshot.experiment.status;
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
    } else if (heartbeatStale) {
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
    } else if (!snapshot.executionAllowed) {
      state = "PAUSED";
      label = "仅观察与持仓管理";
      message = "当前未确认新开仓权限；继续观察及管理已有持仓。";
    } else {
      state = "WAITING_ENTRY";
      label = "等待交易机会";
      message = "实盘实验运行正常，当前没有持仓。";
    }
    const executionAllowed = Boolean(
      executionConfigured &&
      snapshot.executionAllowed && snapshot.serverHealthy &&
      experimentStatus === "ACTIVE" &&
      endsAt != null && now.getTime() < endsAt &&
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
      serverHealthy: snapshot.serverHealthy && !heartbeatStale && quoteReady,
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
    snapshot.executionAllowed && snapshot.serverHealthy &&
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
