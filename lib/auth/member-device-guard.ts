import "server-only";

import { cache } from "react";
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

function degradedAllowedDecision(label: string): DeviceAccessDecision {
  return {
    allowed: true,
    reason: "ALLOWED",
    displayName: label,
  };
}

async function evaluateMemberDevicePageAccess(input?: {
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
      device: degradedAllowedDecision("管理员会话"),
    };
  }

  try {
    const device = await evaluateMemberDeviceAccess({
      userId: access.userId,
      deviceToken,
      userAgent: headerStore.get("user-agent"),
      ip: requestIp(headerStore),
      region: headerStore.get("x-vercel-ip-country") ?? null,
      isAdmin: access.isAdmin,
      forceAcquire: input?.forceAcquire,
    });

    // Device security is a secondary anti-sharing layer. A missing migration must
    // never take down paid content after authentication and membership already pass.
    if (device.reason === "SETUP_REQUIRED") {
      return {
        access,
        status: "ALLOWED",
        device: degradedAllowedDecision("设备守卫暂时降级"),
      };
    }

    return {
      access,
      status: device.allowed ? "ALLOWED" : "DEVICE_REQUIRED",
      device,
    };
  } catch {
    // Fail open only for this secondary device layer. Login, role and membership
    // checks above remain authoritative; transient database failures no longer make
    // the entire member site unusable.
    return {
      access,
      status: "ALLOWED",
      device: degradedAllowedDecision("设备守卫临时降级"),
    };
  }
}

// Layouts and pages can render in the same RSC request. The device evaluator
// updates leases and security events, so every normal request must share this
// single request-scoped result instead of evaluating twice.
const getCachedMemberDevicePageAccess = cache(() => evaluateMemberDevicePageAccess());

export function getMemberDevicePageAccess(input?: {
  forceAcquire?: boolean;
}): Promise<MemberDevicePageAccess> {
  if (input?.forceAcquire) return evaluateMemberDevicePageAccess(input);
  return getCachedMemberDevicePageAccess();
}
