import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import { isPaymentEmailConfigured } from "@/lib/email/notifications";
import { listPaymentOrders } from "@/lib/payments/payment-orders-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Admin-only diagnostic of payment order store (for production verify). */
export async function GET(request: NextRequest) {
  const setupToken = process.env.MOONX_ADMIN_INITIAL_PASSWORD?.trim();
  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const cron = request.headers.get("x-cron-secret") ?? "";
  const cronExpected = process.env.CRON_SECRET?.trim();

  const viaSetup = Boolean(setupToken && setupToken.length >= 8 && bearer === setupToken);
  const viaCron = Boolean(cronExpected && cronExpected.length >= 8 && cron === cronExpected);
  const viaAdmin = await requireAdmin();

  if (!viaSetup && !viaCron && !viaAdmin) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const orders = await listPaymentOrders();
  const pending = orders.filter((o) => o.status === "pending");
  return NextResponse.json({
    ok: true,
    emailConfigured: isPaymentEmailConfigured(),
    total: orders.length,
    pendingCount: pending.length,
    pending: pending.map((o) => ({
      orderId: o.orderId,
      orderNumber: o.orderNumber,
      userEmail: o.userEmail,
      plan: o.plan,
      planName: o.planName,
      amount: o.amount,
      network: o.network,
      txHash: o.txHash,
      status: o.status,
      notificationStatus: o.notificationStatus,
      submittedAt: o.submittedAt,
      isTest: o.isTest,
    })),
  });
}
