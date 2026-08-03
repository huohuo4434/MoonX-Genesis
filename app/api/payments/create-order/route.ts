import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, type MembershipPlan, type PaymentNetwork } from "@/lib/auth/permissions";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { getFeatureFlags } from "@/lib/feature-flags";
import { createAutoPaymentOrder } from "@/lib/payments/auto-payment-orders";
import { getFounderDiscountQuote } from "@/lib/payments/founder-discount-server";
import { chainTokenMeta, getPaymentConfig } from "@/lib/payments/config";
import { getPaymentReadiness } from "@/lib/payments/readiness";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const schema = z.object({
  plan: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]),
  network: z.enum(["TRC20", "BEP20"]),
});

export async function POST(request: NextRequest) {
  const flags = getFeatureFlags();
  if (!flags.paymentsEnabled) {
    return NextResponse.json({ error: "付款功能暂未开放" }, { status: 503 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "套餐或网络无效" }, { status: 400 });
  }

  const limited = checkRateLimit(`auto-payment:create:${user.id}`, 12, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json({ error: "订单生成过于频繁，请稍后再试" }, {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfterSec ?? 60) },
    });
  }

  try {
    const readiness = await getPaymentReadiness();
    const ready = body.network === "TRC20" ? readiness.autoVerificationReady : readiness.bep20Open;
    if (!ready) {
      throw new Error(`自动付款尚未就绪：${readiness.reasons.join("；") || "请检查后台配置"}`);
    }
    const founderQuote = await getFounderDiscountQuote(user);
    const order = await createAutoPaymentOrder({
      user,
      plan: body.plan as MembershipPlan,
      network: body.network as PaymentNetwork,
      founderQuote,
    });
    const token = chainTokenMeta(order.chain);
    const cfg = getPaymentConfig();
    return NextResponse.json({
      ok: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      plan: order.plan,
      planName: order.planName,
      network: order.network,
      chain: order.chain,
      tokenName: token.tokenName,
      tokenSymbol: token.tokenSymbol,
      tokenContract: order.tokenContract,
      recipientAddress: order.recipientAddress,
      exactAmount: order.expectedAmount,
      listPrice: order.listPrice,
      discountPercent: order.discountPercent,
      founderRank: order.founderRank,
      expiresAt: order.expiresAt,
      warningText: token.warningText,
      autoVerify: true,
      pollingSeconds: 5,
      cronEnabled: Boolean(process.env.CRON_SECRET),
      tronGridConfigured: Boolean(cfg.tronGridApiKey),
      bep20Enabled: cfg.bep20Enabled,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "订单创建失败";
    return NextResponse.json({ error: message }, { status: /暂未启用/.test(message) ? 400 : 503 });
  }
}
