import "server-only";

import { cookies, headers } from "next/headers";
import { getAccessUser, type AccessUserSnapshot } from "@/lib/auth/get-access-user";
import {
  evaluateMemberDeviceAccess,
  MEMBER_DEVICE_COOKIE,
  recordSecurityEvent,
  type DeviceAccessDecision,
} from "@/lib/auth/device-security";

export type MemberDevicePageAccess = {
  access: AccessUserSnapshot;
  status: "LOGIN_REQUIRED" | "MEMBERSHIP_REQUIRED" | "DEVICE_REQUIRED" | "ALLOWED";
  device: DeviceAccessDecision | null;
};

function requestIp(headerStore: Pick<Headers, "get">): string | null {
  return headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || headerStore.get("x-real-ip");
}

export async function getMemberDevicePageAccess(input?: {
  forceAcquire?: boolean;
}): Promise<MemberDevicePageAccess> {
  const access = await getAccessUser();
  if (!access.authenticated || !access.userId) {
    return { access, status: "LOGIN_REQUIRED", device: null };
  }
  if (!access.isActiveMember && !access.isAdmin) {
    return { access, status: "MEMBERSHIP_REQUIRED", device: null };
  }

  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const deviceToken = cookieStore.get(MEMBER_DEVICE_COOKIE)?.value ?? null;
  if (access.isAdmin && !deviceToken) {
    await recordSecurityEvent({
      userId: access.userId,
      eventType: "ADMIN_MEMBER_CONTENT_ACCESS_NO_DEVICE_COOKIE",
      detail: { note: "Admin bypassed the member device limit; no token or raw IP recorded." },
    });
    return {
      access,
      status: "ALLOWED",
      device: { allowed: true, reason: "ALLOWED", displayName: "管理员会话" },
    };
  }
  const device = await evaluateMemberDeviceAccess({
    userId: access.userId,
    deviceToken,
    userAgent: headerStore.get("user-agent"),
    ip: requestIp(headerStore),
    region: headerStore.get("x-vercel-ip-country") ?? null,
    isAdmin: access.isAdmin,
    forceAcquire: input?.forceAcquire,
  });

  return {
    access,
    status: device.allowed ? "ALLOWED" : "DEVICE_REQUIRED",
    device,
  };
}
