export const RUNTIME_FINALIZE_RESERVE_MS = 20_000;
export const MEMBER_DESK_MIN_REMAINING_MS = 30_000;

export type RuntimeDeadlinePolicy = {
  absoluteDeadlineMs: number;
  newEntryCutoffMs: number;
};

export function buildRuntimeDeadlinePolicy(absoluteDeadlineAt?: Date): RuntimeDeadlinePolicy {
  const absoluteDeadlineMs = absoluteDeadlineAt?.getTime() ?? Number.POSITIVE_INFINITY;
  return {
    absoluteDeadlineMs,
    newEntryCutoffMs: absoluteDeadlineMs - RUNTIME_FINALIZE_RESERVE_MS,
  };
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
