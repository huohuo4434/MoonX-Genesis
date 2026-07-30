/**
 * Unified prediction access (Asia/Shanghai).
 * Today: LOGIN → ADMIN → ACTIVE_MEMBER → after 08:00 → WAIT_UNTIL_08
 * Tomorrow / Weekly: LOGIN → ADMIN → ACTIVE_MEMBER → MEMBERSHIP_REQUIRED
 * 08:00 is access gate only — does not generate or copy forecasts.
 */

import { isAdminUser } from "@/lib/auth/is-admin";
import { getBeijingClock } from "@/lib/calendar/publish-windows";

export type PredictionAccessUser = {
  email?: string | null;
  role?: string | null;
  isAdmin?: boolean | null;
  membershipExpiresAt?: Date | string | null;
  membershipStatus?: string | null;
};

export type TodayPredictionAccess =
  | {
      allowed: true;
      reason: "ADMIN" | "ACTIVE_MEMBER" | "REGISTERED_AFTER_RELEASE";
    }
  | {
      allowed: false;
      reason: "LOGIN_REQUIRED" | "WAIT_UNTIL_08";
    };

export type MemberPredictionAccess =
  | {
      allowed: true;
      reason: "ADMIN" | "ACTIVE_MEMBER";
    }
  | {
      allowed: false;
      reason: "LOGIN_REQUIRED" | "MEMBERSHIP_REQUIRED";
    };

/** @deprecated alias — prefer PredictionAccessUser */
export type TodayPredictionAccessUser = PredictionAccessUser;

/** China is permanently UTC+8 — use Asia/Shanghai clock, never server local TZ. */
export function hasReachedChinaReleaseTime(now = new Date()): boolean {
  const clock = getBeijingClock(now);
  return clock.totalMinutes >= 8 * 60;
}

/**
 * Active membership: if an expiry timestamp exists, it is the source of truth
 * (expired members with a stale "active" status must not pass).
 * Without expiry, fall back to membershipStatus === active.
 */
export function isActiveMembershipForPredictionAccess(
  user: PredictionAccessUser,
  now = new Date()
): boolean {
  const expiry = user.membershipExpiresAt ? new Date(user.membershipExpiresAt) : null;
  const hasValidExpiry = expiry instanceof Date && !Number.isNaN(expiry.getTime());

  if (hasValidExpiry) {
    return expiry!.getTime() > now.getTime();
  }

  const status = String(user.membershipStatus ?? "").trim().toUpperCase();
  return status === "ACTIVE";
}

/** @deprecated alias */
export const isActiveMembershipForTodayAccess = isActiveMembershipForPredictionAccess;

export function checkTodayPredictionAccess({
  user,
  now = new Date(),
}: {
  user: PredictionAccessUser | null | undefined;
  now?: Date;
}): TodayPredictionAccess {
  if (!user) {
    return { allowed: false, reason: "LOGIN_REQUIRED" };
  }

  if (isAdminUser(user)) {
    return { allowed: true, reason: "ADMIN" };
  }

  if (isActiveMembershipForPredictionAccess(user, now)) {
    return { allowed: true, reason: "ACTIVE_MEMBER" };
  }

  if (hasReachedChinaReleaseTime(now)) {
    return { allowed: true, reason: "REGISTERED_AFTER_RELEASE" };
  }

  return { allowed: false, reason: "WAIT_UNTIL_08" };
}

export function checkTomorrowPredictionAccess({
  user,
  now = new Date(),
}: {
  user: PredictionAccessUser | null | undefined;
  now?: Date;
}): MemberPredictionAccess {
  if (!user) {
    return { allowed: false, reason: "LOGIN_REQUIRED" };
  }

  if (isAdminUser(user)) {
    return { allowed: true, reason: "ADMIN" };
  }

  if (isActiveMembershipForPredictionAccess(user, now)) {
    return { allowed: true, reason: "ACTIVE_MEMBER" };
  }

  return { allowed: false, reason: "MEMBERSHIP_REQUIRED" };
}

export function checkWeeklyPredictionAccess({
  user,
  now = new Date(),
}: {
  user: PredictionAccessUser | null | undefined;
  now?: Date;
}): MemberPredictionAccess {
  return checkTomorrowPredictionAccess({ user, now });
}

export const TODAY_PREDICTION_MESSAGES = {
  LOGIN_REQUIRED: "登录后可查看今日预测",
  WAIT_UNTIL_08: "普通用户每日北京时间08:00开放今日预测",
} as const;

export const TOMORROW_PREDICTION_MESSAGES = {
  LOGIN_REQUIRED: "登录后可查看明日观点",
  MEMBERSHIP_REQUIRED: "明日观点为会员专享，开通会员后即可查看",
} as const;

export const WEEKLY_PREDICTION_MESSAGES = {
  LOGIN_REQUIRED: "登录后可查看本周行情",
  MEMBERSHIP_REQUIRED: "本周行情为会员专享，开通会员后即可查看",
} as const;
