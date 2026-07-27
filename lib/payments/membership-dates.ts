/** Pure membership date helpers — safe for tests and server. */

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
