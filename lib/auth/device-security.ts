import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  canBindTrustedDevice,
  decideMemberLease,
  MAX_MEMBER_DEVICES,
  MEMBER_LEASE_SECONDS,
} from "@/lib/auth/device-policy";

export { MAX_MEMBER_DEVICES, MEMBER_LEASE_SECONDS };
export const MEMBER_DEVICE_COOKIE = "moox_member_device";
export const MEMBER_DEVICE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export type DeviceAccessReason =
  | "ALLOWED"
  | "COOKIE_REQUIRED"
  | "DEVICE_LIMIT"
  | "ACTIVE_ELSEWHERE"
  | "DEVICE_REVOKED"
  | "SETUP_REQUIRED";

export type DeviceAccessDecision = {
  allowed: boolean;
  reason: DeviceAccessReason;
  deviceId?: string;
  displayName?: string;
  activeElsewhereName?: string;
  expiresAt?: string;
};

export type DeviceListItem = {
  id: string;
  displayName: string;
  current: boolean;
  verified: boolean;
  revoked: boolean;
  createdAt: string;
  lastSeenAt: string;
  lastRegion: string | null;
};

export type LoginDeviceRegistration = {
  ok: boolean;
  reason: "BOUND" | "KNOWN" | "DEVICE_LIMIT" | "SKIPPED" | "SETUP_REQUIRED";
};

function isMissingDeviceSchema(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error ?? "");
  return /TrustedDevice|MemberAccessLease|SecurityEvent|does not exist|P2021|P2022/i.test(text);
}

