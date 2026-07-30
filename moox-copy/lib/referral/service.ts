import "server-only";

import { grantMembershipDays } from "@/lib/auth/grant-membership";
import {
  listAllAuthUsers,
  updateUserAppMetadata,
  type AuthUserView,
} from "@/lib/auth/permissions";
import {
  REFERRAL_REWARD_DAYS,
  bindReferralOnRegister,
  ensureReferralInvite,
  finalizeReferralReward,
  findPendingReferralForInvitee,
  getInviteByCode,
  getReferralStats,
  listAllReferralRecordsAdmin,
  listReferralRecords,
  normalizeInviteCode,
  type ReferralRecord,
} from "@/lib/referral/store";
import { siteBaseUrl } from "@/lib/referral/site-url";
import { isActiveMembershipForPredictionAccess } from "@/lib/prediction-access";
import { isAdminUser } from "@/lib/auth/is-admin";

export { REFERRAL_REWARD_DAYS, siteBaseUrl };

/** Production site URL — never fall back to localhost. */
// siteBaseUrl imported from ./site-url

function canGenerateReferral(user: AuthUserView, now = new Date()): boolean {
  if (isAdminUser({ email: user.email, role: user.app_metadata.role })) return true;
  return isActiveMembershipForPredictionAccess(
    {
      email: user.email,
      role: user.app_metadata.role,
      membershipExpiresAt: user.app_metadata.membership_expires_at,
      membershipStatus: user.app_metadata.membership_status,
    },
    now
  );
}

export type MyInviteResult =
  | {
      ok: true;
      referralCode: string;
      referralUrl: string;
      successfulInvites: number;
      rewardDays: number;
      /** Legacy aliases for existing UI */
      inviteCode: string;
      inviteLink: string;
      successCount: number;
      rewardDaysTotal: number;
      pendingCount: number;
      rewardDaysPerSuccess: number;
    }
  | {
      ok: false;
      error: "MEMBERSHIP_REQUIRED" | "INVITE_CREATE_FAILED";
      message: string;
    };

export async function getOrCreateMyInvite(
  user: AuthUserView,
  opts?: { requestOrigin?: string | null; now?: Date }
): Promise<MyInviteResult> {
  if (!canGenerateReferral(user, opts?.now)) {
    return {
      ok: false,
      error: "MEMBERSHIP_REQUIRED",
      message: "开通会员后获得邀请链接",
    };
  }

  try {
    const invite = await ensureReferralInvite(
      user.id,
      user.app_metadata.referral_code ?? undefined
    );
    if (user.app_metadata.referral_code !== invite.invite_code) {
      await updateUserAppMetadata(user.id, { referral_code: invite.invite_code });
    }
    const stats = await getReferralStats(user.id);
    const referralUrl = `${siteBaseUrl(opts?.requestOrigin)}/register?ref=${invite.invite_code}`;
    return {
      ok: true,
      referralCode: invite.invite_code,
      referralUrl,
      successfulInvites: stats.successCount,
      rewardDays: stats.rewardDaysTotal,
      inviteCode: invite.invite_code,
      inviteLink: referralUrl,
      successCount: stats.successCount,
      rewardDaysTotal: stats.rewardDaysTotal,
      pendingCount: stats.pendingCount,
      rewardDaysPerSuccess: REFERRAL_REWARD_DAYS,
    };
  } catch (err) {
    return {
      ok: false,
      error: "INVITE_CREATE_FAILED",
      message: err instanceof Error ? err.message : "邀请码生成失败",
    };
  }
}

export async function attachInviteOnRegister(input: {
  inviteeId: string;
  inviteeEmail: string;
  inviteCode?: string | null;
  deviceId?: string | null;
}): Promise<{ ok: boolean; error?: string; flagged?: boolean }> {
  const code = input.inviteCode ? normalizeInviteCode(input.inviteCode) : "";
  if (!code) return { ok: true };

  const invite = await getInviteByCode(code);
  if (!invite) return { ok: false, error: "邀请码无效" };

  const users = await listAllAuthUsers();
  const inviter = users.find((u) => u.id === invite.inviter_id);
  if (!inviter) return { ok: false, error: "邀请码无效" };

  if (inviter.email.toLowerCase() === input.inviteeEmail.trim().toLowerCase()) {
    return { ok: false, error: "不能使用自己的邀请码" };
  }

  const bound = await bindReferralOnRegister({
    inviterId: invite.inviter_id,
    inviteeId: input.inviteeId,
    inviteeEmail: input.inviteeEmail,
    inviterEmail: inviter.email,
    deviceId: input.deviceId,
  });

  if (!bound.ok) return { ok: false, error: bound.error };

  await updateUserAppMetadata(input.inviteeId, {
    referred_by_code: invite.invite_code,
    referred_by_user_id: invite.inviter_id,
  });

  return { ok: true, flagged: bound.record?.status === "flagged" };
}

