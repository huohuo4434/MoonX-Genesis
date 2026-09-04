export type BitgetLiveDisplayRuntime = {
  paused: boolean;
  lastReport: Record<string, unknown> | null;
  recentEvents?: Array<{ action?: string; message?: string }>;
};

/** Read-only comparison of already validated coverage, not an execution gate. */
export function hasLiveHorizonConflict(horizons: ReadonlyArray<{ coverageState: string }>): boolean {
  return horizons.some((row) => row.coverageState === "LONG") &&
    horizons.some((row) => row.coverageState === "SHORT");
}

const UNIFIED_ENTRY_BLOCK = /ACCOUNT_NEW_ENTRIES_DISABLED|ENV_NEW_ENTRIES_DISABLED|RUNTIME_MODE_MANAGE_ONLY|RUNTIME_MODE_PAUSED|Unified Live新开仓闸门未通过/u;
const RUNTIME_ENTRY_BLOCK = /账户对账未通过|行情未通过3分钟新鲜度检查|禁止生成新入场与提交订单|服务器交易执行已暂停|实盘实验状态为.*本轮(?:没有|不扫描)新开仓/u;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

/**
 * The legacy Bitget experiment can remain ACTIVE while the unified custody
 * account is deliberately MANAGE_ONLY. The admin console must never translate
 * an active experiment into "new entries executable" when the authoritative
 * runner report says the unified entry gate is closed.
 */
export function isUnifiedNewEntryBlockedForDisplay(runtime: BitgetLiveDisplayRuntime): boolean {
  if (runtime.paused) return true;
  const report = runtime.lastReport;
  const market = asRecord(report?.market);
  const reconcile = asRecord(report?.reconcile);
  if (report?.paused === true || market?.ok === false || reconcile?.connected === false) return true;
  const reportMessage = typeof report?.message === "string" ? report.message : "";
  if (UNIFIED_ENTRY_BLOCK.test(reportMessage) || RUNTIME_ENTRY_BLOCK.test(reportMessage)) return true;
  return (runtime.recentEvents ?? []).slice(0, 5).some((event) =>
    event.action === "PAUSED_SKIP" && (UNIFIED_ENTRY_BLOCK.test(event.message ?? "") || RUNTIME_ENTRY_BLOCK.test(event.message ?? ""))
  );
}
