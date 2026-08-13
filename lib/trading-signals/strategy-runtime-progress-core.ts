export type ThreeHorizonProgressStage =
  | "ENGINE_START"
  | "MANAGEMENT_COMPLETE"
  | "PLAN_MAINTENANCE_COMPLETE"
  | "FORECAST_COMPLETE"
  | "RISK_ACCOUNT_COMPLETE"
  | "COMMISSIONING_COMPLETE"
  | "UNIVERSE_COMPLETE"
  | "PROFILE_COMPLETE";

export type ThreeHorizonProgress = {
  stage: ThreeHorizonProgressStage;
  elapsedMs: number;
  detail?: Record<string, unknown>;
};

export function createStrategyProgressReporter(input: {
  startedAtMs: number;
  now?: () => number;
  publish?: (progress: ThreeHorizonProgress) => Promise<void> | void;
}): (stage: ThreeHorizonProgressStage, detail?: Record<string, unknown>) => Promise<void> {
  const now = input.now ?? Date.now;
  return async (stage, detail) => {
    if (!input.publish) return;
    try {
      await input.publish({
        stage,
        elapsedMs: Math.max(0, now() - input.startedAtMs),
        ...(detail ? { detail } : {}),
      });
    } catch {
      // Telemetry is diagnostic only and must never authorize or block trading.
    }
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
