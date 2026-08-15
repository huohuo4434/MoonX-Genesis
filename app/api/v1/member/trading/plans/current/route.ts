import { NextRequest, NextResponse } from "next/server";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { checkMemberApiRateLimit } from "@/lib/auth/member-api-rate-limit";
import { checkRateLimit } from "@/lib/auth/rate-limit";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 15;

// Authorization is enforced by the existing login + active membership + device gate.
export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
  let rate: { ok: boolean };
  if (bearer) {
    const { verifyMemberSignalApiToken } = await import("@/lib/auth/member-signal-api-token");
    const credential = await verifyMemberSignalApiToken(bearer);
    if (!credential) return NextResponse.json({ error: "API Token无效、过期或会员已失效" }, { status: 401 });
    rate = checkRateLimit(`member-signal-token:${credential.tokenId}`, 60, 60_000);
  } else {
    const gate = await getMemberDevicePageAccess();
    if (gate.status !== "ALLOWED" || !gate.access.userId) {
      return NextResponse.json(
        { error: gate.status === "LOGIN_REQUIRED" ? "请先登录" : gate.status === "DEVICE_REQUIRED" ? "会员设备使用权无效" : "会员权限不足" },
        { status: gate.status === "LOGIN_REQUIRED" ? 401 : 403 }
      );
    }
    rate = await checkMemberApiRateLimit({ scope: "member-trading-plan", limit: 60 });
  }
  if (!rate.ok) return NextResponse.json({ error: "请求过于频繁" }, { status: 429 });
  const symbol = request.nextUrl.searchParams.get("symbol")?.trim() || "BTC";
  const { loadCurrentMemberTradingPlan } = await import("@/lib/trading-signals/member-trading-plan.server");
  const plan = await loadCurrentMemberTradingPlan({ symbol });
  if (!plan) return NextResponse.json({ error: "该品种暂无已发布交易计划" }, { status: 404 });
  return NextResponse.json(plan, {
    headers: {
      "Cache-Control": "private, no-store",
      "X-MOOX-Execution-Scope": "paper-only",
    },
  });
}
