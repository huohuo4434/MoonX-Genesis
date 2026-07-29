/** Pure membership date helpers — safe for tests and server. */

export type MembershipPlanCode = "MONTHLY" | "QUARTERLY" | "YEARLY";

export const PLAN_DAYS: Record<MembershipPlanCode, number> = {
  MONTHLY: 30,
  QUARTERLY: 90,
  YEARLY: 365,
};

export function computeMembershipExpiresAt(
  currentExpiresAt: string | null,
  durationDays: number,
  paidAt: Date
): Date {
  const base =
    currentExpiresAt && new Date(currentExpiresAt).getTime() > paidAt.getTime()
      ? new Date(currentExpiresAt)
      : paidAt;
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + durationDays);
  return next;
}

/**
 * Extend-only: base = max(now, existing future expiry), then + days.
 * Never shortens an existing future membershipExpiresAt.
 */
export function computeNewExpiry(
  currentExpiresAt: string | null | undefined,
  days: number,
  now = new Date()
): string {
  const current = currentExpiresAt ? new Date(currentExpiresAt) : null;
  const base = current && current.getTime() > now.getTime() ? current : now;
  const next = new Date(base.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  if (current && !Number.isNaN(current.getTime()) && current.getTime() > now.getTime()) {
    if (next.getTime() < current.getTime()) return current.toISOString();
  }
  return next.toISOString();
}

export function laterExpiryIso(
  a: string | null | undefined,
  b: string | null | undefined
): string | null {
  if (!a && !b) return null;
  if (!a) return b ?? null;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

export function daysBetweenIso(from: string | null, to: string | null): number {
  if (!from || !to) return 0;
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}
