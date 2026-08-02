/**
 * Server loaders for Conviction List public + member payloads.
 */
import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { getChinaDateKey } from "@/lib/date/china-date";
import { getSexagenaryDay } from "@/lib/calendar/sexagenary-calendar";
import { hasPrisma, prisma } from "@/lib/prisma";
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
  VIBE_FOCUS_PERIOD_ORDER,
  VIBE_FOCUS_VISIBLE_PERIOD_ORDER,
  listVibeFocusPeriodForecasts,
  vibeFocusPeriodMeta,
  type VibeFocusAssetId,
} from "@/lib/data/conviction/vibe-focus-forecasts";
import { getVibeEvidence, getVibeEvidenceMap, toVibePublicView } from "@/lib/data/vibe/store";
import type { VibeEvidencePublicView } from "@/types/vibe-evidence";
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
  vibeEvidence: Partial<Record<string, VibeEvidencePublicView>>;
};

export async function getConvictionListPagePayload(): Promise<ConvictionListPagePayload> {
  noStore();
  const access = await getAccessUser();
  const cards = await listPublicConvictionCards();
  const fullAccess = hasConvictionFullAccess(access);
  const vibeEvidence = fullAccess ? await getVibeEvidenceMap() : {};
  const latestResearchUpdatedAt =
    cards
      .map((c) => c.researchUpdatedAt)
      .sort()
      .at(-1) ?? null;
  return {
    mode: fullAccess ? "fullAccess" : "publicOnly",
    isAdmin: access.isAdmin,
    isAuthenticated: access.authenticated,
    cards,
    trackedCount: cards.length,
    latestResearchUpdatedAt,
    locks: CONVICTION_MEMBER_LOCKS,
    vibeEvidence,
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
  vibeEvidence: VibeEvidencePublicView | null;
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

type StaticPeriodAssetId =
  | "cxmt"
  | "asteroid"
  | "mu"
  | "hype"
  | "eth"
  | VibeFocusAssetId;

const STATIC_PERIOD_ASSET_IDS = new Set<StaticPeriodAssetId>([
  "cxmt",
  "asteroid",
  "mu",
  "hype",
  "eth",
  "googl",
  "msft",
  "tencent",
  "kingsoft-office",
]);

function isStaticPeriodAsset(value: string): value is StaticPeriodAssetId {
  return STATIC_PERIOD_ASSET_IDS.has(value as StaticPeriodAssetId);
}

function staticPublished(assetId: StaticPeriodAssetId) {
  if (assetId === "cxmt") return listLongxinPeriodForecasts();
  if (assetId === "asteroid") return listAsteroidPeriodForecasts();
  if (assetId === "eth") return listEthPeriodForecasts();
  if (assetId === "googl" || assetId === "msft" || assetId === "tencent" || assetId === "kingsoft-office") {
    return listVibeFocusPeriodForecasts(assetId);
  }
  return listMuHypePeriodForecasts(assetId);
}

function fullOrder(assetId: StaticPeriodAssetId) {
  if (assetId === "cxmt") return LONGXIN_FULL_PERIOD_ORDER;
  if (assetId === "asteroid") return ASTEROID_PERIOD_ORDER;
  if (assetId === "eth") return ETH_PERIOD_ORDER;
  if (assetId === "googl" || assetId === "msft" || assetId === "tencent" || assetId === "kingsoft-office") {
    return VIBE_FOCUS_PERIOD_ORDER;
  }
  return PERIOD_ORDER_BY_ASSET[assetId];
}

function visibleOrder(assetId: StaticPeriodAssetId) {
  if (assetId === "cxmt") return LONGXIN_VISIBLE_PERIOD_ORDER;
  if (assetId === "asteroid") return ["WEEK", "MONTH_1"] as ConvictionForecastType[];
  if (assetId === "eth") return ETH_VISIBLE_PERIOD_ORDER;
  if (assetId === "googl" || assetId === "msft" || assetId === "tencent" || assetId === "kingsoft-office") {
    return VIBE_FOCUS_VISIBLE_PERIOD_ORDER;
  }
  return VISIBLE_PERIOD_ORDER_BY_ASSET[assetId];
}

function buildStaticPeriodSlots(
  assetId: StaticPeriodAssetId,
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

async function attachAdminKeyDates(
  assetId: StaticPeriodAssetId,
  periods: ConvictionPeriodSlot[]
): Promise<ConvictionPeriodSlot[]> {
  if (!hasPrisma() || !prisma) return periods;
  let rows: Array<{
    targetDate: string;
    note: string | null;
    direction: string | null;
  }> = [];
  try {
    rows = await prisma.forecastOverride.findMany({
      where: { scope: { startsWith: "KEY_DATE" }, assetId, enabled: true },
      orderBy: { targetDate: "asc" },
    });
  } catch (error) {
    console.error("conviction key dates unavailable; using static research", error);
    return periods;
  }
  if (!rows.length) return periods;
  return periods.map((slot) => {
    if (!slot.forecast) return slot;
    const matched = rows.filter(
      (row) => row.targetDate >= slot.forecast!.periodStart && row.targetDate <= slot.forecast!.periodEnd
    );
    if (!matched.length) return slot;
    const adminDates = matched.map((row) => {
      let meta: Record<string, unknown> = {};
      if (row.note) {
        try {
          const parsed = JSON.parse(row.note) as unknown;
          if (parsed && typeof parsed === "object") meta = parsed as Record<string, unknown>;
        } catch {
          meta = { text: row.note };
        }
      }
      let ganzhi: string | null = null;
      try {
        ganzhi = getSexagenaryDay(row.targetDate).label;
      } catch {
        ganzhi = typeof meta.ganzhi === "string" ? meta.ganzhi : null;
      }
      const rawType = row.direction || String(meta.effect || "转折");
      const allowed = ["上涨候选", "下跌风险", "转折", "波动放大", "阶段高点", "阶段低点", "突破确认"] as const;
      const type = allowed.includes(rawType as (typeof allowed)[number])
        ? (rawType as (typeof allowed)[number])
        : "转折";
      return {
        date: row.targetDate,
        ganzhi,
        branchRule: typeof meta.branchRule === "string" ? meta.branchRule : null,
        type,
        label: String(meta.label || "管理员确认关键日"),
        source: (typeof meta.source === "string" ? meta.source : "ADMIN") as
          | "LIUYAO"
          | "QIMEN"
          | "BAZI"
          | "TECHNICAL"
          | "ADMIN",
        note: typeof meta.text === "string" ? meta.text : null,
      };
    });
    const existing = slot.forecast.keyDates ?? [];
    const deduped = new Map(
      [...existing, ...adminDates].map((item) => [
        `${item.date ?? item.branchRule}:${item.type}:${item.label}`,
        item,
      ])
    );
    return {
      ...slot,
      forecast: { ...slot.forecast, keyDates: [...deduped.values()] },
    };
  });
}

function publicPeriodMeta(assetId: StaticPeriodAssetId) {
  if (assetId === "eth") return ethPeriodMeta();
  if (assetId === "mu" || assetId === "hype") return periodMetaForAsset(assetId);
  if (assetId === "googl" || assetId === "msft" || assetId === "tencent" || assetId === "kingsoft-office") {
    return vibeFocusPeriodMeta(assetId);
  }
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
  const staticPeriodAsset = isStaticPeriodAsset(asset.slug) ? asset.slug : null;
  const vibeSnapshot = full ? await getVibeEvidence(asset.id) : null;
  const vibeEvidence = vibeSnapshot ? toVibePublicView(vibeSnapshot) : null;

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
      vibeEvidence: null,
      forecast: null,
    };
  }

  if (staticPeriodAsset) {
    const periods = await attachAdminKeyDates(
      staticPeriodAsset,
      buildStaticPeriodSlots(staticPeriodAsset, true)
    );
    return {
      mode: "fullAccess",
      isAdmin: access.isAdmin,
      isAuthenticated: true,
      public: pub,
      locks: CONVICTION_MEMBER_LOCKS,
      periodSlots: visiblePeriodMeta,
      vibeEvidence,
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
      vibeEvidence,
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

  const [todayResult, tomorrowResult, weeklyResult, verificationResult] =
    await Promise.allSettled([
      getPublishedTodayForecast(stockId),
      getPublishedTomorrowForecast(stockId),
      getPublishedWeeklyAnalysis(stockId),
      listStockVerifications(stockId),
    ]);
  const today = todayResult.status === "fulfilled" ? todayResult.value : null;
  const tomorrow = tomorrowResult.status === "fulfilled" ? tomorrowResult.value : null;
  const weekly = weeklyResult.status === "fulfilled" ? weeklyResult.value : null;
  const verifications =
    verificationResult.status === "fulfilled" ? verificationResult.value : [];

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
    vibeEvidence,
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
