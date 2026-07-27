import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/membership";
import { chainTokenMeta, getPaymentConfig, paymentQrPayload } from "@/lib/payments/config";
import { generateOrderNumber, writeAuditLog } from "@/lib/payments/orders";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PaymentChain } from "@/types/membership";

const bodySchema = z.object({
  planCode: z.string().min(1),
  chain: z.enum(["TRON", "BSC"]),
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

  const cfg = getPaymentConfig();
  if (body.chain === "BSC" && !cfg.bep20Enabled) {
    return NextResponse.json({ error: "BEP20 支付方式待管理员确认，暂未开放" }, { status: 400 });
  }

  const { data: plan, error: planErr } = await admin
    .from("membership_plans")
    .select("*")
    .eq("code", body.planCode)
    .eq("active", true)
    .maybeSingle();

  if (planErr || !plan) {
    return NextResponse.json({ error: "套餐不存在或未启用" }, { status: 400 });
  }
  if (plan.price_usdt == null || Number(plan.price_usdt) <= 0) {
    return NextResponse.json({ error: "套餐价格尚未配置，请联系客服" }, { status: 400 });
  }

  const tokenMeta = chainTokenMeta(body.chain as PaymentChain);
  const orderNumber = generateOrderNumber();
  const expiresAt = new Date(Date.now() + cfg.orderTtlMinutes * 60_000);
  const expectedAmount = Number(plan.price_usdt);

  const { data: order, error: insertErr } = await admin
    .from("payment_orders")
    .insert({
      order_number: orderNumber,
      user_id: user.id,
      plan_id: plan.id,
      chain: body.chain,
      token_symbol: tokenMeta.tokenSymbol,
      token_contract: tokenMeta.tokenContract,
      recipient_address: tokenMeta.recipientAddress,
      expected_amount: expectedAmount,
      status: "pending",
      expires_at: expiresAt.toISOString(),
      metadata: { planCode: plan.code, planName: plan.name },
    })
    .select("*")
    .single();

  if (insertErr || !order) {
    return NextResponse.json({ error: "创建订单失败" }, { status: 500 });
  }

  await writeAuditLog({
    orderId: order.id,
    action: "create_order",
    result: "success",
    message: `${orderNumber} ${body.chain}`,
  });

  return NextResponse.json({
    orderNumber,
    chain: body.chain,
    tokenName: tokenMeta.tokenName,
    tokenSymbol: tokenMeta.tokenSymbol,
    expectedAmount,
    recipientAddress: tokenMeta.recipientAddress,
    expiresAt: expiresAt.toISOString(),
    paymentQRCodeData: paymentQrPayload(body.chain as PaymentChain, tokenMeta.recipientAddress, expectedAmount),
    warningText: tokenMeta.warningText,
    checkoutUrl: `/checkout/${orderNumber}`,
  });
}