export async function processReferralRewardAfterPayment(input: {
  inviteeId: string;
  paymentId: string;
}): Promise<{
  applied: boolean;
  skipped?: string;
  inviterExpiresAt?: string;
  inviteeBonusExpiresAt?: string;
  record?: ReferralRecord;
}> {
  const pending = await findPendingReferralForInvitee(input.inviteeId);
  if (!pending) return { applied: false, skipped: "无邀请关系" };
  if (pending.status === "success") return { applied: false, skipped: "已发放奖励", record: pending };
  if (pending.status === "flagged") {
    return {
      applied: false,
      skipped: pending.flagged_reason ?? "邀请关系已标记异常",
      record: pending,
    };
  }

  const users = await listAllAuthUsers();
  const inviter = users.find((u) => u.id === pending.inviter_id);
  const invitee = users.find((u) => u.id === pending.invitee_id);
  if (!inviter || !invitee) {
    return { applied: false, skipped: "用户不存在", record: pending };
  }
  if (inviter.email.toLowerCase() === invitee.email.toLowerCase()) {
    return { applied: false, skipped: "不能邀请自己", record: pending };
  }

  // Finalize first so reward cannot double-apply if membership grant partially fails mid-way.
  const gate = await finalizeReferralReward(input);
  if (!gate.applied) {
    return { applied: false, skipped: gate.skipped, record: gate.record };
  }

  const days = pending.reward_days || REFERRAL_REWARD_DAYS;
  const recordId = gate.record?.id ?? pending.id;

  const inviterGrant = await grantMembershipDays({
    userId: inviter.id,
    days,
    eventType: "REFERRAL_REWARD",
    source: "referral",
    sourceId: `referral_inviter_${recordId}`,
    note: `invitee_payment=${input.paymentId}`,
  });

  const inviteeGrant = await grantMembershipDays({
    userId: invitee.id,
    days,
    eventType: "REFERRAL_REWARD",
    source: "referral",
    sourceId: `referral_invitee_${recordId}`,
    note: `invitee_payment=${input.paymentId}`,
  });

  return {
    applied: true,
    inviterExpiresAt: inviterGrant.newExpiresAt ?? undefined,
    inviteeBonusExpiresAt: inviteeGrant.newExpiresAt ?? undefined,
    record: gate.record,
  };
}

export async function getAdminReferralRows() {
  const records = await listAllReferralRecordsAdmin();
  const users = await listAllAuthUsers();
  const byId = new Map(users.map((u) => [u.id, u]));
  return records.map((r) => {
    const inviter = byId.get(r.inviter_id);
    const invitee = byId.get(r.invitee_id);
    return {
      id: r.id,
      inviterEmail: r.inviter_email ?? inviter?.email ?? r.inviter_id,
      inviteeEmail: r.invitee_email ?? invitee?.email ?? r.invitee_id,
      paymentId: r.payment_id,
      paymentStatus: r.status === "success" ? "approved" : r.payment_id ? "linked" : "pending_payment",
      status: r.status,
      rewardDays: r.reward_days,
      flaggedReason: r.flagged_reason,
      createdAt: r.created_at,
    };
  });
}

export async function listMyReferralRecords(userId: string) {
  return listReferralRecords({ inviterId: userId });
}

/** Backfill invite codes for active members/admins who lack one. Never overwrite existing codes. */
export async function backfillReferralCodesForActiveMembers(): Promise<{
  scanned: number;
  created: number;
  skipped: number;
  errors: string[];
}> {
  const users = await listAllAuthUsers();
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];
  for (const user of users) {
    if (!canGenerateReferral(user)) {
      skipped += 1;
      continue;
    }
    try {
      const before = user.app_metadata.referral_code;
      const invite = await ensureReferralInvite(user.id, before ?? undefined);
      if (!before || before !== invite.invite_code) {
        await updateUserAppMetadata(user.id, { referral_code: invite.invite_code });
        if (!before) created += 1;
        else skipped += 1;
      } else {
        skipped += 1;
      }
    } catch (err) {
      errors.push(`${user.email}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { scanned: users.length, created, skipped, errors };
}
