export type BitgetLiveDisplayRuntime = {
  paused: boolean;
  lastReport: Record<string, unknown> | null;
  recentEvents?: Array<{ action?: string; message?: string }>;
};

const UNIFIED_ENTRY_BLOCK = /ACCOUNT_NEW_ENTRIES_DISABLED|RUNTIME_MODE_MANAGE_ONLY|Unified Live新开仓闸门未通过|本轮禁止新开仓/u;

/**
 * The legacy Bitget experiment can remain ACTIVE while the unified custody
 * account is deliberately MANAGE_ONLY. The admin console must never translate
 * an active experiment into "new entries executable" when the authoritative
 * runner report says the unified entry gate is closed.
 */
export function isUnifiedNewEntryBlockedForDisplay(runtime: BitgetLiveDisplayRuntime): boolean {
  if (runtime.paused) return true;
  const reportMessage = typeof runtime.lastReport?.message === "string" ? runtime.lastReport.message : "";
  if (UNIFIED_ENTRY_BLOCK.test(reportMessage)) return true;
  return (runtime.recentEvents ?? []).slice(0, 5).some((event) =>
    event.action === "PAUSED_SKIP" && UNIFIED_ENTRY_BLOCK.test(event.message ?? "")
  );
}

