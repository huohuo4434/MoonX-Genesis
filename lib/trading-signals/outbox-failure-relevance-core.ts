export const RELIABILITY_OUTBOX_FAILURE_COOLDOWN_MS = 30 * 60 * 1_000;

const ACTIVE_DECISION_STATUSES = new Set(["ORDER_SUBMITTED", "OPEN", "PARTIAL", "CLOSING"]);

/**
 * A terminal outbox failure is a current safety blocker while it is fresh, or
 * for as long as the linked trading decision can still represent live
 * exposure. Once the decision is terminal and the cooldown has elapsed, the
 * failure remains in the immutable audit trail but no longer impersonates a
 * current execution incident on every watchdog run.
 */
export function isOutboxFailureCurrent(input: {
  failedAt: Date | string | null | undefined;
  decisionStatus: string | null | undefined;
  now?: Date;
  cooldownMs?: number;
}) {
  if (ACTIVE_DECISION_STATUSES.has(String(input.decisionStatus ?? "").toUpperCase())) return true;

  const failedAtMs = input.failedAt instanceof Date
    ? input.failedAt.getTime()
    : new Date(input.failedAt ?? "").getTime();
  if (!Number.isFinite(failedAtMs)) return true;

  const nowMs = (input.now ?? new Date()).getTime();
  const cooldownMs = Math.max(0, input.cooldownMs ?? RELIABILITY_OUTBOX_FAILURE_COOLDOWN_MS);
  return nowMs - failedAtMs <= cooldownMs;
}
