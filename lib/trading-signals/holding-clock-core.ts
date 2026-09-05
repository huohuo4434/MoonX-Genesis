// Read-only classification of persisted clocks. Never rebase an existing position
// on the observation time or manufacture a deadline from a new forecast/profile.
export function inspectHoldingClock(input: {
  openedAt: string | null;
  maxHoldingUntil: string | null;
  nowMs: number;
}): { verified: boolean; deadlineReached: boolean; reason: string } {
  const opened = Date.parse(input.openedAt ?? "");
  const deadline = Date.parse(input.maxHoldingUntil ?? "");
  const validNow = Number.isFinite(input.nowMs) && Number.isFinite(new Date(input.nowMs).getTime());
  const validOpened = validNow && Number.isFinite(opened) && opened <= input.nowMs;
  const validDeadline = Number.isFinite(deadline);
  const verified = validOpened && validDeadline;
  return {
    verified,
    // An already persisted deadline remains enforceable even if openedAt is lost.
    deadlineReached: validNow && validDeadline && input.nowMs >= deadline,
    reason: verified ? "" : "开仓时间缺失、无效或位于未来，或冻结截止时间缺失、无效；暂停新增敞口并核查原始订单，不重置持仓计时。",
  };
}

export function isIntradayDayEndDue(input: {
  strategyType: string;
  openedAt: string | null;
  nowMs: number;
}): boolean {
  if (input.strategyType !== "INTRADAY") return false;
  const openedMs = Date.parse(input.openedAt ?? "");
  if (!Number.isFinite(openedMs) || !Number.isFinite(input.nowMs) || openedMs > input.nowMs) return false;
  const offset = 8 * 60 * 60_000;
  const opened = new Date(openedMs + offset);
  const current = new Date(input.nowMs + offset);
  if (!Number.isFinite(opened.getTime()) || !Number.isFinite(current.getTime())) return false;
  return opened.toISOString().slice(0, 10) !== current.toISOString().slice(0, 10)
    || (current.getUTCHours() === 23 && current.getUTCMinutes() >= 45);
}
