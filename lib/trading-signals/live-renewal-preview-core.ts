type RecordValue = Record<string, unknown>;
export type LiveRenewalPreviewInput = {
  experiment?: RecordValue | null;
  runtime?: RecordValue | null;
  today?: RecordValue | null;
  pendingExecutions?: unknown;
  failedExecutions?: unknown;
  dailyLossLimit?: unknown;
  drawdownLimit?: unknown;
};
function record(value: unknown): RecordValue {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};
}
function number(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string" && typeof value !== "bigint") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function date(value: unknown): number | null {
  if (!(value instanceof Date) && typeof value !== "string") return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}
function count(value: unknown): number | null {
  const parsed = number(value);
  return parsed !== null && Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}
const iso = (value: number | null) => value === null ? null : new Date(value).toISOString();
const amount = (value: number | null) => value === null ? "未取得" : `${value.toFixed(2)} USDT`;

export function buildLiveRenewalPreview(input: LiveRenewalPreviewInput, now = new Date()) {
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs)) throw new Error("INVALID_PREVIEW_TIME");
  const experiment = record(input.experiment);
  const runtime = record(input.runtime);
  const account = record(runtime.account_snapshot);
  const today = record(input.today);
  const start = date(experiment.started_at), end = date(experiment.ends_at);
  const checked = date(account.checkedAt), heartbeat = date(runtime.last_heartbeat_at);
  const fresh = (time: number | null) => time !== null && time <= nowMs && nowMs - time <= 180_000;
  const current = number(account.equityUsdt);
  const initial = number(experiment.initial_equity_usdt);
  const peak = number(experiment.peak_equity_usdt);
  const historicalDrawdown = number(experiment.max_drawdown_usdt);
  const opening = number(today.opening_equity_usdt);
  const validInitial = initial !== null && initial > 0;
  const validCurrent = current !== null && current >= 0;
  const validPeak = peak !== null && validInitial && peak >= initial;
  const beijingDay = new Date(nowMs + 8 * 60 * 60_000).toISOString().slice(0, 10);
  const dailyDate = date(today.trade_date);
  const dailyAvailable = dailyDate !== null && new Date(dailyDate).toISOString().slice(0, 10) === beijingDay && opening !== null && opening > 0;
  const currentFresh = account.connected === true && fresh(checked) && validCurrent;
  const checkedBeijingDay = checked === null ? null : new Date(checked + 8 * 60 * 60_000).toISOString().slice(0, 10);
  const dailyPnl = currentFresh && dailyAvailable && checkedBeijingDay === beijingDay ? current! - opening! : null;
  const drawdown = currentFresh && validPeak ? Math.max(peak!, current!) - current! : null;
  const dailyLimit = number(input.dailyLossLimit), drawdownLimit = number(input.drawdownLimit);
  const positions = count(account.positionsCount), protections = count(account.pendingStrategyOrdersCount);
  const pending = count(input.pendingExecutions), failed = count(input.failedExecutions);
  const checks: Array<{ key: string; label: string; state: "OK" | "BLOCKED" | "UNKNOWN"; detail: string }> = [];
  const add = (key: string, label: string, state: "OK" | "BLOCKED" | "UNKNOWN", detail: string) => checks.push({ key, label, state, detail });
  const expired = start !== null && end !== null && start < end && end <= nowMs;
  add("period", "原实验期限", expired && experiment.status === "COMPLETED" ? "OK" : "BLOCKED",
    expired && experiment.status === "COMPLETED" ? "记录为已结束且期限已过；仍需核查结束原因，这不代表已获准续期。" : "原实验状态或期限不满足结束复核条件，需先核查。");
  add("baseline", "历史风险基线", validInitial && validPeak && historicalDrawdown !== null && historicalDrawdown >= 0 ? "OK" : "UNKNOWN",
    `原始本金 ${amount(initial)}；历史最高权益 ${amount(peak)}；历史最大回撤 ${amount(historicalDrawdown)}。续期不得清零。`);
  add("account", "账户快照", currentFresh ? "OK" : "UNKNOWN", currentFresh ? `最近对账权益 ${amount(current)}；按原始本金计算累计盈亏 ${amount(validInitial ? current! - initial! : null)}。这是服务器快照，不是续期时的实时预检。` : "对账失败、字段缺失或快照超过3分钟，不能据此判断账户正常。");
  // Legacy snapshots may store zero after a protection-order read failure.
  // No independent read-success evidence exists, so zero is never an all-clear.
  add("positions", "持仓与保护单快照", currentFresh && positions !== null && protections !== null && positions + protections > 0 ? "BLOCKED" : "UNKNOWN",
    `快照记录：持仓 ${positions ?? "未知"}；保护单 ${protections ?? "未知"}。保护单缺少独立读取成功凭证，零值不代表已确认无单；普通挂单和触发单仍需即时核查。`);
  add("daily", "当日亏损检查", dailyPnl === null || dailyLimit === null || dailyLimit <= 0 ? "UNKNOWN" : dailyPnl <= -dailyLimit ? "BLOCKED" : "OK",
    `北京时间当日盈亏 ${amount(dailyPnl)}；日亏损限额 ${amount(dailyLimit)}。`);
  add("drawdown", "当前回撤检查", drawdown === null || drawdownLimit === null || drawdownLimit <= 0 ? "UNKNOWN" : drawdown >= drawdownLimit ? "BLOCKED" : "OK",
    `按保留的历史峰值计算回撤 ${amount(drawdown)}；限额 ${amount(drawdownLimit)}。`);
  const lease = date(runtime.run_lock_until);
  const leaseValid = runtime.run_lock_until === null || lease !== null;
  add("runtime", "服务器状态快照", !fresh(heartbeat) || typeof runtime.paused !== "boolean" || !leaseValid ? "UNKNOWN" : runtime.paused || (lease !== null && lease > nowMs) ? "BLOCKED" : "OK",
    "仅检查最近心跳、暂停状态和当前任务占用；尚不能排除旧任务迟到执行。");
  add("outbox", "待完成执行任务", pending === null ? "UNKNOWN" : pending > 0 ? "BLOCKED" : "OK", `待处理、处理中、待确认或可重试的任务：${pending ?? "未知"}。`);
  add("failed", "失败任务核查", failed === null || failed > 0 ? "UNKNOWN" : "OK", `失败记录 ${failed ?? "未知"} 条。历史失败不自动当作当前故障，也不能只凭数量认定结果已核清。`);
  add("exchange", "续期时的交易所即时核查", "UNKNOWN", "还需严格核对普通挂单、全部策略单、账户权限、允许合约、服务器时钟及未知订单结果。");
  add("renewal", "续期确认流程", "BLOCKED", "安全续期入口尚未开放：旧任务隔离和永久续期凭证需要完成后，才能由你确认。预检不改变实验期限或开关。");
  return {
    readOnly: true as const, writeAttempted: false as const, canRenew: false as const,
    generatedAt: now.toISOString(), accountCheckedAt: iso(checked), heartbeatAt: iso(heartbeat),
    originalStartedAt: iso(start), originalEndsAt: iso(end),
    proposedDurationDays: 30, proposedEndsAt: new Date(nowMs + 30 * 86_400_000).toISOString(),
    initialEquity: initial, currentEquity: current, peakEquity: peak, historicalMaxDrawdown: historicalDrawdown,
    cumulativePnl: currentFresh && validInitial ? current! - initial! : null,
    checks,
  };
}
export type LiveRenewalPreview = ReturnType<typeof buildLiveRenewalPreview>;
