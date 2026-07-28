import "server-only";

import {
  computeNewExpiry,
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

export { REFERRAL_REWARD_DAYS };

function siteBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://moon-x-genesis.vercel.app"
  ).replace(/\/$/, "");
}

export async function getOrCreateMyInvite(user: AuthUserView) {
  const invite = await ensureReferralInvite(user.id, user.app_metadata.referral_code ?? undefined);
  if (user.app_metadata.referral_code !== invite.invite_code) {
    await updateUserAppMetadata(user.id, { referral_code: invite.invite_code });
  }
  const stats = await getReferralStats(user.id);
  return {
    inviteCode: invite.invite_code,
    inviteLink: `${siteBaseUrl()}/register?ref=${invite.invite_code}`,
    successCount: stats.successCount,
    rewardDaysTotal: stats.rewardDaysTotal,
    pendingCount: stats.pendingCount,
    rewardDaysPerSuccess: REFERRAL_REWARD_DAYS,
  };
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

  const days = pending.reward_days || REFERRAL_REWARD_DAYS;
  const inviterExpiresAt = computeNewExpiry(inviter.app_metadata.membership_expires_at, days);
  await updateUserAppMetadata(inviter.id, {
    membership_status: "active",
    membership_started_at:
      inviter.app_metadata.membership_started_at ?? new Date().toISOString(),
    membership_expires_at: inviterExpiresAt,
  });

  const inviteeBonusExpiresAt = computeNewExpiry(
    invitee.app_metadata.membership_expires_at,
    days
  );
  await updateUserAppMetadata(invitee.id, {
    membership_status: "active",
    membership_expires_at: inviteeBonusExpiresAt,
  });

  const gate = await finalizeReferralReward(input);
  if (!gate.applied) {
    return { applied: false, skipped: gate.skipped, record: gate.record };
  }

  return {
    applied: true,
    inviterExpiresAt,
    inviteeBonusExpiresAt,
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
