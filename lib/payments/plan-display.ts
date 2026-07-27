/** Static display metadata for membership plans (badges, savings). Prices come from DB. */

export interface PlanDisplayMeta {
  badge?: string;
  savingText?: string;
}

export const PLAN_DISPLAY: Record<string, PlanDisplayMeta> = {
  MONTHLY: { badge: "灵活体验" },
  QUARTERLY: {
    badge: "推荐",
    savingText: "相比按月购买节省30 USDT",
  },
  YEARLY: {
    badge: "长期最省",
    savingText: "相比按月购买节省200 USDT",
  },
};

/** Official prices — used for fallback when DB unavailable and migration reference. */
export const OFFICIAL_PLAN_PRICES = {
  MONTHLY: 50,
  QUARTERLY: 120,
  YEARLY: 400,
} as const;
