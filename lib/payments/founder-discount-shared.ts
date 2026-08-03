import type { MembershipPlan } from "@/lib/auth/permissions-client";

export type FounderDiscountPercent = 0 | 10 | 20;
export type FounderDiscountStatus = "eligible" | "active" | "forfeited" | "standard";

export const FOUNDER_TIER_LIMITS = {
  TWENTY_PERCENT: 10,
  TEN_PERCENT_TOTAL: 50,
} as const;

export const OFFICIAL_PLAN_PRICES = {
  MONTHLY: 80,
  QUARTERLY: 200,
  YEARLY: 700,
} as const satisfies Record<MembershipPlan, number>;

export const PLAN_DAYS = {
  MONTHLY: 30,
  QUARTERLY: 90,
  YEARLY: 365,
} as const satisfies Record<MembershipPlan, number>;

export const PLAN_LABELS_ZH = {
  MONTHLY: "月度会员",
  QUARTERLY: "季度会员",
  YEARLY: "年度会员",
} as const satisfies Record<MembershipPlan, string>;

export const PLAN_LABELS_EN = {
  MONTHLY: "Monthly membership",
  QUARTERLY: "Quarterly membership",
  YEARLY: "Annual membership",
} as const satisfies Record<MembershipPlan, string>;

export interface FounderDiscountQuote {
  discountPercent: FounderDiscountPercent;
  status: FounderDiscountStatus;
  founderRank: number | null;
  tierLabelZh: string;
  tierLabelEn: string;
  continuityRequired: boolean;
  slots20Remaining: number;
  slots10Remaining: number;
}

export function discountedPrice(
  plan: MembershipPlan,
  discountPercent: FounderDiscountPercent
): number {
  const base = OFFICIAL_PLAN_PRICES[plan];
  return Math.round(base * (100 - discountPercent)) / 100;
}

export function discountLabelZh(percent: FounderDiscountPercent): string {
  if (percent === 20) return "创始会员永久8折";
  if (percent === 10) return "创始会员永久9折";
  return "标准价格";
}

export function discountLabelEn(percent: FounderDiscountPercent): string {
  if (percent === 20) return "Founding member · 20% off renewals";
  if (percent === 10) return "Founding member · 10% off renewals";
  return "Standard price";
}

export function emptyFounderQuote(): FounderDiscountQuote {
  return {
    discountPercent: 0,
    status: "standard",
    founderRank: null,
    tierLabelZh: "标准价格",
    tierLabelEn: "Standard price",
    continuityRequired: true,
    slots20Remaining: 0,
    slots10Remaining: 0,
  };
}
