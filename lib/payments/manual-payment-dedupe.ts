export interface ManualMembershipFulfillmentInput {
  orderPlan: string;
  orderCreatedAt: string;
  verifiedAt: string;
  membershipPlan?: string | null;
  membershipStartedAt?: string | null;
  membershipExpiresAt?: string | null;
}

function timestamp(value?: string | null): number | null {
  if (!value) return null;
  const result = new Date(value).getTime();
  return Number.isFinite(result) ? result : null;
}

/**
 * Fallback guard for the exact production incident where an administrator
 * already activated a previously-free user after the payment order was created.
 * Existing members renewing normally are not matched because their original
 * membership_started_at predates the new order.
 */
export function wasOrderAlreadyFulfilledByManualMembership(
  input: ManualMembershipFulfillmentInput
): boolean {
  if (!input.membershipPlan || input.membershipPlan !== input.orderPlan) return false;

  const orderCreatedAt = timestamp(input.orderCreatedAt);
  const verifiedAt = timestamp(input.verifiedAt);
  const membershipStartedAt = timestamp(input.membershipStartedAt);
  const membershipExpiresAt = timestamp(input.membershipExpiresAt);
  if (
    orderCreatedAt == null ||
    verifiedAt == null ||
    membershipStartedAt == null ||
    membershipExpiresAt == null
  ) {
    return false;
  }

  const clockSkewMs = 5 * 60_000;
  return (
    membershipStartedAt >= orderCreatedAt - clockSkewMs &&
    membershipStartedAt <= verifiedAt + clockSkewMs &&
    membershipExpiresAt > verifiedAt - clockSkewMs
  );
}
