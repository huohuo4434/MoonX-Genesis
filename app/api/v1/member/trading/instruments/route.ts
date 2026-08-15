import { NextResponse } from "next/server";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { checkMemberApiRateLimit } from "@/lib/auth/member-api-rate-limit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function requireMemberDeviceAccess() {
  return getMemberDevicePageAccess();
}

export async function GET() {
  const gate = await requireMemberDeviceAccess();
  if (gate.status !== "ALLOWED" || !gate.access.userId) {
    return NextResponse.json({ error: gate.status === "LOGIN_REQUIRED" ? "请先登录" : "会员权限或设备使用权无效" }, { status: gate.status === "LOGIN_REQUIRED" ? 401 : 403 });
  }
  const rate = await checkMemberApiRateLimit({ scope: "member-trading-instruments", limit: 30 });
  if (!rate.ok) return NextResponse.json({ error: "请求过于频繁" }, { status: 429 });
  const { loadMemberTradingInstruments } = await import("@/lib/trading-signals/member-instrument-registry.server");
  return NextResponse.json(await loadMemberTradingInstruments(), { headers: { "Cache-Control": "private, no-store" } });
}
