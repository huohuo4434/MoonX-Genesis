import { NextRequest, NextResponse } from "next/server";
import { getAccessUser } from "@/lib/auth/get-access-user";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { verifyAccountPassword } from "@/lib/auth/verify-account-password";
import {
  evaluateMemberDeviceAccess,
  generateDeviceToken,
  MEMBER_DEVICE_COOKIE,
  MEMBER_DEVICE_COOKIE_MAX_AGE_SECONDS,
  recordSecurityEvent,
} from "@/lib/auth/device-security";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const access = await getAccessUser();
  if (!access.authenticated || !access.userId || !access.email) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  if (!access.isActiveMember && !access.isAdmin) {
    return NextResponse.json({ error: "需要有效付费会员" }, { status: 403 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip");
  const limited = checkRateLimit(`device-claim:${access.userId}:${ip ?? "unknown"}`, 8, 10 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "设备确认尝试过于频繁，请稍后再试" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec ?? 60) } }
    );
  }

  const existing = request.cookies.get(MEMBER_DEVICE_COOKIE)?.value;
  const body = (await request.json().catch(() => null)) as { password?: string } | null;

  // A legacy session or a newly cleared browser has no trusted-device cookie.
  // Re-entering the account password confirms that this really is the member.
  if (!existing && !access.isAdmin) {
    if (!body?.password) {
      return NextResponse.json(
        { allowed: false, reason: "PASSWORD_REQUIRED", error: "请重新输入登录密码确认新设备" },
        { status: 428 }
      );
    }
    const verified = await verifyAccountPassword(access.email, body.password);
    if (!verified) {
      await recordSecurityEvent({
        userId: access.userId,
        eventType: "NEW_DEVICE_PASSWORD_FAILED",
      });
      return NextResponse.json(
        { allowed: false, reason: "PASSWORD_REQUIRED", error: "密码验证失败" },
        { status: 401 }
      );
    }
  }

  const deviceToken = existing || generateDeviceToken();
  const decision = await evaluateMemberDeviceAccess({
    userId: access.userId,
    deviceToken,
    userAgent: request.headers.get("user-agent"),
    ip,
    region: request.headers.get("x-vercel-ip-country"),
    isAdmin: access.isAdmin,
    forceAcquire: true,
  });

  const status = decision.allowed
    ? 200
    : decision.reason === "DEVICE_LIMIT"
      ? 409
      : decision.reason === "SETUP_REQUIRED"
        ? 503
        : 403;
  const response = NextResponse.json(decision, { status });
  if (!existing && decision.allowed) {
    response.cookies.set(MEMBER_DEVICE_COOKIE, deviceToken, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL),
      maxAge: MEMBER_DEVICE_COOKIE_MAX_AGE_SECONDS,
    });
  }
  response.headers.set("Cache-Control", "no-store");
  return response;
}
