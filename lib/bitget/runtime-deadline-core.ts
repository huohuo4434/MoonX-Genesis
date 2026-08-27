export const RUNTIME_FINALIZE_RESERVE_MS = 20_000;
export const MEMBER_DESK_MIN_REMAINING_MS = 30_000;
export const DEFAULT_RUNTIME_LEASE_SECONDS = 330;
export const RUNTIME_LEASE_GRACE_SECONDS = 30;
export const MIN_RUNTIME_LEASE_SECONDS = 30;

export type RuntimeDeadlinePolicy = {
  absoluteDeadlineMs: number;
  newEntryCutoffMs: number;
};

export type RuntimeExecutionControl = {
  paused: boolean;
  pauseReason: string;
};

export type RuntimeStartupSafetyPolicy = {
  controlKnown: boolean;
  allowExperimentStart: boolean;
  allowNewEntries: boolean;
  allowManageOnly: boolean;
  allowRiskReducingExit: true;
};

export function shouldPrefetchLiveExecutionCounts(input: {
  liveExperimentMode: boolean;
  forcedManageOnly: boolean;
  policy: RuntimeStartupSafetyPolicy;
}): boolean {
  return input.liveExperimentMode &&
    !input.forcedManageOnly &&
    input.policy.controlKnown &&
    input.policy.allowNewEntries;
}

export async function readAuthoritativeRuntimeExecutionControl(
  readRows: () => Promise<ReadonlyArray<{ paused: boolean; pause_reason: string | null }>>
): Promise<RuntimeExecutionControl> {
  const row = (await readRows())[0];
  if (!row) throw new Error("RUNTIME_EXECUTION_CONTROL_NOT_FOUND");
  if (typeof row.paused !== "boolean") throw new Error("RUNTIME_EXECUTION_CONTROL_INVALID_PAUSED");
  return {
    paused: row.paused,
    pauseReason: String(row.pause_reason ?? ""),
  };
}

export async function runRuntimeStartupSafetySequence<TLiveStatus, TRiskExit>(input: {
  readControl: () => Promise<RuntimeExecutionControl>;
  onControlResolved?: (result: {
    control: RuntimeExecutionControl;
    controlError: Error | null;
    policy: RuntimeStartupSafetyPolicy;
  }) => Promise<void> | void;
  syncLiveStatus?: (options: { allowStart: boolean }) => Promise<TLiveStatus>;
  onLiveStatus?: (status: TLiveStatus) => Promise<void> | void;
  closeRiskExposure?: (status: TLiveStatus) => Promise<TRiskExit>;
}): Promise<{
  control: RuntimeExecutionControl;
  controlError: Error | null;
  policy: RuntimeStartupSafetyPolicy;
  liveStatus: TLiveStatus | null;
  riskExit: TRiskExit | null;
}> {
  let control: RuntimeExecutionControl;
  let controlError: Error | null = null;
  try {
    control = await input.readControl();
  } catch (error) {
    controlError = error instanceof Error ? error : new Error("Runtime execution control read failed");
    control = { paused: true, pauseReason: controlError.message };
  }
  const policy: RuntimeStartupSafetyPolicy = {
    controlKnown: controlError == null,
    allowExperimentStart: controlError == null && !control.paused,
    allowNewEntries: controlError == null && !control.paused,
    allowManageOnly: controlError == null,
    allowRiskReducingExit: true,
  };
  await input.onControlResolved?.({ control, controlError, policy });
  const liveStatus = input.syncLiveStatus
    ? await input.syncLiveStatus({ allowStart: policy.allowExperimentStart })
    : null;
  if (liveStatus != null) await input.onLiveStatus?.(liveStatus);
  const riskExit = liveStatus != null && input.closeRiskExposure
    ? await input.closeRiskExposure(liveStatus)
    : null;
  return { control, controlError, policy, liveStatus, riskExit };
}

export function buildRuntimeDeadlinePolicy(absoluteDeadlineAt?: Date): RuntimeDeadlinePolicy {
  const absoluteDeadlineMs = absoluteDeadlineAt?.getTime() ?? Number.POSITIVE_INFINITY;
  return {
    absoluteDeadlineMs,
    newEntryCutoffMs: absoluteDeadlineMs - RUNTIME_FINALIZE_RESERVE_MS,
  };
}

/**
 * Keep the owner fence slightly longer than the server route, without leaving a
 * five-minute stale lock behind when a shorter serverless invocation is killed.
 */
export function resolveRuntimeLeaseSeconds(
  absoluteDeadlineAt?: Date,
  nowMs = Date.now()
): number {
  const deadlineMs = absoluteDeadlineAt?.getTime();
  if (deadlineMs == null || !Number.isFinite(deadlineMs)) return DEFAULT_RUNTIME_LEASE_SECONDS;
  const remainingSeconds = Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
  return Math.max(
    MIN_RUNTIME_LEASE_SECONDS,
    Math.min(DEFAULT_RUNTIME_LEASE_SECONDS, remainingSeconds + RUNTIME_LEASE_GRACE_SECONDS)
  );
}

export function canStartNewEntry(policy: RuntimeDeadlinePolicy, nowMs = Date.now()): boolean {
  return nowMs < policy.newEntryCutoffMs;
}

export function canStartMemberDeskSync(absoluteDeadlineMs: number, nowMs = Date.now()): boolean {
  return absoluteDeadlineMs - nowMs >= MEMBER_DESK_MIN_REMAINING_MS;
}

/** A started idempotent order lifecycle is awaited naturally; no timeout race. */
export async function runNewEntryBeforeCutoff<T>(input: {
  cutoffMs: number;
  now: () => number;
  run: () => Promise<T>;
}): Promise<{ started: false } | { started: true; value: T }> {
  if (input.now() >= input.cutoffMs) return { started: false };
  return { started: true, value: await input.run() };
}

export async function releaseOwnerOrThrow(release: () => Promise<boolean>): Promise<void> {
  const released = await release();
  if (!released) throw new Error("RUNTIME_OWNER_RELEASE_NOT_CONFIRMED");
}

/** Persist state and FINISH before releasing the owner. Cleanup is optional. */
export async function finalizeRuntimeOwner(input: {
  allowCleanup: boolean;
  persistState: () => Promise<void>;
  persistFinish: () => Promise<void>;
  cleanup: () => Promise<void>;
  releaseOwner: () => Promise<void>;
  onFinalizeErrorBeforeRelease?: (error: unknown) => Promise<void>;
  onFinalizationPersisted?: () => void;
}): Promise<{ cleanupRan: boolean; finalizationPersisted: boolean }> {
  let cleanupRan = false;
  let finalizationPersisted = false;
  try {
    try {
      await input.persistState();
      await input.persistFinish();
      finalizationPersisted = true;
      input.onFinalizationPersisted?.();
    } catch (error) {
      await input.onFinalizeErrorBeforeRelease?.(error);
      throw error;
    }
    if (input.allowCleanup) {
      try {
        await input.cleanup();
        cleanupRan = true;
      } catch {
        // Retention cleanup is noncritical and must never reopen a completed
        // runtime after FINISH or after the owner has been released.
      }
    }
    return { cleanupRan, finalizationPersisted };
  } finally {
    await input.releaseOwner();
  }
}
