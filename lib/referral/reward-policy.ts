export const REFERRAL_INVITER_REWARD_DAYS = 30;
export const REFERRAL_INVITEE_REWARD_DAYS = 7;

export type ReferralGrantRole = "INVITER" | "INVITEE";

export type FixedMembershipRewardPlan = {
  userId: string;
  days: number;
  previousExpiresAt: string | null;
  targetExpiresAt: string | null;
  skipReason?: "admin_account";
};

export type ReferralRewardDeliveryPlan = {
  inviter: FixedMembershipRewardPlan;
  invitee: FixedMembershipRewardPlan;
};

export function referralRewardDaysFor(role: ReferralGrantRole): number {
  return role === "INVITER" ? REFERRAL_INVITER_REWARD_DAYS : REFERRAL_INVITEE_REWARD_DAYS;
}

export function fixedMembershipExpiry(current: string | null, target: string): string {
  const targetMs = new Date(target).getTime();
  if (!Number.isFinite(targetMs)) throw new Error("REFERRAL_REWARD_TARGET_INVALID");
  if (!current) return target;
  const currentMs = new Date(current).getTime();
  if (!Number.isFinite(currentMs)) return target;
  return currentMs >= targetMs ? current : target;
}

function isFixedMembershipRewardPlan(value: unknown): value is FixedMembershipRewardPlan {
  if (!value || typeof value !== "object") return false;
  const plan = value as Partial<FixedMembershipRewardPlan>;
  if (typeof plan.userId !== "string" || !plan.userId) return false;
  if (!Number.isInteger(plan.days) || (plan.days !== 7 && plan.days !== 30)) {
    return false;
  }
  if (plan.previousExpiresAt !== null && typeof plan.previousExpiresAt !== "string") return false;
  if (plan.targetExpiresAt !== null && typeof plan.targetExpiresAt !== "string") return false;
  if (plan.skipReason !== undefined && plan.skipReason !== "admin_account") return false;
  if (plan.skipReason === "admin_account") return true;
  return Boolean(plan.targetExpiresAt && Number.isFinite(new Date(plan.targetExpiresAt).getTime()));
}

export function isReferralRewardDeliveryPlan(value: unknown): value is ReferralRewardDeliveryPlan {
  if (!value || typeof value !== "object") return false;
  const plan = value as Partial<ReferralRewardDeliveryPlan>;
  return (
    isFixedMembershipRewardPlan(plan.inviter) &&
    isFixedMembershipRewardPlan(plan.invitee) &&
    plan.inviter.days === REFERRAL_INVITER_REWARD_DAYS &&
    plan.invitee.days === REFERRAL_INVITEE_REWARD_DAYS
  );
}

export async function grantReferralMembershipPair<T>(input: {
  inviterId: string;
  inviteeId: string;
  recordId: string;
  paymentId: string;
  grant: (grant: {
    userId: string;
    days: number;
    sourceId: string;
    note: string;
  }) => Promise<T>;
}): Promise<{ inviter: T; invitee: T }> {
  const inviter = await input.grant({
    userId: input.inviterId,
    days: REFERRAL_INVITER_REWARD_DAYS,
    sourceId: `referral_inviter_${input.recordId}`,
    note: `invitee_payment=${input.paymentId};reward_role=inviter`,
  });
  const invitee = await input.grant({
    userId: input.inviteeId,
    days: REFERRAL_INVITEE_REWARD_DAYS,
    sourceId: `referral_invitee_${input.recordId}`,
    note: `invitee_payment=${input.paymentId};reward_role=invitee`,
  });
  return { inviter, invitee };
}

export async function runReferralRewardDelivery<TGrant, TRecord extends { id: string; payment_id: string | null; reward_delivery_plan?: ReferralRewardDeliveryPlan | null }>(input: {
  inviterId: string;
  inviteeId: string;
  paymentId: string;
  ownerToken: string;
  claim: (ownerToken: string) => Promise<{ claimed: boolean; skipped?: string; record?: TRecord }>;
  prepare: () => Promise<ReferralRewardDeliveryPlan>;
  persistPlan: (recordId: string, ownerToken: string, plan: ReferralRewardDeliveryPlan) => Promise<TRecord>;
  apply: (grant: { plan: FixedMembershipRewardPlan; sourceId: string; note: string }) => Promise<TGrant>;
  complete: (recordId: string, ownerToken: string) => Promise<TRecord>;
}): Promise<
  | { applied: false; skipped?: string; record?: TRecord }
  | { applied: true; record: TRecord; inviter: TGrant; invitee: TGrant }
> {
  const claim = await input.claim(input.ownerToken);
  if (!claim.claimed || !claim.record) {
    return { applied: false, skipped: claim.skipped, record: claim.record };
  }
  if (!claim.record.payment_id || claim.record.payment_id !== input.paymentId) {
    throw new Error("REFERRAL_PAYMENT_ID_MISMATCH");
  }
  let record = claim.record;
  let plan = record.reward_delivery_plan ?? null;
  if (!plan) {
    plan = await input.prepare();
    record = await input.persistPlan(record.id, input.ownerToken, plan);
    plan = record.reward_delivery_plan ?? plan;
  }
  if (
    !isReferralRewardDeliveryPlan(plan) ||
    plan.inviter.userId !== input.inviterId ||
    plan.invitee.userId !== input.inviteeId
  ) {
    throw new Error("REFERRAL_REWARD_PLAN_IDENTITY_MISMATCH");
  }
  const inviter = await input.apply({
    plan: plan.inviter,
    sourceId: `referral_inviter_${record.id}`,
    note: `invitee_payment=${record.payment_id};reward_role=inviter;fixed_target=${plan.inviter.targetExpiresAt ?? "admin"}`,
  });
  const invitee = await input.apply({
    plan: plan.invitee,
    sourceId: `referral_invitee_${record.id}`,
    note: `invitee_payment=${record.payment_id};reward_role=invitee;fixed_target=${plan.invitee.targetExpiresAt ?? "admin"}`,
  });
  const completed = await input.complete(record.id, input.ownerToken);
  return { applied: true, record: completed, inviter, invitee };
}
