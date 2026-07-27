import { NextResponse, type NextRequest } from "next/server";
import { activateMembershipFromPayment } from "@/lib/payments/activate-membership";
import { getPaymentConfig } from "@/lib/payments/config";
import { isTxHashUsed, writeAuditLog } from "@/lib/payments/orders";
import { verifyTronTransfer } from "@/lib/payments/verify-chain";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/** Wallet auto-reconcile — supplement only; never auto-activate ambiguous matches. */
export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const cfg = getPaymentConfig();
  let processed = 0;
  let manualReview = 0;

  const { data: openOrders } = await admin
    .from("payment_orders")
    .select("*")
    .in("status", ["pending", "verifying"])
    .gt("expires_at", new Date().toISOString());

  if (!openOrders?.length) {
    return NextResponse.json({ ok: true, processed, manualReview });
  }

  // Reconcile orders that already have user-submitted tx_hash
  for (const order of openOrders) {
    if (!order.tx_hash) continue;
    if (await isTxHashUsed(order.tx_hash, order.chain)) continue;

    const { data: plan } = await admin
      .from("membership_plans")
      .select("duration_days, access_level")
      .eq("id", order.plan_id)
      .single();
    if (!plan) continue;

    try {
      if (order.chain !== "TRON") continue; // BSC reconcile requires explicit tx — cron conservative
      const transfer = await verifyTronTransfer(
        order.tx_hash,
        {
          recipientAddress: order.recipient_address,
          tokenContract: order.token_contract,
          minAmount: Number(order.expected_amount),
          orderCreatedAt: new Date(order.created_at),
        },
        cfg.tronGridApiKey
      );
      await activateMembershipFromPayment(order, transfer, plan.duration_days, plan.access_level);
      processed += 1;
    } catch (err) {
      manualReview += 1;
      await admin
        .from("payment_orders")
        .update({ status: "manual_review", verification_error: String(err) })
        .eq("id", order.id);
      await writeAuditLog({
        orderId: order.id,
        action: "cron_reconcile",
        result: "manual_review",
        message: String(err),
      });
    }
  }

  return NextResponse.json({ ok: true, processed, manualReview });
}
