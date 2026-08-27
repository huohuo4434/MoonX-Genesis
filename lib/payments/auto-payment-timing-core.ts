export const PAYMENT_RECONCILIATION_GRACE_MINUTES = 10;

const PAYMENT_RECONCILIATION_GRACE_MS = PAYMENT_RECONCILIATION_GRACE_MINUTES * 60_000;

/**
 * Keep an unpaid order discoverable for one full five-minute reconciliation
 * interval plus scheduler/provider jitter. This protects transfers broadcast
 * before the checkout deadline from being expired before the next chain scan.
 */
export function paymentDiscoveryCutoff(nowMs = Date.now()): Date {
  return new Date(nowMs - PAYMENT_RECONCILIATION_GRACE_MS);
}

export function isWithinPaymentDiscoveryGrace(expiresAt: string | Date, nowMs = Date.now()): boolean {
  const expiresAtMs = expiresAt instanceof Date ? expiresAt.getTime() : new Date(expiresAt).getTime();
  return Number.isFinite(expiresAtMs) && expiresAtMs >= paymentDiscoveryCutoff(nowMs).getTime();
}
