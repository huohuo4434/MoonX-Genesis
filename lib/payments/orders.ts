import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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

export async function writeAuditLog(input: {
  orderId?: string;
  action: string;
  result: string;
  message?: string;
  serverMetadata?: Record<string, unknown>;
}) {
  const admin = createSupabaseAdminClient();
  if (!admin) return;
  await admin.from("payment_audit_logs").insert({
    order_id: input.orderId ?? null,
    action: input.action,
    result: input.result,
    message: input.message ?? null,
    server_metadata: input.serverMetadata ?? {},
  });
}

export async function isTxHashUsed(txHash: string, chain: PaymentChain): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  if (!admin) return true;
  const normalized = chain === "BSC" ? txHash.toLowerCase() : txHash;
  const [{ data: orderHit }, { data: txHit }] = await Promise.all([
    admin.from("payment_orders").select("id").eq("tx_hash", normalized).maybeSingle(),
    admin.from("crypto_transactions").select("id").eq("tx_hash", normalized).maybeSingle(),
  ]);
  return Boolean(orderHit || txHit);
}
