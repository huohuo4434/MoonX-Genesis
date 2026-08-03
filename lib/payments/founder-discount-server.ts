import "server-only";

import type { AuthUserView } from "@/lib/auth/permissions";
import { listPaymentOrders, type PaymentOrderRecord } from "@/lib/payments/payment-orders-store";
import {
  FOUNDER_TIER_LIMITS,
  discountLabelEn,
  discountLabelZh,
  emptyFounderQuote,
  type FounderDiscountPercent,
  type FounderDiscountQuote,
} from "@/lib/payments/founder-discount-shared";

function validDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function firstQualifyingOrders(orders: PaymentOrderRecord[]): PaymentOrderRecord[] {
  const byUser = new Map<string, PaymentOrderRecord>();
  const sorted = orders
    .filter((order) => !order.isTest && order.status !== "rejected" && Boolean(order.userId))
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  for (const order of sorted) {
    if (!byUser.has(order.userId)) byUser.set(order.userId, order);
  }
  return [...byUser.values()];
}

function legacyPercentForIndex(index: number): FounderDiscountPercent {
  if (index < FOUNDER_TIER_LIMITS.TWENTY_PERCENT) return 20;
  if (index < FOUNDER_TIER_LIMITS.TEN_PERCENT_TOTAL) return 10;
  return 0;
}

function metadataPercent(user: AuthUserView): FounderDiscountPercent {
  const value = user.app_metadata.founder_discount_percent;
  return value === 20 || value === 10 ? value : 0;
}

function isContinuityActive(user: AuthUserView, at = new Date()): boolean {
  const expiry = validDate(user.app_metadata.membership_expires_at);
  return Boolean(expiry && expiry.getTime() > at.getTime());
}

function hasPendingRenewalSubmittedBeforeExpiry(
  user: AuthUserView,
  orders: PaymentOrderRecord[],
  discountPercent: FounderDiscountPercent
): boolean {
  const expiry = validDate(user.app_metadata.membership_expires_at);
  if (!expiry || discountPercent === 0) return false;
  return orders.some((order) => {
    if (order.userId !== user.id || order.isTest || order.status !== "pending") return false;
    if (order.discountPercent !== discountPercent) return false;
    const submittedAt = validDate(order.submittedAt);
    return Boolean(submittedAt && submittedAt.getTime() < expiry.getTime());
  });
}

export async function getFounderDiscountQuote(
  user: AuthUserView | null,
  at = new Date()
): Promise<FounderDiscountQuote> {
  if (!user || user.app_metadata.role === "admin") return emptyFounderQuote();

  const orders = await listPaymentOrders();
  const firstOrders = firstQualifyingOrders(orders);
  const userIndex = firstOrders.findIndex((order) => order.userId === user.id);
  const storedPercent = metadataPercent(user);
  const storedStatus = user.app_metadata.founder_discount_status;
  const continuityActive = isContinuityActive(user, at);
  const pendingRenewalPreservesContinuity = hasPendingRenewalSubmittedBeforeExpiry(
    user,
    orders,
    storedPercent
  );

  let discountPercent: FounderDiscountPercent = 0;
  let status: FounderDiscountQuote["status"] = "standard";
  let founderRank: number | null = null;

  if (storedStatus === "forfeited") {
    status = "forfeited";
  } else if (storedPercent > 0) {
    founderRank = user.app_metadata.founder_member_rank ?? (userIndex >= 0 ? userIndex + 1 : null);
    if (continuityActive) {
      discountPercent = storedPercent;
      status = "active";
    } else if (pendingRenewalPreservesContinuity) {
      // A renewal submitted on time keeps the offer alive while manual review is pending.
      discountPercent = storedPercent;
      status = "eligible";
    } else {
      status = "forfeited";
    }
  } else if (userIndex >= 0) {
    founderRank = userIndex + 1;
    const firstOrder = firstOrders[userIndex]!;
    const orderPercent =
      firstOrder.discountPercent === 20 || firstOrder.discountPercent === 10
        ? firstOrder.discountPercent
        : legacyPercentForIndex(userIndex);
    if (orderPercent > 0 && firstOrder.status === "pending") {
      // The first valid order has reserved this rank. It stays eligible while awaiting review.
      discountPercent = orderPercent;
      status = "eligible";
    } else if (orderPercent > 0 && continuityActive) {
      discountPercent = orderPercent;
      status = "active";
    } else if (orderPercent > 0) {
      status = "forfeited";
    }
  } else {
    founderRank = firstOrders.length + 1;
    discountPercent = legacyPercentForIndex(firstOrders.length);
    status = discountPercent > 0 ? "eligible" : "standard";
  }

  const twentyUsed = Math.min(firstOrders.length, FOUNDER_TIER_LIMITS.TWENTY_PERCENT);
  const tenUsed = Math.max(
    0,
    Math.min(firstOrders.length, FOUNDER_TIER_LIMITS.TEN_PERCENT_TOTAL) -
      FOUNDER_TIER_LIMITS.TWENTY_PERCENT
  );

  return {
    discountPercent,
    status,
    founderRank,
    tierLabelZh: discountLabelZh(discountPercent),
    tierLabelEn: discountLabelEn(discountPercent),
    continuityRequired: true,
    slots20Remaining: Math.max(0, FOUNDER_TIER_LIMITS.TWENTY_PERCENT - twentyUsed),
    slots10Remaining: Math.max(
      0,
      FOUNDER_TIER_LIMITS.TEN_PERCENT_TOTAL -
        FOUNDER_TIER_LIMITS.TWENTY_PERCENT -
        tenUsed
    ),
  };
}

export function founderContinuityWasValidAtSubmission(
  user: AuthUserView,
  submittedAt: string
): boolean {
  const expiry = validDate(user.app_metadata.membership_expires_at);
  const submitted = validDate(submittedAt);
  if (!expiry || !submitted) return false;
  return expiry.getTime() > submitted.getTime();
}
