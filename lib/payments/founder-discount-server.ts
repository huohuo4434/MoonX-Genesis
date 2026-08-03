import "server-only";

import type { AuthUserView } from "@/lib/auth/permissions";
import { listPaymentOrders, type PaymentOrderRecord } from "@/lib/payments/payment-orders-store";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  FOUNDER_TIER_LIMITS,
  discountLabelEn,
  discountLabelZh,
  emptyFounderQuote,
  type FounderDiscountPercent,
  type FounderDiscountQuote,
} from "@/lib/payments/founder-discount-shared";

type FounderOrder = {
  userId: string;
  submittedAt: string;
  status: string;
  isTest: boolean;
  discountPercent: FounderDiscountPercent;
  expiresAt?: string | null;
};

function validDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeLegacyOrder(order: PaymentOrderRecord): FounderOrder {
  return {
    userId: order.userId,
    submittedAt: order.submittedAt,
    status: order.status,
    isTest: order.isTest,
    discountPercent:
      order.discountPercent === 20 || order.discountPercent === 10 ? order.discountPercent : 0,
  };
}

async function listAutomaticFounderOrders(now = new Date()): Promise<FounderOrder[]> {
  const admin = getAdminClient();
  if (!admin) return [];
  const { data, error } = await admin
    .from("payment_orders")
    .select("user_id,status,created_at,expires_at,tx_hash,metadata")
    .in("status", ["pending", "verifying", "paid", "overpaid", "manual_review"])
    .order("created_at", { ascending: true });
  if (error || !data) return [];

  return data.flatMap((row) => {
    const metadata = (row.metadata && typeof row.metadata === "object"
      ? row.metadata
      : {}) as Record<string, unknown>;
    if (metadata.autoVerification !== true) return [];
    const status = String(row.status ?? "");
    const expiresAt = typeof row.expires_at === "string" ? row.expires_at : null;
    const isUnfundedExpiredReservation =
      status === "pending" &&
      !row.tx_hash &&
      Boolean(expiresAt && new Date(expiresAt).getTime() <= now.getTime());
    if (isUnfundedExpiredReservation) return [];
    const rawDiscount = Number(metadata.discountPercent ?? 0);
    const discountPercent: FounderDiscountPercent = rawDiscount === 20 || rawDiscount === 10 ? rawDiscount : 0;
    return [{
      userId: String(row.user_id ?? ""),
      submittedAt: String(row.created_at ?? ""),
      status,
      isTest: false,
      discountPercent,
      expiresAt,
    } satisfies FounderOrder];
  }).filter((order) => Boolean(order.userId && order.submittedAt));
}

function firstQualifyingOrders(orders: FounderOrder[]): FounderOrder[] {
  const byUser = new Map<string, FounderOrder>();
  const sorted = orders
    .filter((order) => !order.isTest && !["rejected", "expired", "refunded", "underpaid"].includes(order.status) && Boolean(order.userId))
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
  orders: FounderOrder[],
  discountPercent: FounderDiscountPercent
): boolean {
  const expiry = validDate(user.app_metadata.membership_expires_at);
  if (!expiry || discountPercent === 0) return false;
  return orders.some((order) => {
    if (order.userId !== user.id || order.isTest || !["pending", "verifying", "manual_review"].includes(order.status)) return false;
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

  const [legacyOrders, automaticOrders] = await Promise.all([
    listPaymentOrders(),
    listAutomaticFounderOrders(at),
  ]);
  const allOrders: FounderOrder[] = [
    ...legacyOrders.map(normalizeLegacyOrder),
    ...automaticOrders,
  ];
  const firstOrders = firstQualifyingOrders(allOrders);
  const userIndex = firstOrders.findIndex((order) => order.userId === user.id);
  const storedPercent = metadataPercent(user);
  const storedStatus = user.app_metadata.founder_discount_status;
  const continuityActive = isContinuityActive(user, at);
  const pendingRenewalPreservesContinuity = hasPendingRenewalSubmittedBeforeExpiry(
    user,
    allOrders,
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
      discountPercent = storedPercent;
      status = "eligible";
    } else {
      status = "forfeited";
    }
  } else if (userIndex >= 0) {
    founderRank = userIndex + 1;
    const firstOrder = firstOrders[userIndex]!;
    const orderPercent = firstOrder.discountPercent || legacyPercentForIndex(userIndex);
    if (orderPercent > 0 && ["pending", "verifying", "manual_review"].includes(firstOrder.status)) {
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