export function generateDeviceToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashDeviceToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function hashNetworkSignal(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  const salt = process.env.DEVICE_SECURITY_SALT?.trim();
  if (!value || !salt) return null;
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

export function describeDevice(userAgent: string | null | undefined): {
  displayName: string;
  browserFamily: string;
  platformFamily: string;
} {
  const ua = userAgent ?? "";
  const platformFamily = /iPhone|iPad|iPod/i.test(ua)
    ? "iOS"
    : /Android/i.test(ua)
      ? "Android"
      : /Windows/i.test(ua)
        ? "Windows"
        : /Macintosh|Mac OS X/i.test(ua)
          ? "macOS"
          : /Linux/i.test(ua)
            ? "Linux"
            : "未知系统";

  const browserFamily = /Edg\//i.test(ua)
    ? "Edge"
    : /Firefox\//i.test(ua)
      ? "Firefox"
      : /Chrome\//i.test(ua)
        ? "Chrome"
        : /Safari\//i.test(ua)
          ? "Safari"
          : "浏览器";

  return {
    displayName: `${platformFamily} · ${browserFamily}`,
    browserFamily,
    platformFamily,
  };
}

function eventDetail(detail: Record<string, unknown> | undefined): Prisma.InputJsonValue | undefined {
  if (!detail) return undefined;
  return detail as Prisma.InputJsonValue;
}

export async function recordSecurityEvent(input: {
  userId: string;
  eventType: string;
  deviceId?: string | null;
  actorUserId?: string | null;
  detail?: Record<string, unknown>;
}): Promise<void> {
  if (!prisma) return;
  try {
    await prisma.securityEvent.create({
      data: {
        userId: input.userId,
        eventType: input.eventType,
        deviceId: input.deviceId ?? null,
        actorUserId: input.actorUserId ?? null,
        detail: eventDetail(input.detail),
      },
    });
  } catch {
    // Auditing must never expose secrets or break account access.
  }
}

export async function registerLoginDevice(input: {
  userId: string;
  deviceToken: string;
  userAgent?: string | null;
  ip?: string | null;
  region?: string | null;
  isPaidMember: boolean;
  isAdmin: boolean;
}): Promise<LoginDeviceRegistration> {
  if (!input.isPaidMember && !input.isAdmin) return { ok: true, reason: "SKIPPED" };
  if (!prisma) return { ok: false, reason: "SETUP_REQUIRED" };

  const deviceIdHash = hashDeviceToken(input.deviceToken);
  const device = describeDevice(input.userAgent);
  const lastIpHash = hashNetworkSignal(input.ip);

  try {
    const existing = await prisma.trustedDevice.findUnique({
      where: { userId_deviceIdHash: { userId: input.userId, deviceIdHash } },
    });

    if (existing && !existing.revokedAt) {
      await prisma.trustedDevice.update({
        where: { id: existing.id },
        data: {
          displayName: device.displayName,
          userAgentFamily: device.browserFamily,
          platformFamily: device.platformFamily,
          lastSeenAt: new Date(),
          lastIpHash,
          lastRegion: input.region ?? existing.lastRegion,
          verifiedAt: existing.verifiedAt ?? new Date(),
        },
      });
      await recordSecurityEvent({
        userId: input.userId,
        eventType: input.isAdmin ? "ADMIN_DEVICE_LOGIN" : "KNOWN_DEVICE_LOGIN",
        deviceId: existing.id,
      });
      return { ok: true, reason: "KNOWN" };
    }

    if (!input.isAdmin) {
      const activeCount = await prisma.trustedDevice.count({
        where: { userId: input.userId, revokedAt: null },
      });
      if (!canBindTrustedDevice({ activeDeviceCount: activeCount, isAdmin: input.isAdmin })) {
        await recordSecurityEvent({
          userId: input.userId,
          eventType: "DEVICE_LIMIT_BLOCKED",
          detail: { activeCount },
        });
        return { ok: false, reason: "DEVICE_LIMIT" };
      }
    }

    const created = existing
      ? await prisma.trustedDevice.update({
          where: { id: existing.id },
          data: {
            revokedAt: null,
            verifiedAt: new Date(),
            displayName: device.displayName,
            userAgentFamily: device.browserFamily,
            platformFamily: device.platformFamily,
            lastSeenAt: new Date(),
            lastIpHash,
            lastRegion: input.region ?? null,
          },
        })
      : await prisma.trustedDevice.create({
          data: {
            userId: input.userId,
            deviceIdHash,
            displayName: device.displayName,
            userAgentFamily: device.browserFamily,
            platformFamily: device.platformFamily,
            verifiedAt: new Date(),
            lastIpHash,
            lastRegion: input.region ?? null,
          },
        });

    await recordSecurityEvent({
      userId: input.userId,
      eventType: input.isAdmin ? "ADMIN_DEVICE_BOUND" : "DEVICE_BOUND",
      deviceId: created.id,
    });
    return { ok: true, reason: "BOUND" };
  } catch (error) {
    if (isMissingDeviceSchema(error)) return { ok: false, reason: "SETUP_REQUIRED" };
    throw error;
  }
}

async function ensureTrustedDevice(input: {
  userId: string;
  deviceToken: string;
  userAgent?: string | null;
  ip?: string | null;
  region?: string | null;
  isAdmin: boolean;
}): Promise<{ id: string; displayName: string } | DeviceAccessDecision> {
  if (!prisma) return { allowed: false, reason: "SETUP_REQUIRED" };
  const deviceIdHash = hashDeviceToken(input.deviceToken);
  const found = await prisma.trustedDevice.findUnique({
    where: { userId_deviceIdHash: { userId: input.userId, deviceIdHash } },
  });

  if (found?.revokedAt) return { allowed: false, reason: "DEVICE_REVOKED" };
  if (found) {
    await prisma.trustedDevice.update({
      where: { id: found.id },
      data: {
        lastSeenAt: new Date(),
        lastIpHash: hashNetworkSignal(input.ip),
        lastRegion: input.region ?? found.lastRegion,
      },
    });
    return { id: found.id, displayName: found.displayName };
  }

  const registration = await registerLoginDevice({
    ...input,
    isPaidMember: true,
  });
  if (!registration.ok) {
    return {
      allowed: false,
      reason: registration.reason === "DEVICE_LIMIT" ? "DEVICE_LIMIT" : "SETUP_REQUIRED",
    };
  }

  const created = await prisma.trustedDevice.findUnique({
    where: { userId_deviceIdHash: { userId: input.userId, deviceIdHash } },
  });
  if (!created || created.revokedAt) return { allowed: false, reason: "DEVICE_REVOKED" };
  return { id: created.id, displayName: created.displayName };
}

export async function evaluateMemberDeviceAccess(input: {
  userId: string;
  deviceToken?: string | null;
  userAgent?: string | null;
  ip?: string | null;
  region?: string | null;
  isAdmin: boolean;
  forceAcquire?: boolean;
  now?: Date;
}): Promise<DeviceAccessDecision> {
  const deviceToken = input.deviceToken;
  if (!deviceToken) return { allowed: false, reason: "COOKIE_REQUIRED" };
  if (!prisma) return { allowed: false, reason: "SETUP_REQUIRED" };

  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + MEMBER_LEASE_SECONDS * 1000);
  const deviceIdHash = hashDeviceToken(deviceToken);

  try {
    const trusted = await ensureTrustedDevice({ ...input, deviceToken });
    if ("allowed" in trusted) return trusted;

    if (input.isAdmin) {
      await recordSecurityEvent({
        userId: input.userId,
        eventType: "ADMIN_MEMBER_CONTENT_ACCESS",
        deviceId: trusted.id,
      });
      return {
        allowed: true,
        reason: "ALLOWED",
        deviceId: trusted.id,
        displayName: trusted.displayName,
        expiresAt: expiresAt.toISOString(),
      };
    }

    const lease = await prisma.memberAccessLease.findUnique({ where: { userId: input.userId } });
    const policy = decideMemberLease({
      leaseDeviceIdHash: lease?.deviceIdHash,
      leaseExpiresAtMs: lease?.expiresAt.getTime(),
      currentDeviceIdHash: deviceIdHash,
      nowMs: now.getTime(),
      forceAcquire: input.forceAcquire,
    });
    const sameDevice = lease?.deviceIdHash === deviceIdHash;

    if (policy !== "BLOCK") {
      const switching = Boolean(lease && !sameDevice);
      await prisma.memberAccessLease.upsert({
        where: { userId: input.userId },
        create: {
          userId: input.userId,
          deviceIdHash,
          acquiredAt: now,
          heartbeatAt: now,
          expiresAt,
          switchCount: 0,
        },
        update: {
          deviceIdHash,
          acquiredAt: switching ? now : lease?.acquiredAt ?? now,
          heartbeatAt: now,
          expiresAt,
          switchCount: switching ? { increment: 1 } : undefined,
        },
      });
      if (switching) {
        await recordSecurityEvent({
          userId: input.userId,
          eventType: input.forceAcquire ? "LEASE_FORCE_SWITCH" : "LEASE_EXPIRED_SWITCH",
          deviceId: trusted.id,
        });
      }
      return {
        allowed: true,
        reason: "ALLOWED",
        deviceId: trusted.id,
        displayName: trusted.displayName,
        expiresAt: expiresAt.toISOString(),
      };
    }

    if (!lease) return { allowed: false, reason: "SETUP_REQUIRED" };

    const other = await prisma.trustedDevice.findUnique({
      where: { userId_deviceIdHash: { userId: input.userId, deviceIdHash: lease.deviceIdHash } },
      select: { displayName: true },
    });
    await recordSecurityEvent({
      userId: input.userId,
      eventType: "LEASE_CONTENTION",
      deviceId: trusted.id,
    });
    return {
      allowed: false,
      reason: "ACTIVE_ELSEWHERE",
      deviceId: trusted.id,
      displayName: trusted.displayName,
      activeElsewhereName: other?.displayName ?? "另一台设备",
      expiresAt: lease.expiresAt.toISOString(),
    };
  } catch (error) {
    if (isMissingDeviceSchema(error)) return { allowed: false, reason: "SETUP_REQUIRED" };
    throw error;
  }
}

