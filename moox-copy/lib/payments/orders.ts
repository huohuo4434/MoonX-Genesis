import "server-only";

import type { PaymentChain } from "@/types/membership";

export { computeMembershipExpiresAt } from "@/lib/payments/membership-dates";

export function generateOrderNumber(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MX-${y}${m}${day}-${rand}`;
}

export async function writeAuditLog(): Promise<void> {
  // No payment_audit_logs table in MVP — noop.
}

export async function isTxHashUsed(_txHash: string, _chain: PaymentChain): Promise<boolean> {
  void _txHash;
  void _chain;
  return false;
}
