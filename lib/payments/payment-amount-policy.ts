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
