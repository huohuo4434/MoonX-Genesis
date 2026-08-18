import { readUnifiedLiveRuntimeConfig } from "@/lib/trading-signals/unified-live-config";
import { getUnifiedLiveRuntimeStatus } from "@/lib/trading-signals/unified-live-runtime";

export async function evaluateUnifiedLiveNewEntryGate(ownerKey = "official") {
  const runtime = readUnifiedLiveRuntimeConfig();
  const status = await getUnifiedLiveRuntimeStatus(ownerKey);
  const reasons: string[] = [];
  if (status.migrationRequired) reasons.push("UNIFIED_LIVE_MIGRATION_REQUIRED");
  if (!status.account) reasons.push("UNIFIED_LIVE_ACCOUNT_UNAVAILABLE");
  if (runtime.mode !== "LIVE") reasons.push(`RUNTIME_MODE_${runtime.mode}`);
  if (!runtime.allowNewEntriesByEnv) reasons.push("ENV_NEW_ENTRIES_DISABLED");
  if (!status.account?.newEntriesEnabled) reasons.push("ACCOUNT_NEW_ENTRIES_DISABLED");
  if (!status.account?.positionManagementEnabled) reasons.push("POSITION_MANAGEMENT_DISABLED");
  if (status.audit?.freezeNewEntries) reasons.push("CUSTODY_BLOCKER_PRESENT");
  return {
    allowed: reasons.length === 0,
    reasons,
    mode: status.account?.mode ?? runtime.mode,
    positionManagementContinues: runtime.positionManagementEnabled,
  };
}
