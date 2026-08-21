import type { UnifiedLiveHorizon, UnifiedLiveMode } from "@/types/unified-live-trading";

export const UNIFIED_LIVE_HORIZON_LIMITS: Record<UnifiedLiveHorizon, number> = {
  SHORT: 8 * 60,
  MEDIUM: 7 * 24 * 60,
  LONG: 28 * 24 * 60,
};

function envBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value.trim() === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export const MOOX_TRADING_CONTROL_MODE_ENV = "MOOX_TRADING_CONTROL_MODE";

export function readAuthoritativeTradingControlMode(
  value = process.env[MOOX_TRADING_CONTROL_MODE_ENV],
): { configured: boolean; mode: UnifiedLiveMode } {
  if (value == null || value.trim() === "") return { configured: false, mode: "MANAGE_ONLY" };
  const normalized = value.trim().toUpperCase();
  if (normalized === "LIVE" || normalized === "MANAGE_ONLY" || normalized === "PAUSED") {
    return { configured: true, mode: normalized };
  }
  // A typo in the single authoritative switch must fail closed.
  return { configured: true, mode: "PAUSED" };
}

export function readUnifiedLiveMode(value = process.env.MOOX_UNIFIED_LIVE_MODE): UnifiedLiveMode {
  const normalized = String(value ?? "MANAGE_ONLY").trim().toUpperCase();
  if (normalized === "LIVE" || normalized === "PAUSED") return normalized;
  return "MANAGE_ONLY";
}

export function readUnifiedLiveRuntimeConfig() {
  const authoritative = readAuthoritativeTradingControlMode();
  if (authoritative.configured) {
    return {
      mode: authoritative.mode,
      allowLiveSwitch: authoritative.mode === "LIVE",
      allowNewEntriesByEnv: authoritative.mode === "LIVE",
      positionManagementEnabled: authoritative.mode !== "PAUSED",
      controlSource: "MOOX_TRADING_CONTROL_MODE" as const,
      isolatedOnly: true as const,
      maxLeverage: 10 as const,
    };
  }
  const mode = readUnifiedLiveMode();
  const allowLiveSwitch = envBoolean(process.env.MOOX_UNIFIED_LIVE_ALLOW_LIVE_SWITCH, false);
  const allowNewEntriesByEnv = envBoolean(process.env.MOOX_UNIFIED_LIVE_NEW_ENTRIES, false);
  const positionManagementEnabled = envBoolean(
    process.env.MOOX_UNIFIED_LIVE_POSITION_MANAGEMENT,
    true,
  );
  return {
    mode,
    allowLiveSwitch,
    allowNewEntriesByEnv,
    positionManagementEnabled,
    controlSource: "LEGACY_ENV_COMPATIBILITY" as const,
    isolatedOnly: true as const,
    maxLeverage: 10 as const,
  };
}

export function isUnifiedLiveActiveExecutionEnabled(): boolean {
  const authoritative = readAuthoritativeTradingControlMode();
  return authoritative.configured
    ? authoritative.mode === "LIVE"
    : process.env.MOOX_LIVE_ACTIVE_EXECUTION_V641?.toLowerCase() !== "false";
}
