import type { MembershipPlan } from "@/lib/auth/permissions-client";
import { discountedPrice, type FounderDiscountPercent } from "@/lib/payments/founder-discount-shared";

/**
 * A submitted transaction hash uniquely binds a chain transfer to an order.
 * The tiny order suffix is useful for display/matching, but exchanges may round it
 * to two decimals. Therefore the chain verifier must accept the actual discounted
 * plan price as the minimum and must never reject a legitimate overpayment.
 */
export function minimumAcceptedPaymentAmount(input: {
  plan: MembershipPlan;
  discountPercent: FounderDiscountPercent;
}): number {
  return discountedPrice(input.plan, input.discountPercent);
}

export function paymentAmountShortfall(input: {
  paidAmount: number;
  minimumAmount: number;
  epsilon?: number;
}): number {
  const epsilon = input.epsilon ?? 0.0000001;
  if (input.paidAmount + epsilon >= input.minimumAmount) return 0;
  return Number((input.minimumAmount - input.paidAmount).toFixed(6));
}

export function isLegacyRoundingMismatch(message: string | null | undefined): boolean {
  if (!message) return false;
  return /less than order amount|exceeds order amount|exactly match|below minimum accepted amount|amount mismatch/i.test(message);
}

export const MAX_DISCOVERABLE_EXCHANGE_FEE_USDT = 2;

function fiveDecimal(value: number): number {
  return Number(value.toFixed(5));
}

/** The order identifier is the sub-cent, five-decimal suffix, not the whole fractional part. */
export function paymentUniqueSuffix(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return Number.NaN;
  return fiveDecimal(amount - Math.floor(amount * 100) / 100);
}

export function matchesPaymentUniqueSuffix(input: {
  amount: number;
  uniqueSuffix: number;
}): boolean {
  if (!Number.isFinite(input.uniqueSuffix) || input.uniqueSuffix <= 0 || input.uniqueSuffix >= 0.01) return false;
  const suffix = paymentUniqueSuffix(input.amount);
  return Number.isFinite(suffix) && Math.abs(suffix - fiveDecimal(input.uniqueSuffix)) <= 0.000001;
}

export type TransferDiscoveryClassification = "FULL_AMOUNT" | "UNDERPAID_MANUAL_REVIEW" | "REJECT";

/**
 * A suffix match can discover a possible exchange-fee transfer, but never lowers
 * the amount required for automatic activation.
 */
export function classifyTransferForOrderDiscovery(input: {
  expectedAmount: number;
  minimumAmount: number;
  actualAmount: number;
  uniqueSuffix: number;
  maxDiscoverableShortfall?: number;
}): TransferDiscoveryClassification {
  const maxShortfall = input.maxDiscoverableShortfall ?? MAX_DISCOVERABLE_EXCHANGE_FEE_USDT;
  if (
    !Number.isFinite(input.expectedAmount) || input.expectedAmount <= 0 ||
    !Number.isFinite(input.minimumAmount) || input.minimumAmount <= 0 ||
    !Number.isFinite(input.actualAmount) || input.actualAmount <= 0 ||
    !matchesPaymentUniqueSuffix({ amount: input.expectedAmount, uniqueSuffix: input.uniqueSuffix }) ||
    !matchesPaymentUniqueSuffix({ amount: input.actualAmount, uniqueSuffix: input.uniqueSuffix })
  ) return "REJECT";
  if (Math.abs(input.actualAmount - input.expectedAmount) <= 0.000001) return "FULL_AMOUNT";
  const expectedShortfall = input.expectedAmount - input.actualAmount;
  if (
    input.actualAmount < input.minimumAmount - 0.0000001 &&
    expectedShortfall > 0 &&
    expectedShortfall <= maxShortfall + 0.0000001
  ) return "UNDERPAID_MANUAL_REVIEW";
  return "REJECT";
}
