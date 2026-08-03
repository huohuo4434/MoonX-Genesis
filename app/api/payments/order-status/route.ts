import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/permissions";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { getAutoPaymentOrderById } from "@/lib/payments/auto-payment-orders";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const limited = checkRateLimit(`auto-payment:status:${user.id}`, 200, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json({ error: "状态查询过于频繁" }, {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfterSec ?? 10) },
    });
  }
  const orderId = request.nextUrl.searchParams.get("orderId") ?? "";
  if (!orderId) return NextResponse.json({ error: "缺少订单号" }, { status: 400 });
  const order = await getAutoPaymentOrderById(orderId);
  if (!order || order.userId !== user.id) return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  return NextResponse.json({
    ok: true,
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    exactAmount: order.expectedAmount,
    paidAmount: order.paidAmount,
    expiresAt: order.expiresAt,
    membershipExpiresAt: order.membershipExpiresAt,
    verificationError: order.status === "manual_review" || order.status === "underpaid" || order.status === "rejected"
      ? order.verificationError
      : null,
    activated: order.status === "paid" || order.status === "overpaid",
  });
}