export async function listUserDevices(input: {
  userId: string;
  deviceToken?: string | null;
}): Promise<{ setupRequired: boolean; devices: DeviceListItem[]; activeDeviceHash: string | null }> {
  if (!prisma) return { setupRequired: true, devices: [], activeDeviceHash: null };
  const currentHash = input.deviceToken ? hashDeviceToken(input.deviceToken) : null;
  try {
    const [devices, lease] = await Promise.all([
      prisma.trustedDevice.findMany({
        where: { userId: input.userId },
        orderBy: [{ revokedAt: "asc" }, { lastSeenAt: "desc" }],
      }),
      prisma.memberAccessLease.findUnique({ where: { userId: input.userId } }),
    ]);
    return {
      setupRequired: false,
      activeDeviceHash: lease?.deviceIdHash ?? null,
      devices: devices.map((device) => ({
        id: device.id,
        displayName: device.displayName,
        current: Boolean(currentHash && currentHash === device.deviceIdHash),
        verified: Boolean(device.verifiedAt),
        revoked: Boolean(device.revokedAt),
        createdAt: device.createdAt.toISOString(),
        lastSeenAt: device.lastSeenAt.toISOString(),
        lastRegion: device.lastRegion,
      })),
    };
  } catch (error) {
    if (isMissingDeviceSchema(error)) return { setupRequired: true, devices: [], activeDeviceHash: null };
    throw error;
  }
}

