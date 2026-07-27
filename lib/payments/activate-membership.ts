import "server-only";

import { computeMembershipExpiresAt, writeAuditLog } from "@/lib/payments/orders";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PaymentOrder, VerifiedTransfer } from "@/types/membership";

export async function activateMembershipFromPayment(
  order: PaymentOrder,
  transfer: VerifiedTransfer,
  planDurationDays: number,
  accessLevel: "member" | "premium"
): Promise<{ membershipExpiresAt: string }> {
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("Database not configured");

  const paidAt = transfer.blockTimestamp;
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("membership_expires_at, membership_started_at")
    .eq("id", order.user_id)
    .single();
  if (profileErr || !profile) throw new Error("Profile not found");

  const newExpires = computeMembershipExpiresAt(
    profile.membership_expires_at as string | null,
    planDurationDays,
    paidAt
  );
  const newExpiresIso = newExpires.toISOString();
  const previousExpires = profile.membership_expires_at as string | null;

  const { data: lockedOrder, error: lockErr } = await admin
    .from("payment_orders")
    .update({ status: "verifying", tx_hash: transfer.txHash })
    .eq("id", order.id)
    .in("status", ["pending", "verifying"])
    .is("tx_hash", null)
    .select("*")
    .maybeSingle();

  if (lockErr || !lockedOrder) {
    throw new Error("Order already processed or locked");
  }

  const { error: txInsertErr } = await admin.from("crypto_transactions").insert({
    chain: transfer.chain,
    tx_hash: transfer.txHash,
    block_number: transfer.blockNumber,
    sender_address: transfer.senderAddress,
    recipient_address: transfer.recipientAddress,
    token_contract: transfer.tokenContract,
    amount_raw: transfer.amountRaw,
    amount_normalized: transfer.amountNormalized,
    block_timestamp: transfer.blockTimestamp.toISOString(),
    confirmation_status: "confirmed",
    matched_order_id: order.id,
    processed_at: new Date().toISOString(),
    raw_payload: transfer.rawPayload,
  });
  if (txInsertErr) {
    if (txInsertErr.code === "23505") throw new Error("Transaction hash already used");
    throw new Error(txInsertErr.message);
  }

  const paidStatus =
    transfer.amountNormalized + 1e-8 >= Number(order.expected_amount) ? "paid" : "underpaid";
  if (paidStatus === "underpaid") {
    await admin
      .from("payment_orders")
      .update({
        status: "underpaid",
        paid_amount: transfer.amountNormalized,
        verification_error: "Amount less than expected",
      })
      .eq("id", order.id);
    await writeAuditLog({
      orderId: order.id,
      action: "verify_payment",
      result: "underpaid",
      message: "Amount less than expected",
    });
    throw new Error("Payment amount is less than order amount");
  }

  const role = accessLevel === "premium" ? "premium" : "member";

  const { error: orderUpdateErr } = await admin
    .from("payment_orders")
    .update({
      status: "paid",
      paid_amount: transfer.amountNormalized,
      paid_at: paidAt.toISOString(),
      verified_at: new Date().toISOString(),
      membership_expires_at: newExpiresIso,
      verification_error: null,
    })
    .eq("id", order.id);
  if (orderUpdateErr) throw new Error(orderUpdateErr.message);

  const startedAt =
    profile.membership_started_at ??
    (previousExpires && new Date(previousExpires).getTime() > Date.now()
      ? profile.membership_started_at
      : paidAt.toISOString());

  const { error: profileUpdateErr } = await admin
    .from("profiles")
    .update({
      role,
      membership_status: "active",
      membership_started_at: startedAt ?? paidAt.toISOString(),
      membership_expires_at: newExpiresIso,
    })
    .eq("id", order.user_id);
  if (profileUpdateErr) throw new Error(profileUpdateErr.message);

  await admin.from("subscription_events").insert({
    user_id: order.user_id,
    order_id: order.id,
    event_type: "membership_activated",
    previous_expires_at: previousExpires,
    new_expires_at: newExpiresIso,
    note: `Paid via ${transfer.chain} ${transfer.txHash}`,
  });

  await writeAuditLog({
    orderId: order.id,
    action: "activate_membership",
    result: "success",
    message: `Membership until ${newExpiresIso}`,
  });

  return { membershipExpiresAt: newExpiresIso };
}

export async function expireMemberships(now = new Date()): Promise<number> {
  const admin = createSupabaseAdminClient();
  if (!admin) return 0;
  const iso = now.toISOString();
  const { data, error } = await admin
    .from("profiles")
    .update({ membership_status: "expired" })
    .eq("membership_status", "active")
    .lte("membership_expires_at", iso)
    .select("id");
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}
