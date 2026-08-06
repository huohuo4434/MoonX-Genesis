import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import { notifyAdminAutoPayment } from "@/lib/payments/admin-payment-notifications";
import {
  getAutoPaymentOrderById,
  markOrderManuallyActivated,
  requeueAutoPaymentOrder,
} from "@/lib/payments/auto-payment-orders";
import { finalizeAutoPaymentMembership } from "@/lib/payments/finalize-auto-payment";
import { processAutoPaymentOrder } from "@/lib/payments/process-auto-payment";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const schema = z.object({
  orderId: z.string().uuid(),
  action: z.enum(["retry", "activate", "resend_admin_email"]),
  confirm: z.literal(true),
});

export async function POST(request: NextRequest) {
  const adminUser = await requireAdmin();
  if (!adminUser) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "请求内容无效" }, { status: 400 });

  const order = await getAutoPaymentOrderById(parsed.data.orderId);
  if (!order) return NextResponse.json({ error: "自动付款订单不存在" }, { status: 404 });

  try {
    if (parsed.data.action === "retry") {
      const queued = await requeueAutoPaymentOrder(order.id, `管理员 ${adminUser.email} 发起重新核验`);
      if (!queued) return NextResponse.json({ error: "该订单无法重新核验" }, { status: 409 });
      const result = await processAutoPaymentOrder(order.id);
      return NextResponse.json({ ok: true, result });
    }

    if (parsed.data.action === "resend_admin_email") {
      const result = await notifyAdminAutoPayment({
        order,
        kind: order.status === "paid" || order.status === "overpaid" ? "activated" : "manual_review",
        message: order.verificationError ?? "管理员重新发送付款通知。",
        paidAmount: order.paidAmount,
        membershipExpiresAt: order.membershipExpiresAt,
      });
      return NextResponse.json({ ok: true, result });
    }

    if (!order.txHash) {
      return NextResponse.json({ error: "订单没有交易哈希，不能手动开通" }, { status: 409 });
    }
    if (order.status === "paid" || order.status === "overpaid") {
      return NextResponse.json({ ok: true, alreadyActivated: true, membershipExpiresAt: order.membershipExpiresAt });
    }

    const grant = await finalizeAutoPaymentMembership({ order, verifiedAt: new Date() });
    await markOrderManuallyActivated({
      order,
      membershipExpiresAt: grant.membershipExpiresAt,
      operatorId: adminUser.id,
    });
    await notifyAdminAutoPayment({
      order,
      kind: "manual_activated",
      message: `管理员 ${adminUser.email} 已在核对链上到账后手动开通。`,
      paidAmount: order.paidAmount ?? order.expectedAmount,
      membershipExpiresAt: grant.membershipExpiresAt,
    }).catch(() => undefined);
    return NextResponse.json({
      ok: true,
      membershipExpiresAt: grant.membershipExpiresAt,
      grantApplied: grant.grantApplied,
      grantSkipped: grant.grantSkipped,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "操作失败" },
      { status: 500 }
    );
  }
}
