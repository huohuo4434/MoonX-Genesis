/**
 * Single extend-only membership grant path.
 * Always: max(existingExpiry, computedExpiry); never silent overwrite.
 */
import "server-only";

import {
  computeNewExpiry,
  PLAN_DAYS,
  updateUserAppMetadata,
  type MembershipPlan,
} from "@/lib/auth/permissions";
import {
  appendMembershipEvent,
  hasMembershipEventForSource,
  type MembershipEventType,
} from "@/lib/auth/membership-events";
import { daysBetweenIso, laterExpiryIso } from "@/lib/payments/membership-dates";
import { getAdminClient } from "@/lib/supabase/admin";

export { laterExpiryIso, daysBetweenIso } from "@/lib/payments/membership-dates";

// Note: computeNewExpiry lives in membership-dates (imported via permissions re-export).

async function syncProfileMembership(input: {
  userId: string;
  email: string;
  membershipStatus: "active" | "inactive" | "expired";
  membershipExpiresAt: string | null;
  membershipPlan?: MembershipPlan | null;
}): Promise<void> {
  const admin = getAdminClient();
  if (!admin) return;
  try {
    await admin.from("profiles").upsert(
      {
        id: input.userId,
        email: input.email.toLowerCase(),
        membership_status: input.membershipStatus,
        membership_expires_at: input.membershipExpiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  } catch {
    /* profiles optional / schema drift */
  }
}

export type GrantMembershipResult =
  | {
      applied: true;
      previousExpiresAt: string | null;
      newExpiresAt: string | null;
      daysChanged: number;
      skipped?: undefined;
    }
  | {
      applied: false;
      previousExpiresAt: string | null;
      newExpiresAt: string | null;
      daysChanged: number;
      skipped: string;
    };

/**
 * Extend membership by `days` from max(now, existing future expiry).
 * Idempotent when sourceId was already recorded for eventType.
 * Final write is always laterExpiry(existing, computed) — never shortens.
 */
export async function grantMembershipDays(input: {
  userId: string;
  days: number;
  eventType: MembershipEventType;
  source: string;
  sourceId: string;
  operatorId?: string | null;
  note?: string | null;
  plan?: MembershipPlan | null;
  now?: Date;
}): Promise<GrantMembershipResult> {
  const now = input.now ?? new Date();
  const admin = getAdminClient();
  if (!admin) throw new Error("服务未配置");

  if (input.sourceId && (await hasMembershipEventForSource(input.eventType, input.sourceId))) {
    const { data } = await admin.auth.admin.getUserById(input.userId);
    const prev =
      (data.user?.app_metadata as { membership_expires_at?: string } | undefined)
        ?.membership_expires_at ?? null;
    return {
      applied: false,
      previousExpiresAt: prev,
      newExpiresAt: prev,
      daysChanged: 0,
      skipped: "already_applied",
    };
  }

  const { data, error } = await admin.auth.admin.getUserById(input.userId);
  if (error || !data.user) throw new Error("用户不存在");

  const email = (data.user.email ?? "").toLowerCase();
  const meta = (data.user.app_metadata ?? {}) as {
    membership_expires_at?: string | null;
    membership_started_at?: string | null;
    membership_plan?: MembershipPlan | null;
    role?: string;
  };

  if (meta.role === "admin") {
    return {
      applied: false,
      previousExpiresAt: meta.membership_expires_at ?? null,
      newExpiresAt: meta.membership_expires_at ?? null,
      daysChanged: 0,
      skipped: "admin_account",
    };
  }

  const previousExpiresAt = meta.membership_expires_at ?? null;
  const computed = computeNewExpiry(previousExpiresAt, input.days, now);
  const newExpiresAt = laterExpiryIso(previousExpiresAt, computed) ?? computed;
  const daysChanged = daysBetweenIso(previousExpiresAt, newExpiresAt);

  // Never shorten even if caller passes bad days.
  if (
    previousExpiresAt &&
    new Date(newExpiresAt).getTime() < new Date(previousExpiresAt).getTime()
  ) {
    await appendMembershipEvent({
      userId: input.userId,
      userEmail: email,
      eventType: input.eventType,
      source: input.source,
      sourceId: input.sourceId || `noop_${Date.now()}`,
      previousExpiresAt,
      newExpiresAt: previousExpiresAt,
      daysChanged: 0,
      operatorId: input.operatorId ?? null,
      note: input.note ?? "blocked_shorten",
    });
    return {
      applied: false,
      previousExpiresAt,
      newExpiresAt: previousExpiresAt,
      daysChanged: 0,
      skipped: "would_shorten",
    };
  }

  await updateUserAppMetadata(input.userId, {
    membership_status: "active",
    membership_plan: input.plan ?? meta.membership_plan ?? null,
    membership_started_at: meta.membership_started_at ?? now.toISOString(),
    membership_expires_at: newExpiresAt,
  });

  await syncProfileMembership({
    userId: input.userId,
    email,
    membershipStatus: "active",
    membershipExpiresAt: newExpiresAt,
    membershipPlan: input.plan ?? meta.membership_plan ?? null,
  });

  await appendMembershipEvent({
    userId: input.userId,
    userEmail: email,
    eventType: input.eventType,
    source: input.source,
    sourceId: input.sourceId,
    previousExpiresAt,
    newExpiresAt,
    daysChanged: daysChanged || input.days,
    operatorId: input.operatorId ?? null,
    note: input.note ?? null,
  });

  return {
    applied: true,
    previousExpiresAt,
    newExpiresAt,
    daysChanged: daysChanged || input.days,
  };
}

export async function grantMembershipFromPlan(input: {
  userId: string;
  plan: MembershipPlan;
  eventType: MembershipEventType;
  source: string;
  sourceId: string;
  operatorId?: string | null;
  note?: string | null;
  now?: Date;
}): Promise<GrantMembershipResult> {
  return grantMembershipDays({
    ...input,
    days: PLAN_DAYS[input.plan],
    plan: input.plan,
  });
}

export async function revokeMembership(input: {
  userId: string;
  sourceId: string;
  operatorId?: string | null;
  note?: string | null;
  mode: "suspend" | "cancel";
}): Promise<GrantMembershipResult> {
  const admin = getAdminClient();
  if (!admin) throw new Error("服务未配置");

  if (await hasMembershipEventForSource("REVOCATION", input.sourceId)) {
    return {
      applied: false,
      previousExpiresAt: null,
      newExpiresAt: null,
      daysChanged: 0,
      skipped: "already_applied",
    };
  }

  const { data, error } = await admin.auth.admin.getUserById(input.userId);
  if (error || !data.user) throw new Error("用户不存在");
  const email = (data.user.email ?? "").toLowerCase();
  const prev =
    (data.user.app_metadata as { membership_expires_at?: string } | undefined)
      ?.membership_expires_at ?? null;

  await updateUserAppMetadata(input.userId, {
    role: "user",
    membership_status: input.mode === "suspend" ? "expired" : "inactive",
    membership_plan: null,
    membership_expires_at: null,
    pending_payment: null,
  });

  await syncProfileMembership({
    userId: input.userId,
    email,
    membershipStatus: input.mode === "suspend" ? "expired" : "inactive",
    membershipExpiresAt: null,
  });

  await appendMembershipEvent({
    userId: input.userId,
    userEmail: email,
    eventType: "REVOCATION",
    source: "admin",
    sourceId: input.sourceId,
    previousExpiresAt: prev,
    newExpiresAt: null,
    daysChanged: daysBetweenIso(prev, null),
    operatorId: input.operatorId ?? null,
    note: input.note ?? input.mode,
  });

  return {
    applied: true,
    previousExpiresAt: prev,
    newExpiresAt: null,
    daysChanged: 0,
  };
}
