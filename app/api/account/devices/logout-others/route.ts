import { NextRequest, NextResponse } from "next/server";
import { getAccessUser } from "@/lib/auth/get-access-user";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import {
  logoutOtherDevices,
  MEMBER_DEVICE_COOKIE,
  recordSecurityEvent,
} from "@/lib/auth/device-security";
import { verifyAccountPassword } from "@/lib/auth/verify-account-password";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const access = await getAccessUser();
  if (!access.authenticated || !access.userId || !access.email) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const currentDeviceToken = request.cookies.get(MEMBER_DEVICE_COOKIE)?.value;
  const body = (await request.json().catch(() => null)) as { password?: string } | null;

  // An old session without the trusted-device cookie may be stolen.
  // Require password re-authentication before revoking every other device.
  if (!currentDeviceToken && !access.isAdmin) {
    const limited = checkRateLimit(`logout-other-devices:${access.userId}`, 6, 10 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "验证尝试过于频繁，请稍后再试" },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec ?? 60) } }
      );
    }
    if (!body?.password) {
      return NextResponse.json(
        { reason: "PASSWORD_REQUIRED", error: "请重新输入登录密码确认此安全操作" },
        { status: 428 }
      );
    }
    const verified = await verifyAccountPassword(access.email, body.password);
    if (!verified) {
      await recordSecurityEvent({
        userId: access.userId,
        eventType: "LOGOUT_OTHERS_PASSWORD_FAILED",
      });
      return NextResponse.json(
        { reason: "PASSWORD_REQUIRED", error: "密码验证失败" },
        { status: 401 }
      );
    }
  }

  const count = await logoutOtherDevices({
    userId: access.userId,
    currentDeviceToken,
    actorUserId: access.userId,
  });
  const response = NextResponse.json({ ok: true, count });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
