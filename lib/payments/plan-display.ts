/** Static display metadata for membership plans (badges, savings). Prices come from DB. */

export interface PlanDisplayMeta {
  badge?: string;
  savingText?: string;
}

export const PLAN_DISPLAY: Record<string, PlanDisplayMeta> = {
  MONTHLY: { badge: "灵活体验" },
  QUARTERLY: {
    badge: "推荐",
    savingText: "相比按月购买节省40 USDT",
  },
  YEARLY: {
    badge: "长期最省",
    savingText: "相比按月购买节省260 USDT",
  },
};

export const PLAN_PURCHASE_LABEL: Record<string, string> = {
  MONTHLY: "购买月度会员",
  QUARTERLY: "购买季度会员",
  YEARLY: "购买年度会员",
};

/** Official prices — used for fallback when DB unavailable and migration reference. */
export const OFFICIAL_PLAN_PRICES = {
  MONTHLY: 80,
  QUARTERLY: 200,
  YEARLY: 700,
} as const;
