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
  LONGXIN_FULL_PERIOD_ORDER,
  LONGXIN_VISIBLE_PERIOD_ORDER,
  listLongxinPeriodForecasts,
} from "@/lib/data/conviction/longxin-forecasts";
import {
  listMuHypePeriodForecasts,
  periodMetaForAsset,
  PERIOD_ORDER_BY_ASSET,
  VISIBLE_PERIOD_ORDER_BY_ASSET,
} from "@/lib/data/conviction/mu-hype-forecasts";
import {
  ETH_PERIOD_ORDER,
  ETH_VISIBLE_PERIOD_ORDER,
  ethPeriodMeta,
  listEthPeriodForecasts,
} from "@/lib/data/conviction/eth-forecasts";
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
  const officialBaseline = "2026-08-01";
  return results.filter((r) => {
    if (r.forecastDate < officialBaseline) return false;
    if (!(r.forecastDate < todayKey)) return false;
    const v = String(r.verdict);
    if (v === "pending" || v === "not_eligible" || v === "manual_review") return false;
    return v === "hit" || v === "miss" || v === "void";
  });
}

function staticPublished(assetId: "cxmt" | "asteroid" | "mu" | "hype" | "eth") {
  if (assetId === "cxmt") return listLongxinPeriodForecasts();
  if (assetId === "asteroid") return listAsteroidPeriodForecasts();
  if (assetId === "eth") return listEthPeriodForecasts();
  return listMuHypePeriodForecasts(assetId);
}

function fullOrder(assetId: "cxmt" | "asteroid" | "mu" | "hype" | "eth") {
  if (assetId === "cxmt") return LONGXIN_FULL_PERIOD_ORDER;
  if (assetId === "asteroid") return ASTEROID_PERIOD_ORDER;
  if (assetId === "eth") return ETH_PERIOD_ORDER;
  return PERIOD_ORDER_BY_ASSET[assetId];
}

function visibleOrder(assetId: "cxmt" | "asteroid" | "mu" | "hype" | "eth") {
  if (assetId === "cxmt") return LONGXIN_VISIBLE_PERIOD_ORDER;
  if (assetId === "asteroid") return ["WEEK", "MONTH_1"] as ConvictionForecastType[];
  if (assetId === "eth") return ETH_VISIBLE_PERIOD_ORDER;
  return VISIBLE_PERIOD_ORDER_BY_ASSET[assetId];
}

function buildStaticPeriodSlots(
  assetId: "cxmt" | "asteroid" | "mu" | "hype" | "eth",
  includeBody: boolean
): ConvictionPeriodSlot[] {
  const published = staticPublished(assetId);
  return fullOrder(assetId).map((type) => {
    const hit = published.find((f) => f.forecastType === type) ?? null;
    return {
      type,
      labelZh: ASTEROID_PERIOD_LABELS[type].zh,
      emptyZh: ASTEROID_PERIOD_LABELS[type].emptyZh,
      forecast: includeBody ? hit : null,
    };
  });
}

function publicPeriodMeta(assetId: "cxmt" | "asteroid" | "mu" | "hype" | "eth") {
  if (assetId === "eth") return ethPeriodMeta();
  if (assetId === "mu" || assetId === "hype") return periodMetaForAsset(assetId);
  const published = staticPublished(assetId);
  return visibleOrder(assetId).map((type) => ({
    type,
    labelZh: ASTEROID_PERIOD_LABELS[type].zh,
    emptyZh: ASTEROID_PERIOD_LABELS[type].emptyZh,
    hasResearch: published.some((f) => f.forecastType === type),
  }));
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
  const staticPeriodAsset =
    asset.slug === "cxmt" ||
    asset.slug === "asteroid" ||
    asset.slug === "mu" ||
    asset.slug === "hype" ||
    asset.slug === "eth"
      ? asset.slug
      : null;

  const visiblePeriodMeta = staticPeriodAsset ? publicPeriodMeta(staticPeriodAsset) : [];

  if (!full) {
    return {
      mode: "publicOnly",
      isAdmin: false,
      isAuthenticated: access.authenticated,
      public: pub,
      locks: CONVICTION_MEMBER_LOCKS,
      periodSlots: staticPeriodAsset
        ? visiblePeriodMeta
        : [
            { type: "TODAY", labelZh: "今日", emptyZh: "今日分析尚未发布", hasResearch: true },
            { type: "TOMORROW", labelZh: "明日", emptyZh: "下一交易日分析尚未发布", hasResearch: true },
            { type: "WEEK", labelZh: "本周", emptyZh: "该周期预测尚未发布", hasResearch: true },
          ],
      forecast: null,
    };
  }

  if (staticPeriodAsset) {
    const periods = buildStaticPeriodSlots(staticPeriodAsset, true);
    return {
      mode: "fullAccess",
      isAdmin: access.isAdmin,
      isAuthenticated: true,
      public: pub,
      locks: CONVICTION_MEMBER_LOCKS,
      periodSlots: visiblePeriodMeta,
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
      periodSlots: visiblePeriodMeta,
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
