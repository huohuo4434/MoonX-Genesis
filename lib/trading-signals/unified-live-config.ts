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

export function readUnifiedLiveMode(value = process.env.MOOX_UNIFIED_LIVE_MODE): UnifiedLiveMode {
  const normalized = String(value ?? "MANAGE_ONLY").trim().toUpperCase();
  if (normalized === "LIVE" || normalized === "PAUSED") return normalized;
  return "MANAGE_ONLY";
}

export function readUnifiedLiveRuntimeConfig() {
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
    isolatedOnly: true as const,
    maxLeverage: 10 as const,
  };
}
