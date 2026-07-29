/**
 * Server loaders for Conviction List public + member payloads.
 */
import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { getChinaDateKey } from "@/lib/date/china-date";
import { getAccessUser } from "@/lib/auth/get-access-user";
import { hasConvictionFullAccess } from "@/lib/data/conviction/access-mode";
import {
  ASTEROID_PERIOD_LABELS,
  ASTEROID_PERIOD_ORDER,
  listAsteroidPeriodForecasts,
  type ConvictionForecastType,
  type ConvictionPeriodForecast,
} from "@/lib/data/conviction/asteroid-forecasts";
import { CONVICTION_MEMBER_LOCKS } from "@/lib/data/conviction/seed";
import {
  getConvictionAssetBySlug,
  listPublicConvictionCards,
  toPublicCard,
} from "@/lib/data/conviction/store";
import {
  getPublishedTodayForecast,
  getPublishedTomorrowForecast,
  getPublishedWeeklyAnalysis,
  lastUpdatedIso,
  listStockVerifications,
  toDailyMemberView,
  toWeeklyMemberView,
} from "@/lib/data/member-stocks/store";
import { isIpoHighVolatilityDate } from "@/lib/data/member-stocks/ipo-rules";
import type { ConvictionPublicCard } from "@/types/conviction-asset";
import type {
  MemberStockDailyMemberView,
  MemberStockVerificationResult,
  MemberStockWeeklyMemberView,
} from "@/types/member-stock";

export type ConvictionListPagePayload = {
  mode: "publicOnly" | "fullAccess";
  isAdmin: boolean;
  isAuthenticated: boolean;
  cards: ConvictionPublicCard[];
  trackedCount: number;
  latestResearchUpdatedAt: string | null;
  locks: typeof CONVICTION_MEMBER_LOCKS;
};

export async function getConvictionListPagePayload(): Promise<ConvictionListPagePayload> {
  noStore();
  const access = await getAccessUser();
  const cards = await listPublicConvictionCards();
  const latestResearchUpdatedAt =
    cards
      .map((c) => c.researchUpdatedAt)
      .sort()
      .at(-1) ?? null;
  return {
    mode: hasConvictionFullAccess(access) ? "fullAccess" : "publicOnly",
    isAdmin: access.isAdmin,
    isAuthenticated: access.authenticated,
    cards,
    trackedCount: cards.length,
    latestResearchUpdatedAt,
    locks: CONVICTION_MEMBER_LOCKS,
  };
}

export type ConvictionPeriodSlot = {
  type: ConvictionForecastType;
  labelZh: string;
  emptyZh: string;
  /** null = not published for this period */
  forecast: ConvictionPeriodForecast | null;
};

export type ConvictionDetailPayload = {
  mode: "publicOnly" | "fullAccess";
  isAdmin: boolean;
  isAuthenticated: boolean;
  public: ConvictionPublicCard;
  locks: typeof CONVICTION_MEMBER_LOCKS;
  periodSlots: Array<{ type: ConvictionForecastType; labelZh: string; emptyZh: string; hasResearch: boolean }>;
  /** Only present when fullAccess — never sent to unauthorized clients via API. */
  forecast: null | {
    today: MemberStockDailyMemberView | null;
    tomorrow: MemberStockDailyMemberView | null;
    weekly: MemberStockWeeklyMemberView | null;
    periods: ConvictionPeriodSlot[];
    updatedAt: string | null;
    riskLevel: string | null;
    ipoHighVolWarning: boolean;
    history: MemberStockVerificationResult[];
  };
};

function filterPastVerifiedHistory(
  results: MemberStockVerificationResult[],
  now = new Date()
): MemberStockVerificationResult[] {
  const todayKey = getChinaDateKey(now);
  return results.filter((r) => {
    if (!(r.forecastDate < todayKey)) return false;
    const v = String(r.verdict);
    if (v === "pending" || v === "not_eligible" || v === "manual_review") return false;
    return v === "hit" || v === "miss" || v === "void";
  });
}

function buildAsteroidPeriodSlots(includeBody: boolean): ConvictionPeriodSlot[] {
  const published = listAsteroidPeriodForecasts();
  return ASTEROID_PERIOD_ORDER.map((type) => {
    const hit = published.find((f) => f.forecastType === type) ?? null;
    return {
      type,
      labelZh: ASTEROID_PERIOD_LABELS[type].zh,
      emptyZh: ASTEROID_PERIOD_LABELS[type].emptyZh,
      forecast: includeBody ? hit : null,
    };
  });
}