export async function revokeUserDevice(input: {
  userId: string;
  deviceId: string;
  actorUserId?: string | null;
}): Promise<boolean> {
  if (!prisma) return false;
  try {
    const device = await prisma.trustedDevice.findFirst({
      where: { id: input.deviceId, userId: input.userId, revokedAt: null },
    });
    if (!device) return false;
    await prisma.$transaction([
      prisma.trustedDevice.update({ where: { id: device.id }, data: { revokedAt: new Date() } }),
      prisma.memberAccessLease.deleteMany({
        where: { userId: input.userId, deviceIdHash: device.deviceIdHash },
      }),
    ]);
    await recordSecurityEvent({
      userId: input.userId,
      eventType: input.actorUserId && input.actorUserId !== input.userId ? "ADMIN_DEVICE_REVOKED" : "DEVICE_REVOKED",
      deviceId: device.id,
      actorUserId: input.actorUserId ?? input.userId,
    });
    return true;
  } catch (error) {
    if (isMissingDeviceSchema(error)) return false;
    throw error;
  }
}

export async function logoutOtherDevices(input: {
  userId: string;
  currentDeviceToken?: string | null;
  actorUserId?: string | null;
}): Promise<number> {
  if (!prisma) return 0;
  const currentHash = input.currentDeviceToken ? hashDeviceToken(input.currentDeviceToken) : null;
  try {
    const result = await prisma.trustedDevice.updateMany({
      where: {
        userId: input.userId,
        revokedAt: null,
        ...(currentHash ? { deviceIdHash: { not: currentHash } } : {}),
      },
      data: { revokedAt: new Date() },
    });
    await prisma.memberAccessLease.deleteMany({
      where: {
        userId: input.userId,
        ...(currentHash ? { deviceIdHash: { not: currentHash } } : {}),
      },
    });
    await recordSecurityEvent({
      userId: input.userId,
      eventType: input.actorUserId && input.actorUserId !== input.userId ? "ADMIN_LOGOUT_ALL_DEVICES" : "LOGOUT_OTHER_DEVICES",
      actorUserId: input.actorUserId ?? input.userId,
      detail: { count: result.count },
    });
    return result.count;
  } catch (error) {
    if (isMissingDeviceSchema(error)) return 0;
    throw error;
  }
}

export async function clearMemberLease(input: {
  userId: string;
  actorUserId?: string | null;
}): Promise<void> {
  if (!prisma) return;
  try {
    await prisma.memberAccessLease.deleteMany({ where: { userId: input.userId } });
    await recordSecurityEvent({
      userId: input.userId,
      eventType: "MEMBER_LEASE_CLEARED",
      actorUserId: input.actorUserId ?? input.userId,
    });
  } catch {
    // Safe no-op before the migration is deployed.
  }
}

export async function listSecurityEvents(input: {
  userId?: string;
  limit?: number;
}): Promise<Array<{
  id: string;
  userId: string;
  eventType: string;
  actorUserId: string | null;
  createdAt: string;
  detail: unknown;
}>> {
  if (!prisma) return [];
  try {
    const rows = await prisma.securityEvent.findMany({
      where: input.userId ? { userId: input.userId } : undefined,
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(input.limit ?? 50, 1), 200),
    });
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      eventType: row.eventType,
      actorUserId: row.actorUserId,
      createdAt: row.createdAt.toISOString(),
      detail: row.detail,
    }));
  } catch {
    return [];
  }
}
