export const LESSON_AUTOMATION_MAX_ATTEMPTS = 3;

const RETRY_DELAYS_MS = [2 * 60 * 60 * 1_000, 6 * 60 * 60 * 1_000] as const;

export type LessonAutomationRetryState = {
  automationAttemptCount?: number | null;
  automationNextRetryAt?: string | null;
};

export function registerLessonAutomationFailure(
  current: LessonAutomationRetryState,
  nowMs = Date.now(),
): { attemptCount: number; nextRetryAt: string | null; exhausted: boolean } {
  const attemptCount = Math.max(0, Math.trunc(current.automationAttemptCount ?? 0)) + 1;
  const exhausted = attemptCount >= LESSON_AUTOMATION_MAX_ATTEMPTS;
  const delay = RETRY_DELAYS_MS[Math.min(attemptCount - 1, RETRY_DELAYS_MS.length - 1)]!;
  return {
    attemptCount,
    nextRetryAt: exhausted ? null : new Date(nowMs + delay).toISOString(),
    exhausted,
  };
}

export function isLessonAutomationRetryDue(
  current: LessonAutomationRetryState,
  nowMs = Date.now(),
): boolean {
  const attemptCount = Math.max(0, Math.trunc(current.automationAttemptCount ?? 0));
  if (attemptCount >= LESSON_AUTOMATION_MAX_ATTEMPTS) return false;
  if (!current.automationNextRetryAt) return true;
  const next = Date.parse(current.automationNextRetryAt);
  return Number.isFinite(next) && next <= nowMs;
}
