import "server-only";

import {
  PLAN_LABELS,
  updateUserAppMetadata,
  type PaymentHistoryItem,
  type PendingPayment,
} from "@/lib/auth/permissions";
import { grantMembershipFromPlan } from "@/lib/auth/grant-membership";
import { listMembershipEvents } from "@/lib/auth/membership-events";
import { notifyBuyerMembershipActivated } from "@/lib/email/notifications";
import { wasOrderAlreadyFulfilledByManualMembership } from "@/lib/payments/manual-payment-dedupe";
import { getAdminClient } from "@/lib/supabase/admin";
import { formatDateTimeChina } from "@/lib/utils/datetime";
import type { AutoPaymentOrder } from "@/lib/payments/auto-payment-orders";

function normalizeHash(value: string): string {
  return value.trim().toLowerCase();
}

export async function finalizeAutoPaymentMembership(input: {
  order: AutoPaymentOrder;
  verifiedAt?: Date;
}): Promise<{
  membershipExpiresAt: string | null;
  grantApplied: boolean;
  grantSkipped: string | null;
  referralReward: { applied: boolean; skipped?: string } | null;
}> {
  const admin = getAdminClient();
  if (!admin) throw new Error("自动支付服务未配置");
  const { order } = input;
  const verifiedAt = input.verifiedAt ?? new Date();
  const verifiedAtIso = verifiedAt.toISOString();

  const { data, error } = await admin.auth.admin.getUserById(order.userId);
  if (error || !data.user?.email) throw new Error("付款用户不存在");
  const meta = (data.user.app_metadata ?? {}) as {
    pending_payment?: PendingPayment | null;
    payment_history?: PaymentHistoryItem[] | null;
    membership_expires_at?: string | null;
    membership_started_at?: string | null;
    membership_plan?: AutoPaymentOrder["plan"] | null;
    membership_status?: string | null;
    founder_member_rank?: number | null;
    founder_discount_granted_at?: string | null;
  };

  const history = [...(meta.payment_history ?? [])];
  const historyIndex = history.findIndex(
    (item) =>
      item.paymentId === order.id ||
      (order.txHash && normalizeHash(item.tx_hash) === normalizeHash(order.txHash))
  );

  const createdAt = new Date(order.createdAt);
  const currentExpiry = meta.membership_expires_at ? new Date(meta.membership_expires_at) : null;
  const continuityPreserved = Boolean(
    currentExpiry &&
      !Number.isNaN(currentExpiry.getTime()) &&
      !Number.isNaN(createdAt.getTime()) &&
      createdAt.getTime() <= currentExpiry.getTime()
  );
  const grantReferenceTime = continuityPreserved ? createdAt : verifiedAt;

  const expectedManualNote: Record<AutoPaymentOrder["plan"], string> = {
    MONTHLY: "activate_monthly",
    QUARTERLY: "activate_quarterly",
    YEARLY: "activate_yearly",
  };
  const orderCreatedAt = createdAt.getTime();
  const orderManualMatchDeadline = new Date(order.expiresAt).getTime() + 24 * 60 * 60_000;
  const recentEvents = await listMembershipEvents({ userId: order.userId, limit: 100 });
  const matchingManualActivation = recentEvents.find((event) => {
    const eventTime = new Date(event.createdAt).getTime();
    return (
      event.eventType === "ADMIN_ADJUSTMENT" &&
      event.note === expectedManualNote[order.plan] &&
      Boolean(event.newExpiresAt) &&
      Number.isFinite(eventTime) &&
      eventTime >= orderCreatedAt - 5 * 60_000 &&
      eventTime <= orderManualMatchDeadline
    );
  });
  const metadataShowsManualActivation = wasOrderAlreadyFulfilledByManualMembership({
    orderPlan: order.plan,
    orderCreatedAt: order.createdAt,
    verifiedAt: verifiedAtIso,
    membershipPlan: meta.membership_plan,
    membershipStartedAt: meta.membership_started_at,
    membershipExpiresAt: meta.membership_expires_at,
  });

  let membershipExpiresAt: string | null;
  let grantApplied = false;
  let grantSkipped: string | null = null;

  if (matchingManualActivation || metadataShowsManualActivation) {
    // The administrator already granted this exact plan after the order was created.
    // Reconcile the chain payment and order ledger without granting the same days twice.
    membershipExpiresAt = meta.membership_expires_at ?? matchingManualActivation?.newExpiresAt ?? null;
    grantSkipped = matchingManualActivation
      ? "manual_activation_event_already_applied"
      : "manual_activation_metadata_already_applied";
  } else {
    const grant = await grantMembershipFromPlan({
      userId: order.userId,
      plan: order.plan,
      eventType: "PAYMENT_APPROVED",
      source: "auto_chain_payment",
      sourceId: order.id,
      note: `auto=true; chain=${order.chain}; tx=${order.txHash ?? ""}; founder=${order.discountPercent}%`,
      now: grantReferenceTime,
    });
    membershipExpiresAt = grant.newExpiresAt ?? meta.membership_expires_at ?? null;
    grantApplied = grant.applied;
    grantSkipped = grant.skipped ?? null;
  }

  const membershipStartedAt = meta.membership_started_at ?? verifiedAtIso;

  const entry: PaymentHistoryItem = {
    paymentId: order.id,
    plan: order.plan,
    network: order.network,
    tx_hash: order.txHash ?? "",
    amount: order.expectedAmount,
    list_price: order.listPrice,
    discount_percent: order.discountPercent,
    founder_rank: order.founderRank,
    submitted_at: order.createdAt,
    reviewed_at: verifiedAtIso,
    status: "approved",
    notificationStatus: "sent",
  };
  if (historyIndex >= 0) history[historyIndex] = entry;
  else history.unshift(entry);

  await updateUserAppMetadata(order.userId, {
    pending_payment: null,
    payment_history: history.slice(0, 50),
    membership_plan: order.plan,
    membership_started_at: membershipStartedAt,
    ...(membershipExpiresAt
      ? { membership_status: "active" as const, membership_expires_at: membershipExpiresAt }
      : {}),
    ...(order.discountPercent === 20 || order.discountPercent === 10
      ? {
          founder_member_rank: order.founderRank ?? meta.founder_member_rank ?? null,
          founder_discount_percent: order.discountPercent,
          founder_discount_status: "active" as const,
          founder_discount_granted_at: meta.founder_discount_granted_at ?? verifiedAtIso,
          founder_discount_forfeited_at: null,
        }
      : {}),
  });

  let referralReward: { applied: boolean; skipped?: string } | null = null;
  try {
    const { processReferralRewardAfterPayment } = await import("@/lib/referral/service");
    referralReward = await processReferralRewardAfterPayment({
      inviteeId: order.userId,
      paymentId: order.id,
    });
  } catch (err) {
    console.warn("[auto-payment] referral reward failed", err instanceof Error ? err.message : err);
    referralReward = { applied: false, skipped: "reward_error" };
  }

  if (membershipExpiresAt && grantApplied) {
    await notifyBuyerMembershipActivated({
      to: data.user.email,
      planLabel: PLAN_LABELS[order.plan],
      startedAt: formatDateTimeChina(membershipStartedAt),
      expiresAt: formatDateTimeChina(membershipExpiresAt),
    });
  }

  return {
    membershipExpiresAt,
    grantApplied,
    grantSkipped,
    referralReward,
  };
}
