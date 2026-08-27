export function normalizeUnifiedLiveGateCodes(value: unknown): string {
  const codes = String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => /^[A-Z][A-Z0-9_]{2,79}$/.test(item));
  return [...new Set(codes)].slice(0, 12).join(",") || "UNIFIED_LIVE_GATE_BLOCKED";
}

export function resolveLockedCustodyGateCode(input: {
  migrationRequired: boolean;
  accountAvailable: boolean;
  audit: { snapshotAvailable: boolean; freezeNewEntries: boolean } | null;
}): string | null {
  if (input.migrationRequired) return "UNIFIED_LIVE_MIGRATION_REQUIRED";
  if (!input.accountAvailable || !input.audit) return "UNIFIED_LIVE_ACCOUNT_UNAVAILABLE";
  if (!input.audit.snapshotAvailable) return "CUSTODY_SNAPSHOT_UNAVAILABLE";
  if (input.audit.freezeNewEntries) return "CUSTODY_BLOCKER_PRESENT";
  return null;
}

export function resolveRuntimeExecutionState(input: {
  autoEntryAllowed: boolean;
  paused: boolean;
  locked: boolean;
}): "LIVE" | "MANAGE_ONLY" | "LOCKED_SKIP" {
  if (input.locked) return "LOCKED_SKIP";
  return input.autoEntryAllowed && !input.paused ? "LIVE" : "MANAGE_ONLY";
}

export function composeRuntimePauseMessage(input: {
  primaryReason: string;
  forcedManageOnly: boolean;
  forcedManageOnlyReason?: unknown;
}): string {
  if (!input.forcedManageOnly) return input.primaryReason;
  const codes = normalizeUnifiedLiveGateCodes(input.forcedManageOnlyReason);
  return `${input.primaryReason} Unified Live新开仓闸门未通过；本轮仅管理已有仓位。阻断码：${codes}`;
}
