/** Client-safe plan constants (no server-only). */
export type MembershipPlan = "MONTHLY" | "QUARTERLY" | "YEARLY";
export type PaymentNetwork = "TRC20" | "BEP20";

export const PLAN_DAYS: Record<MembershipPlan, number> = {
  MONTHLY: 30,
  QUARTERLY: 90,
  YEARLY: 365,
};

export const PLAN_PRICES: Record<MembershipPlan, number> = {
  MONTHLY: 80,
  QUARTERLY: 200,
  YEARLY: 700,
};

export const PLAN_LABELS: Record<MembershipPlan, string> = {
  MONTHLY: "月会员",
  QUARTERLY: "季度会员",
  YEARLY: "年度会员",
};
