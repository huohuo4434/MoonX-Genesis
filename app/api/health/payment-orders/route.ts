export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { isPaymentEmailConfigured } from "@/lib/email/notifications";
import { listPaymentOrders } from "@/lib/payments/payment-orders-store";

/** Public payment-orders health (no secrets; emails redacted). */
export async function GET() {
  try {
    const orders = await listPaymentOrders();
    const pending = orders.filter((o) => o.status === "pending");
    const approved = orders.filter((o) => o.status === "approved");
    const rejected = orders.filter((o) => o.status === "rejected");
    const huohuoPending = pending.filter((o) => o.userEmail === "huohuo4434@gmail.com");

    return NextResponse.json({
      ok: true,
      emailConfigured: isPaymentEmailConfigured(),
      total: orders.length,
      pendingCount: pending.length,
      approvedCount: approved.length,
      rejectedCount: rejected.length,
      huohuoPendingCount: huohuoPending.length,
      pendingOrderNumbers: pending.slice(0, 10).map((o) => o.orderNumber),
      sample: pending.slice(0, 5).map((o) => ({
        order_number: o.orderNumber,
        plan: o.plan,
        amount: o.amount,
        network: o.network,
        status: o.status,
        notification_status: o.notificationStatus,
        emailDomain: o.userEmail.split("@")[1] ?? null,
        tx_prefix: o.txHash.slice(0, 16),
        created_at: o.submittedAt,
        isTest: o.isTest,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
