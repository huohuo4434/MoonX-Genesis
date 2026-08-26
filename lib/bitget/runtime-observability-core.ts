export function normalizeUnifiedLiveGateCodes(value: unknown): string {
  const codes = String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => /^[A-Z][A-Z0-9_]{2,79}$/.test(item));
  return [...new Set(codes)].slice(0, 12).join(",") || "UNIFIED_LIVE_GATE_BLOCKED";
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
