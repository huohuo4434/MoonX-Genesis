import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/membership";
import { activateMembershipFromPayment } from "@/lib/payments/activate-membership";
import { getPaymentConfig } from "@/lib/payments/config";
import { isTxHashUsed, writeAuditLog } from "@/lib/payments/orders";
import { validateTxHash, verifyBscTransfer, verifyTronTransfer } from "@/lib/payments/verify-chain";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PaymentOrder } from "@/types/membership";

const bodySchema = z.object({
  orderNumber: z.string().min(1),
  txHash: z.string().min(10),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "支付服务尚未配置" }, { status: 503 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "无效请求参数" }, { status: 400 });
  }

  const { data: order, error: orderErr } = await admin
    .from("payment_orders")
    .select("*, membership_plans(duration_days, access_level)")
    .eq("order_number", body.orderNumber)
    .eq("user_id", user.id)
    .maybeSingle();

  if (orderErr || !order) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }

  const paymentOrder = order as PaymentOrder;

  const { data: plan, error: planErr } = await admin
    .from("membership_plans")
    .select("duration_days, access_level")
    .eq("id", paymentOrder.plan_id)
    .single();
  if (planErr || !plan) {
    return NextResponse.json({ error: "套餐信息缺失" }, { status: 500 });
  }

  if (paymentOrder.status === "paid") {
    return NextResponse.json({ error: "订单已支付" }, { status: 400 });
  }
  if (new Date(paymentOrder.expires_at).getTime() < Date.now() && paymentOrder.status === "pending") {
    await admin.from("payment_orders").update({ status: "expired" }).eq("id", paymentOrder.id);
    await writeAuditLog({
      orderId: paymentOrder.id,
      action: "verify_payment",
      result: "expired",
      message: "Order expired before verification",
    });
    return NextResponse.json({ error: "订单已过期，请联系客服人工审核" }, { status: 400 });
  }

  const chain = paymentOrder.chain;
  const txHash = chain === "BSC" ? body.txHash.toLowerCase() : body.txHash;

  if (!validateTxHash(chain, txHash)) {
    return NextResponse.json({ error: "交易哈希格式无效" }, { status: 400 });
  }

  if (await isTxHashUsed(txHash, chain)) {
    await writeAuditLog({
      orderId: paymentOrder.id,
      action: "verify_payment",
      result: "rejected",
      message: "Duplicate tx hash",
    });
    return NextResponse.json({ error: "该交易哈希已被使用" }, { status: 400 });
  }

  const cfg = getPaymentConfig();
  const orderCreatedAt = new Date(paymentOrder.created_at);

  try {
    const transfer =
      chain === "TRON"
        ? await verifyTronTransfer(
            txHash,
            {
              recipientAddress: paymentOrder.recipient_address,
              tokenContract: paymentOrder.token_contract,
              minAmount: Number(paymentOrder.expected_amount),
              orderCreatedAt,
            },
            cfg.tronGridApiKey
          )
        : await verifyBscTransfer(txHash, {
            recipientAddress: paymentOrder.recipient_address,
            tokenContract: paymentOrder.token_contract,
            minAmount: Number(paymentOrder.expected_amount),
            orderCreatedAt,
            rpcUrl: cfg.bscRpcUrl,
            minConfirmations: cfg.bscConfirmations,
          });

    const result = await activateMembershipFromPayment(
      paymentOrder,
      transfer,
      plan.duration_days,
      plan.access_level as "member" | "premium"
    );

    return NextResponse.json({
      success: true,
      status: "paid",
      membershipExpiresAt: result.membershipExpiresAt,
      paidAmount: transfer.amountNormalized,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    await admin
      .from("payment_orders")
      .update({ status: "verifying", verification_error: message, tx_hash: txHash })
      .eq("id", paymentOrder.id);
    await writeAuditLog({
      orderId: paymentOrder.id,
      action: "verify_payment",
      result: "failed",
      message,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
