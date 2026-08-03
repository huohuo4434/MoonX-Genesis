import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/permissions";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { attachTransactionHash, getAutoPaymentOrderById } from "@/lib/payments/auto-payment-orders";
import { processAutoPaymentOrder } from "@/lib/payments/process-auto-payment";
import { validateTxHash } from "@/lib/payments/verify-chain";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

const schema = z.object({
  orderId: z.string().uuid(),
  txHash: z.string().min(20).max(200),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "订单号或交易哈希无效" }, { status: 400 });
  }

  const limited = checkRateLimit(`auto-payment:submit:${user.id}`, 15, 10 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json({ error: "核验请求过于频繁，请稍后再试" }, {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfterSec ?? 60) },
    });
  }

  const order = await getAutoPaymentOrderById(body.orderId);
  if (!order || order.userId !== user.id) return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  const txHash = body.txHash.trim();
  if (!validateTxHash(order.chain, txHash)) {
    return NextResponse.json({
      error: order.chain === "TRON" ? "TRC20 交易哈希应为 64 位十六进制字符" : "BEP20 交易哈希应以 0x 开头并包含 64 位十六进制字符",
    }, { status: 400 });
  }

  try {
    await attachTransactionHash({ orderId: order.id, userId: user.id, txHash });
    const result = await processAutoPaymentOrder(order.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "付款核验失败" }, { status: 500 });
  }
}
