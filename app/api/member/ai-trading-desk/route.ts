import { NextResponse } from "next/server";
import { getMemberDevicePageAccess as requireMemberDeviceAccess } from "@/lib/auth/member-device-guard";
import { checkMemberApiRateLimit } from "@/lib/auth/member-api-rate-limit";
import { getCachedMemberAiTradingDeskSnapshot } from "@/lib/trading-signals/member-ai-trading-desk-cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;
// Allow authentication plus the bounded cold DB read; never run the trader here.
export const maxDuration = 20;

export async function GET() {
  const gate = await requireMemberDeviceAccess();
  if (gate.status !== "ALLOWED") {
    return NextResponse.json(
      { error: gate.status === "DEVICE_REQUIRED" ? "会员设备使用权无效" : "会员权限不足", reason: gate.device?.reason },
      { status: gate.status === "LOGIN_REQUIRED" ? 401 : 403 }
    );
  }
  const rate = await checkMemberApiRateLimit({ scope: "ai-trading-desk" }, gate.access);
  if (!rate.ok) return NextResponse.json({ error: "请求过于频繁" }, { status: 429 });
  try {
    return NextResponse.json(await getCachedMemberAiTradingDeskSnapshot(), {
      headers: {
        "Cache-Control": "private, no-store",
        "X-MOOX-Desk-Mode": "snapshot-only",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "交易台数据暂时无法读取，请稍后重试" },
      { status: 500, headers: { "Cache-Control": "private, no-store" } }
    );
  }
}
