import { NextResponse, type NextRequest } from "next/server";
import { expireUnpaidOrders } from "@/lib/payments/auto-payment-orders";
import { reconcileAutoPayments } from "@/lib/payments/process-auto-payment";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET 未配置" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expired = await expireUnpaidOrders();
  const result = await reconcileAutoPayments(20);
  return NextResponse.json({ ok: true, expired, ...result });
}