export async function getConvictionDetailPayload(
  slug: string
): Promise<ConvictionDetailPayload | null> {
  noStore();
  const asset = await getConvictionAssetBySlug(slug);
  if (!asset) return null;
  const access = await getAccessUser();
  const full = hasConvictionFullAccess(access);
  const pub = toPublicCard(asset);
  const isAsteroid = asset.slug === "asteroid";

  const publicPeriodMeta = ASTEROID_PERIOD_ORDER.map((type) => ({
    type,
    labelZh: ASTEROID_PERIOD_LABELS[type].zh,
    emptyZh: ASTEROID_PERIOD_LABELS[type].emptyZh,
    hasResearch:
      type === "TODAY" || type === "TOMORROW"
        ? false
        : Boolean(listAsteroidPeriodForecasts().find((f) => f.forecastType === type)),
  }));

  if (!full) {
    return {
      mode: "publicOnly",
      isAdmin: false,
      isAuthenticated: access.authenticated,
      public: pub,
      locks: CONVICTION_MEMBER_LOCKS,
      periodSlots: isAsteroid
        ? publicPeriodMeta
        : [
            { type: "TODAY", labelZh: "今日", emptyZh: "今日分析尚未发布", hasResearch: true },
            { type: "TOMORROW", labelZh: "明日", emptyZh: "下一交易日分析尚未发布", hasResearch: true },
            { type: "WEEK", labelZh: "本周", emptyZh: "该周期预测尚未发布", hasResearch: true },
          ],
      forecast: null,
    };
  }

  if (isAsteroid) {
    const periods = buildAsteroidPeriodSlots(true);
    return {
      mode: "fullAccess",
      isAdmin: access.isAdmin,
      isAuthenticated: true,
      public: pub,
      locks: CONVICTION_MEMBER_LOCKS,
      periodSlots: publicPeriodMeta,
      forecast: {
        today: null,
        tomorrow: null,
        weekly: null,
        periods,
        updatedAt: asset.researchUpdatedAt,
        riskLevel: asset.riskLevel,
        ipoHighVolWarning: false,
        history: [],
      },
    };
  }

  const stockId = asset.memberForecastStockId;
  if (!stockId) {
    return {
      mode: "fullAccess",
      isAdmin: access.isAdmin,
      isAuthenticated: true,
      public: pub,
      locks: CONVICTION_MEMBER_LOCKS,
      periodSlots: publicPeriodMeta,
      forecast: {
        today: null,
        tomorrow: null,
        weekly: null,
        periods: [],
        updatedAt: null,
        riskLevel: null,
        ipoHighVolWarning: false,
        history: [],
      },
    };
  }

  const [today, tomorrow, weekly, verifications] = await Promise.all([
    getPublishedTodayForecast(stockId),
    getPublishedTomorrowForecast(stockId),
    getPublishedWeeklyAnalysis(stockId),
    listStockVerifications(stockId),
  ]);

  const ipoHighVolWarning = Boolean(
    (today && isIpoHighVolatilityDate(stockId, today.forecastDate)) ||
      (tomorrow && isIpoHighVolatilityDate(stockId, tomorrow.forecastDate)) ||
      (weekly && isIpoHighVolatilityDate(stockId, weekly.weekStart))
  );

  return {
    mode: "fullAccess",
    isAdmin: access.isAdmin,
    isAuthenticated: true,
    public: pub,
    locks: CONVICTION_MEMBER_LOCKS,
    periodSlots: [
      { type: "TODAY", labelZh: "今日", emptyZh: "今日分析尚未发布", hasResearch: Boolean(today) },
      {
        type: "TOMORROW",
        labelZh: "明日",
        emptyZh: "下一交易日分析尚未发布",
        hasResearch: Boolean(tomorrow),
      },
      { type: "WEEK", labelZh: "本周", emptyZh: "该周期预测尚未发布", hasResearch: Boolean(weekly) },
    ],
    forecast: {
      today: today ? toDailyMemberView(today) : null,
      tomorrow: tomorrow ? toDailyMemberView(tomorrow) : null,
      weekly: weekly ? toWeeklyMemberView(weekly) : null,
      periods: [],
      updatedAt: lastUpdatedIso(today, tomorrow, weekly),
      riskLevel: today?.riskLevel ?? tomorrow?.riskLevel ?? weekly?.riskLevel ?? null,
      ipoHighVolWarning,
      history: filterPastVerifiedHistory(verifications),
    },
  };
}
