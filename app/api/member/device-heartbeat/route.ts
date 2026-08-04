import { NextRequest, NextResponse } from "next/server";
import { getAccessUser } from "@/lib/auth/get-access-user";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { evaluateMemberDeviceAccess, MEMBER_DEVICE_COOKIE } from "@/lib/auth/device-security";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const access = await getAccessUser();
  if (!access.authenticated || !access.userId) {
    return NextResponse.json({ error: "登录已失效" }, { status: 401 });
  }
  if (!access.isActiveMember && !access.isAdmin) {
    return NextResponse.json({ error: "会员已失效" }, { status: 403 });
  }

  const token = request.cookies.get(MEMBER_DEVICE_COOKIE)?.value;
  const rateKey = `member-heartbeat:${access.userId}:${token ? token.slice(0, 12) : "missing"}`;
  const limited = checkRateLimit(rateKey, 30, 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json({ error: "请求过于频繁" }, { status: 429 });
  }

  try {
    const decision = await evaluateMemberDeviceAccess({
      userId: access.userId,
      deviceToken: token,
      userAgent: request.headers.get("user-agent"),
      ip:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip"),
      region: request.headers.get("x-vercel-ip-country"),
      isAdmin: access.isAdmin,
    });

    if (decision.reason === "SETUP_REQUIRED") {
      return NextResponse.json(
        { allowed: true, reason: "ALLOWED", degraded: true },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(decision, {
      status: decision.allowed ? 200 : 409,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { allowed: true, reason: "ALLOWED", degraded: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
