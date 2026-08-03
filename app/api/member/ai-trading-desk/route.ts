import { NextResponse } from "next/server";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { checkMemberApiRateLimit } from "@/lib/auth/member-api-rate-limit";
import { getMemberAiTradingDeskSnapshot } from "@/lib/trading-signals/member-ai-trading-desk";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const gate = await getMemberDevicePageAccess();
  if (gate.status !== "ALLOWED") {
    return NextResponse.json(
      { error: gate.status === "DEVICE_REQUIRED" ? "会员设备使用权无效" : "会员权限不足", reason: gate.device?.reason },
      { status: gate.status === "LOGIN_REQUIRED" ? 401 : 403 }
    );
  }
  const rate = await checkMemberApiRateLimit({ scope: "ai-trading-desk" });
  if (!rate.ok) return NextResponse.json({ error: "请求过于频繁" }, { status: 429 });
  try {
    return NextResponse.json(await getMemberAiTradingDeskSnapshot(), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "读取失败" },
      { status: 500 }
    );
  }
}
