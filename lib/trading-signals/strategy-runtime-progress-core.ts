export type ThreeHorizonProgressStage =
  | "ENGINE_START"
  | "SCHEMA_COMPLETE"
  | "MANAGEMENT_COMPLETE"
  | "PLAN_MAINTENANCE_COMPLETE"
  | "SETTINGS_PROFILES_COMPLETE"
  | "FORECAST_COMPLETE"
  | "RISK_ACCOUNT_COMPLETE"
  | "COMMISSIONING_COMPLETE"
  | "UNIVERSE_COMPLETE"
  | "PROFILE_DATA_COMPLETE"
  | "PROFILE_PLAN_COMPLETE"
  | "PROFILE_COMPLETE";

export type ThreeHorizonProgress = {
  stage: ThreeHorizonProgressStage;
  elapsedMs: number;
  detail?: Record<string, unknown>;
};

export function captureWallClockRunTiming(input: {
  businessNow: Date;
  wallNow?: () => number;
}) {
  const wallNow = input.wallNow ?? Date.now;
  const startedAtMs = wallNow();
  let lastElapsedMs = 0;
  const elapsedMs = () => {
    lastElapsedMs = Math.max(lastElapsedMs, Math.max(0, wallNow() - startedAtMs));
    return lastElapsedMs;
  };
  return {
    // The business timestamp remains a separate immutable value for forecast,
    // idempotency and trading decisions. It never participates in elapsed time.
    businessNow: input.businessNow,
    startedAtMs,
    startedAt: new Date(startedAtMs).toISOString(),
    elapsedMs,
    finish() {
      const durationMs = elapsedMs();
      const finishedAtMs = startedAtMs + durationMs;
      return {
        finishedAtMs,
        finishedAt: new Date(finishedAtMs).toISOString(),
        durationMs,
      };
    },
  };
}

export function createStrategyProgressReporter(input: {
  startedAtMs: number;
  now?: () => number;
  elapsedMs?: () => number;
  publish?: (progress: ThreeHorizonProgress) => Promise<void> | void;
}): (stage: ThreeHorizonProgressStage, detail?: Record<string, unknown>) => Promise<void> {
  const now = input.now ?? Date.now;
  let lastElapsedMs = 0;
  return async (stage, detail) => {
    if (!input.publish) return;
    try {
      await input.publish({
        stage,
        elapsedMs: input.elapsedMs
          ? input.elapsedMs()
          : (lastElapsedMs = Math.max(lastElapsedMs, Math.max(0, now() - input.startedAtMs))),
        ...(detail ? { detail } : {}),
      });
    } catch {
      // Telemetry is diagnostic only and must never authorize or block trading.
    }
  };
}

export function resolveRuntimeEngineFailureGate(input: {
  engineFailure: boolean;
  engineOk: boolean | null | undefined;
}) {
  const failed = input.engineFailure || input.engineOk === false;
  return {
    failed,
    allowPostEngineOrders: !failed,
    runtimeOk: !failed,
  };
}

export async function runBoundedSerialMaintenance<T>(input: {
  rows: readonly T[];
  maxRows: number;
  maintain: (row: T) => Promise<void>;
}): Promise<number> {
  const limit = Math.max(0, Math.floor(input.maxRows));
  let completed = 0;
  for (const row of input.rows.slice(0, limit)) {
    await input.maintain(row);
    completed += 1;
  }
  return completed;
}
