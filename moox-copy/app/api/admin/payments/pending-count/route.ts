import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import { isPaymentEmailConfigured } from "@/lib/email/notifications";
import { countPendingPaymentOrders, listPendingPaymentOrders } from "@/lib/payments/payment-orders-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  const [count, recent] = await Promise.all([
    countPendingPaymentOrders(),
    listPendingPaymentOrders(5),
  ]);
  return NextResponse.json({
    count,
    emailConfigured: isPaymentEmailConfigured(),
    recent: recent.map((o) => ({
      orderId: o.orderId,
      orderNumber: o.orderNumber,
      userEmail: o.userEmail,
      plan: o.plan,
      planName: o.planName,
      amount: o.amount,
      network: o.network,
      submittedAt: o.submittedAt,
      isTest: o.isTest,
    })),
  });
}
