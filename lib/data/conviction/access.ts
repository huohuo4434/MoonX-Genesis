// MOOX_V7206_CONVICTION_DAILY_DATE
/**
 * Server loaders for Conviction List public + member payloads.
 */
import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { getChinaDateKey } from "@/lib/date/china-date";
import { getSexagenaryDay } from "@/lib/calendar/sexagenary-calendar";
import { hasPrisma, prisma } from "@/lib/prisma";
import { getAccessUser } from "@/lib/auth/get-access-user";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { hasConvictionFullAccess } from "@/lib/data/conviction/access-mode";
import {
  ASTEROID_PERIOD_LABELS,
  ASTEROID_PERIOD_ORDER,
  type ConvictionForecastType,
  type ConvictionPeriodForecast,
} from "@/lib/data/conviction/asteroid-forecasts";
import {
  SANDISK_PERIOD_LABELS,
  SANDISK_PERIOD_ORDER,
  SANDISK_VISIBLE_PERIOD_ORDER,
  sandiskPeriodMeta,
} from "@/lib/data/conviction/sandisk-forecasts";
import {
  NBIS_PERIOD_LABELS,
  NBIS_PERIOD_ORDER,
  NBIS_VISIBLE_PERIOD_ORDER,
  nbisPeriodMeta,
} from "@/lib/data/conviction/nbis-liuyao-20260811";
import {
  A_SHARE_PERIOD_ORDER,
  A_SHARE_VISIBLE_PERIOD_ORDER,
  aSharePeriodLabel20260810,
  aSharePeriodMeta20260810,
  isAShareResearchAssetId,
} from "@/lib/data/conviction/a-share-liuyao-20260810";
import {
  TSLA_PERIOD_ORDER,
  TSLA_VISIBLE_PERIOD_ORDER,
  tslaPeriodLabel20260816,
  tslaPeriodMeta20260816,
} from "@/lib/data/conviction/tsla-liuyao-20260816";
import {
  LITE_PERIOD_ORDER,
  LITE_VISIBLE_PERIOD_ORDER,
  litePeriodLabel20260816,
  litePeriodMeta20260816,
} from "@/lib/data/conviction/lite-liuyao-20260816";
import { CONVICTION_MEMBER_LOCKS } from "@/lib/data/conviction/seed";
import {
  LONGXIN_FULL_PERIOD_ORDER,
  LONGXIN_VISIBLE_PERIOD_ORDER,
} from "@/lib/data/conviction/longxin-forecasts";
import {
  periodMetaForAsset,
  PERIOD_ORDER_BY_ASSET,
  VISIBLE_PERIOD_ORDER_BY_ASSET,
} from "@/lib/data/conviction/mu-hype-forecasts";
import {
  HYPE_UPDATED_PERIOD_ORDER,
  HYPE_UPDATED_VISIBLE_PERIOD_ORDER,
  SOL_PERIOD_ORDER,
  SOL_VISIBLE_PERIOD_ORDER,
  hypePeriodMeta20260809,
  periodLabelForHype20260809,
  periodLabelForSol20260809,
  solPeriodMeta20260809,
} from "@/lib/data/conviction/hype-sol-20260809";
import {
  ETH_PERIOD_ORDER,
  ETH_VISIBLE_PERIOD_ORDER,
  ethPeriodMeta,
} from "@/lib/data/conviction/eth-forecasts";
import {
  getConvictionAssetBySlug,
  listConvictionAssets,
  listPublicConvictionCards,
  toPublicCard,
} from "@/lib/data/conviction/store";
import {
  VIBE_FOCUS_PERIOD_ORDER,
  VIBE_FOCUS_VISIBLE_PERIOD_ORDER,
  vibeFocusPeriodMeta,
} from "@/lib/data/conviction/vibe-focus-forecasts";
import {
  GOOGLE_PERIOD_ORDER,
  GOOGLE_VISIBLE_PERIOD_ORDER,
  googlePeriodMeta,
} from "@/lib/data/conviction/google-forecasts";
import {
  MSFT_PERIOD_ORDER,
  MSFT_VISIBLE_PERIOD_ORDER,
  msftPeriodMeta,
} from "@/lib/data/conviction/msft-forecasts";
import {
  TENCENT_PERIOD_LABELS,
  TENCENT_PERIOD_ORDER,
  TENCENT_VISIBLE_PERIOD_ORDER,
  tencentPeriodMeta,
} from "@/lib/data/conviction/tencent-forecasts";
import {
  BTC_PERIOD_ORDER,
} from "@/lib/data/conviction/btc-forecasts-20260801";
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
import { buildWatchlistResonanceRanking } from "@/lib/data/conviction/resonance-ranking";
import { targetWeekWindow } from "@/lib/data/conviction/resonance-core";
import type { WatchlistResonanceSignal } from "@/lib/data/conviction/resonance-types";
import { forecastFreshnessStatus, prioritizeCurrentPeriods, summarizeForecastFreshness, type ForecastFreshnessStatus, type ForecastFreshnessSummary } from "@/lib/data/conviction/freshness";
import { buildFocusDetailedReport, buildMemberFocusDossier, loadFocusDossierDailyAudit, loadFocusDossierGeneratedDailies } from "@/lib/data/conviction/focus-dossier-core";
import { listFocusResearchSupplements } from "@/lib/data/conviction/focus-research-supplements";
import { focusDailyMarketCode } from "@/lib/data/conviction/focus-daily-generation-core";
import type { FocusDossierView } from "@/types/focus-dossier";
import type { GeneratedDailyForecastRecord } from "@/lib/weekly-source/types";
import type {
  MemberStockDailyMemberView,
  MemberStockVerificationResult,
  MemberStockWeeklyMemberView,
} from "@/types/member-stock";
import { STATIC_FOCUS_ASSET_IDS, type StaticFocusAssetId } from "@/lib/data/conviction/focus-registry-core";
import { listStaticFocusForecasts } from "@/lib/data/conviction/focus-static-forecast-registry";
import { SPCX_PERIOD_ORDER, SPCX_VISIBLE_PERIOD_ORDER, spcxPeriodMeta } from "@/lib/data/conviction/spcx-forecasts";
import { INTEL_PERIOD_LABELS, INTEL_PERIOD_ORDER, INTEL_VISIBLE_PERIOD_ORDER, intelPeriodMeta } from "@/lib/data/conviction/intel-liuyao-20260822";

export type ConvictionListPagePayload = {
  mode: "publicOnly" | "fullAccess";
  isAdmin: boolean;
  isAuthenticated: boolean;
  cards: ConvictionPublicCard[];
  trackedCount: number;
  latestResearchUpdatedAt: string | null;
  locks: typeof CONVICTION_MEMBER_LOCKS;
  vibeEvidence: Partial<Record<string, VibeEvidencePublicView>>;
  deviceAccessRequired: boolean;
  /** Deprecated list-order field. Always empty; weekly hot ranking is member-only. */
  rankOrder: string[];
  /** Member/admin only; never sent to public users. */
  resonanceSignals: WatchlistResonanceSignal[] | null;
  /** Shared Monday-Sunday window used by the current resonance ranking. */
  resonanceWindow: { start: string; end: string; labelZh: string };
  /** Daily recomputation date for member recommendation list surfaces. */
  asOfDate: string;
};

export async function getConvictionListPagePayload(): Promise<ConvictionListPagePayload> {
  noStore();
  const access = await getAccessUser();
  const cards = await listPublicConvictionCards();
  const membershipAllows = hasConvictionFullAccess(access);
  const deviceGate = membershipAllows && !access.isAdmin ? await getMemberDevicePageAccess() : null;
  const fullAccess = access.isAdmin || (membershipAllows && deviceGate?.status === "ALLOWED");
  const vibeEvidence = fullAccess ? await getVibeEvidenceMap() : {};
  const latestResearchUpdatedAt =
    cards
      .map((c) => c.researchUpdatedAt)
      .sort()
      .at(-1) ?? null;
  const asOfDate = getChinaDateKey(new Date());
  const resonanceSignals = buildWatchlistResonanceRanking(asOfDate);
  const resonanceWindow = targetWeekWindow(asOfDate);
  return {
    mode: fullAccess ? "fullAccess" : "publicOnly",
    isAdmin: access.isAdmin,
    isAuthenticated: access.authenticated,
    cards,
    trackedCount: cards.length,
    latestResearchUpdatedAt,
    locks: CONVICTION_MEMBER_LOCKS,
    vibeEvidence,
    deviceAccessRequired: Boolean(membershipAllows && !access.isAdmin && !fullAccess),
    rankOrder: [], // V7.17: weekly ranking is member-only; never leak through the public dossier index.
    resonanceSignals: fullAccess ? resonanceSignals : null,
    resonanceWindow,
    asOfDate,
  };
}

export type ConvictionPeriodSlot = {
  type: ConvictionForecastType;
  labelZh: string;
  emptyZh: string;
  /** null = not published for this period */
  forecast: ConvictionPeriodForecast | null;
  freshnessStatus: ForecastFreshnessStatus;
};

export type ConvictionDetailPayload = {
  mode: "publicOnly" | "fullAccess";
  isAdmin: boolean;
  isAuthenticated: boolean;
  public: ConvictionPublicCard;
  locks: typeof CONVICTION_MEMBER_LOCKS;
  periodSlots: Array<{ type: ConvictionForecastType; labelZh: string; emptyZh: string; hasResearch: boolean }>;
  vibeEvidence: VibeEvidencePublicView | null;
  deviceAccessRequired: boolean;
  asOfDate: string;
  freshness: ForecastFreshnessSummary;
  /** Member/admin only: current-week multi-horizon metaphysical resonance. */
  resonanceSignal: WatchlistResonanceSignal | null;
  /** Uniform member-only weekly dossier. Never serialized to public-only clients. */
  focusDossier: FocusDossierView | null;
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

type StaticPeriodAssetId = StaticFocusAssetId;
// V7.17.3 A-share static dossiers


const STATIC_PERIOD_ASSET_IDS = new Set<StaticPeriodAssetId>(STATIC_FOCUS_ASSET_IDS);

function isStaticPeriodAsset(value: string): value is StaticPeriodAssetId {
  return STATIC_PERIOD_ASSET_IDS.has(value as StaticPeriodAssetId);
}

function staticPublished(assetId: StaticPeriodAssetId) {
  return listStaticFocusForecasts(assetId);
}

export async function listStaticFocusEvidence(): Promise<Array<{
  assetId: string;
  symbol: string;
  assetType: string;
  exchange: string | null;
  forecasts: ConvictionPeriodForecast[];
}>> {
  const publishedAssets = await listConvictionAssets();
  return [...STATIC_PERIOD_ASSET_IDS].flatMap((assetId) => {
    const asset = publishedAssets.find((item) => item.slug === assetId || item.id === assetId);
    if (!asset) throw new Error(`focus-asset-metadata-unavailable:${assetId}`);
    if (!asset.isPublished || asset.status !== "published") throw new Error(`focus-asset-metadata-unavailable:${assetId}`);
    return [{ assetId, symbol: asset.symbol, assetType: asset.assetType, exchange: asset.exchange ?? null, forecasts: staticPublished(assetId) }];
  });
}

function fullOrder(assetId: StaticPeriodAssetId) {
  if (assetId === "tsla") return TSLA_PERIOD_ORDER;
  if (assetId === "lite") return LITE_PERIOD_ORDER;
  if (isAShareResearchAssetId(assetId)) return A_SHARE_PERIOD_ORDER;
  if (assetId === "cxmt") return LONGXIN_FULL_PERIOD_ORDER;
  if (assetId === "asteroid") return ASTEROID_PERIOD_ORDER;
  if (assetId === "sandisk") return SANDISK_PERIOD_ORDER;
  if (assetId === "nbis") return NBIS_PERIOD_ORDER;
  if (assetId === "hype") return HYPE_UPDATED_PERIOD_ORDER;
  if (assetId === "sol") return SOL_PERIOD_ORDER;
  if (assetId === "eth") return ETH_PERIOD_ORDER;
  if (assetId === "btc") return BTC_PERIOD_ORDER;
  if (assetId === "googl") return GOOGLE_PERIOD_ORDER;
  if (assetId === "msft") return MSFT_PERIOD_ORDER;
  if (assetId === "tencent") return TENCENT_PERIOD_ORDER;
  if (assetId === "kingsoft-office") return VIBE_FOCUS_PERIOD_ORDER;
  if (assetId === "spcx") return SPCX_PERIOD_ORDER;
  if (assetId === "intel") return INTEL_PERIOD_ORDER;
  return PERIOD_ORDER_BY_ASSET[assetId];
}

function visibleOrder(assetId: StaticPeriodAssetId) {
  if (assetId === "tsla") return TSLA_VISIBLE_PERIOD_ORDER;
  if (assetId === "lite") return LITE_VISIBLE_PERIOD_ORDER;
  if (isAShareResearchAssetId(assetId)) return A_SHARE_VISIBLE_PERIOD_ORDER;
  if (assetId === "cxmt") return LONGXIN_VISIBLE_PERIOD_ORDER;
  if (assetId === "asteroid") return ["WEEK", "WEEK_2", "MONTH_1"] as ConvictionForecastType[];
  if (assetId === "sandisk") return SANDISK_VISIBLE_PERIOD_ORDER;
  if (assetId === "nbis") return NBIS_VISIBLE_PERIOD_ORDER;
  if (assetId === "hype") return HYPE_UPDATED_VISIBLE_PERIOD_ORDER;
  if (assetId === "sol") return SOL_VISIBLE_PERIOD_ORDER;
  if (assetId === "eth") return ETH_VISIBLE_PERIOD_ORDER;
  if (assetId === "btc") return ["WEEK_2", "WEEK_3", "WEEK_4", "MONTH_1", "MONTH_3"] as ConvictionForecastType[];
  if (assetId === "googl") return GOOGLE_VISIBLE_PERIOD_ORDER;
  if (assetId === "msft") return MSFT_VISIBLE_PERIOD_ORDER;
  if (assetId === "tencent") return TENCENT_VISIBLE_PERIOD_ORDER;
  if (assetId === "kingsoft-office") return VIBE_FOCUS_VISIBLE_PERIOD_ORDER;
  if (assetId === "spcx") return SPCX_VISIBLE_PERIOD_ORDER;
  if (assetId === "intel") return INTEL_VISIBLE_PERIOD_ORDER;
  return VISIBLE_PERIOD_ORDER_BY_ASSET[assetId];
}

function periodLabelForAsset(assetId: StaticPeriodAssetId, type: ConvictionForecastType) {
  if (assetId === "tsla") return tslaPeriodLabel20260816(type);
  if (assetId === "lite") return litePeriodLabel20260816(type);
  if (isAShareResearchAssetId(assetId)) return aSharePeriodLabel20260810(type);
  if (assetId === "hype") return periodLabelForHype20260809(type);
  if (assetId === "sol") return periodLabelForSol20260809(type);
  if (assetId === "tencent" && TENCENT_PERIOD_LABELS[type]) {
    return TENCENT_PERIOD_LABELS[type]!;
  }
  if (assetId === "btc") {
    const btcLabels: Partial<Record<ConvictionForecastType, { zh: string; en: string; emptyZh: string }>> = {
      WEEK: { zh: "8/1–9", en: "Aug 1–9", emptyZh: "该周期预测尚未发布" },
      WEEK_2: { zh: "8/10–16", en: "Aug 10–16", emptyZh: "该周期预测尚未发布" },
      WEEK_3: { zh: "8/17–23", en: "Aug 17–23", emptyZh: "该周期预测尚未发布" },
      WEEK_4: { zh: "8/24–30", en: "Aug 24–30", emptyZh: "该周期预测尚未发布" },
      MONTH_1: { zh: "1个月", en: "1M", emptyZh: "该周期预测尚未发布" },
      MONTH_3: { zh: "3个月", en: "3M", emptyZh: "该周期预测尚未发布" },
      YEAR_1: { zh: "1年", en: "1Y", emptyZh: "该周期预测尚未发布" },
      YEAR_10: { zh: "10年", en: "10Y", emptyZh: "该周期预测尚未发布" },
    };
    if (btcLabels[type]) return btcLabels[type]!;
  }
  if (assetId === "sandisk") {
    return SANDISK_PERIOD_LABELS[type] ?? ASTEROID_PERIOD_LABELS[type];
  }
  if (assetId === "nbis") {
    return NBIS_PERIOD_LABELS[type] ?? ASTEROID_PERIOD_LABELS[type];
  }
  if (assetId === "intel") {
    return INTEL_PERIOD_LABELS[type] ?? ASTEROID_PERIOD_LABELS[type];
  }
  if (assetId === "asteroid" && type === "WEEK") {
    return { ...ASTEROID_PERIOD_LABELS[type], zh: "本周逐日" };
  }
  if (assetId === "asteroid" && type === "WEEK_2") {
    return { ...ASTEROID_PERIOD_LABELS[type], zh: "下周逐日" };
  }
  return ASTEROID_PERIOD_LABELS[type];
}

function buildStaticPeriodSlots(
  assetId: StaticPeriodAssetId,
  includeBody: boolean,
  asOfDate: string
): ConvictionPeriodSlot[] {
  const published = staticPublished(assetId);
  return fullOrder(assetId).map((type) => {
    const hit = published
      .filter((f) => f.forecastType === type && f.status === "published")
      .sort((a, b) => b.version - a.version || b.publishedAt.localeCompare(a.publishedAt))[0] ?? null;
    return {
      type,
      labelZh: periodLabelForAsset(assetId, type).zh,
      emptyZh: periodLabelForAsset(assetId, type).emptyZh,
      forecast: includeBody ? hit : null,
      freshnessStatus: hit
        ? forecastFreshnessStatus(hit.periodStart, hit.periodEnd, asOfDate)
        : "MISSING",
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
  if (assetId === "tsla") return tslaPeriodMeta20260816();
  if (assetId === "lite") return litePeriodMeta20260816();
  if (isAShareResearchAssetId(assetId)) return aSharePeriodMeta20260810(assetId);
  if (assetId === "sandisk") return sandiskPeriodMeta();
  if (assetId === "nbis") return nbisPeriodMeta();
  if (assetId === "eth") return ethPeriodMeta();
  if (assetId === "hype") return hypePeriodMeta20260809();
  if (assetId === "sol") return solPeriodMeta20260809();
  if (assetId === "mu") return periodMetaForAsset(assetId);
  if (assetId === "googl") return googlePeriodMeta();
  if (assetId === "msft") return msftPeriodMeta();
  if (assetId === "tencent") return tencentPeriodMeta();
  if (assetId === "kingsoft-office") return vibeFocusPeriodMeta(assetId);
  if (assetId === "spcx") return spcxPeriodMeta();
  if (assetId === "intel") return intelPeriodMeta();
  const published = staticPublished(assetId);
  return visibleOrder(assetId).map((type) => ({
    type,
    labelZh: periodLabelForAsset(assetId, type).zh,
    emptyZh: periodLabelForAsset(assetId, type).emptyZh,
    hasResearch: published.some((f) => f.forecastType === type),
  }));
}

export async function getConvictionDetailPayload(
  slug: string
): Promise<ConvictionDetailPayload | null> {
  noStore();
  const asset = await getConvictionAssetBySlug(slug);
  if (!asset) return null;
  const capturedNow = new Date();
  const asOfDate = getChinaDateKey(capturedNow);
  const resonanceSignal = buildWatchlistResonanceRanking(asOfDate).find((item) => item.slug === slug) ?? null;
  const access = await getAccessUser();
  const membershipAllows = hasConvictionFullAccess(access);
  const deviceGate = membershipAllows && !access.isAdmin ? await getMemberDevicePageAccess() : null;
  const full = access.isAdmin || (membershipAllows && deviceGate?.status === "ALLOWED");
  const deviceAccessRequired = Boolean(membershipAllows && !access.isAdmin && !full);
  const pub = toPublicCard(asset);
  const staticPeriodAsset = isStaticPeriodAsset(asset.slug) ? asset.slug : null;
  const vibeSnapshot = full ? await getVibeEvidence(asset.id) : null;
  const vibeEvidence = vibeSnapshot ? toVibePublicView(vibeSnapshot) : null;

  const staticPeriodSlots = staticPeriodAsset
    ? buildStaticPeriodSlots(staticPeriodAsset, false, asOfDate)
    : [];
  const visiblePeriodMeta = staticPeriodAsset
    ? prioritizeCurrentPeriods(publicPeriodMeta(staticPeriodAsset), staticPeriodSlots)
    : [];

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
      deviceAccessRequired,
      asOfDate,
      freshness: summarizeForecastFreshness(
        staticPeriodAsset
          ? staticPeriodSlots.map((slot) => slot.freshnessStatus)
          : [],
        asOfDate
      ),
      resonanceSignal: null,
      focusDossier: null,
      forecast: null,
    };
  }

  if (staticPeriodAsset) {
    const publishedForecasts = staticPublished(staticPeriodAsset);
    const periods = await attachAdminKeyDates(
      staticPeriodAsset,
      buildStaticPeriodSlots(staticPeriodAsset, true, asOfDate)
    );
    const supplementalEvidence = listFocusResearchSupplements(staticPeriodAsset);
    const baseDossier = buildFocusDetailedReport({
      assetId: staticPeriodAsset,
      forecasts: publishedForecasts,
      asOfDate,
      nowMs: capturedNow.getTime(),
      supplementalEvidence,
    });
    let generatedDailies: GeneratedDailyForecastRecord[] = [];
    let generatedDailyAudit: GeneratedDailyForecastRecord[] = [];
    if (baseDossier.periodStart && baseDossier.periodEnd) {
      try {
        const { listFocusGeneratedDailyAuditVersions, listLatestGeneratedDailiesForMarketDates } = await import("@/lib/weekly-source/store");
        const sourceForecast = baseDossier.dailyAuthority
          ? publishedForecasts.find((forecast) => forecast.id === baseDossier.dailyAuthority!.forecastId) ?? null
          : publishedForecasts.find((forecast) =>
              forecast.periodStart === baseDossier.periodStart &&
              forecast.periodEnd === baseDossier.periodEnd &&
              forecast.version === baseDossier.version
            ) ?? null;
        const marketCode = focusDailyMarketCode(staticPeriodAsset);
        [generatedDailies, generatedDailyAudit] = await Promise.all([
          loadFocusDossierGeneratedDailies({
            dossier: baseDossier,
            marketCode,
            read: (code, dates) => listLatestGeneratedDailiesForMarketDates(code, dates, { readOnly: true }),
          }),
          sourceForecast
            ? loadFocusDossierDailyAudit({
                accessMode: "fullAccess",
                dossier: baseDossier,
                marketCode,
                sourceWeeklyForecastId: sourceForecast.id,
                read: listFocusGeneratedDailyAuditVersions,
              })
            : Promise.resolve([]),
        ]);
      } catch {
        // Display remains available from immutable static evidence when the optional
        // persisted daily research reader is unavailable.
      }
    }
    return {
      mode: "fullAccess",
      isAdmin: access.isAdmin,
      isAuthenticated: true,
      public: pub,
      locks: CONVICTION_MEMBER_LOCKS,
      periodSlots: visiblePeriodMeta,
      vibeEvidence,
      deviceAccessRequired,
      asOfDate,
      freshness: summarizeForecastFreshness(periods.map((slot) => slot.freshnessStatus), asOfDate),
      resonanceSignal,
      focusDossier: buildFocusDetailedReport({
        assetId: staticPeriodAsset,
        forecasts: publishedForecasts,
        asOfDate,
        nowMs: capturedNow.getTime(),
        generatedDailies,
        generatedDailyAudit,
        supplementalEvidence,
      }),
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
      deviceAccessRequired,
      asOfDate,
      freshness: summarizeForecastFreshness([], asOfDate),
      resonanceSignal,
      focusDossier: buildFocusDetailedReport({ assetId: asset.id, forecasts: [], asOfDate, nowMs: capturedNow.getTime() }),
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
    deviceAccessRequired,
    asOfDate,
    freshness: summarizeForecastFreshness(
      [
        today ? forecastFreshnessStatus(today.forecastDate, today.forecastDate, asOfDate) : "MISSING",
        tomorrow ? forecastFreshnessStatus(tomorrow.forecastDate, tomorrow.forecastDate, asOfDate) : "MISSING",
        weekly ? forecastFreshnessStatus(weekly.weekStart, weekly.weekEnd, asOfDate) : "MISSING",
      ],
      asOfDate
    ),
    resonanceSignal,
    focusDossier: buildMemberFocusDossier({
      assetId: asset.id,
      asOfDate,
      nowMs: capturedNow.getTime(),
      weekly,
      daily: [today, tomorrow],
    }),
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

export type ConvictionWeeklyFreshnessOverview = {
  asOfDate: string;
  total: number;
  current: number;
  expired: number;
  missing: number;
  affectedAssets: string[];
};

const STATIC_ASSET_LABELS: Record<StaticPeriodAssetId, string> = {
  tsla: "TSLA",
  lite: "LITE",
  "ganfeng-lithium": "赣锋锂业",
  "lian-tech": "利安科技",
  "lexin-medical": "乐心医疗",
  cxmt: "长鑫科技",
  asteroid: "太空狗",
  sandisk: "闪迪",
  nbis: "Nebius",
  mu: "美光",
  hype: "HYPE",
  sol: "SOL",
  eth: "ETH",
  btc: "BTC",
  googl: "Alphabet",
  msft: "微软",
  tencent: "腾讯",
  "kingsoft-office": "金山办公",
  spcx: "SPCX",
  intel: "英特尔",
};

/** Admin freshness guard: a finished weekly study cannot remain silently current. */
export function getConvictionWeeklyFreshnessOverview(
  now = new Date()
): ConvictionWeeklyFreshnessOverview {
  const asOfDate = getChinaDateKey(now);
  let current = 0;
  let expired = 0;
  let missing = 0;
  const affectedAssets: string[] = [];
  for (const assetId of STATIC_PERIOD_ASSET_IDS) {
    const weekly = staticPublished(assetId).find((item) => item.forecastType === "WEEK");
    const status = weekly
      ? forecastFreshnessStatus(weekly.periodStart, weekly.periodEnd, asOfDate)
      : "MISSING";
    if (status === "CURRENT" || status === "UPCOMING") current += 1;
    else if (status === "EXPIRED") {
      expired += 1;
      affectedAssets.push(STATIC_ASSET_LABELS[assetId]);
    } else {
      missing += 1;
      affectedAssets.push(STATIC_ASSET_LABELS[assetId]);
    }
  }
  return {
    asOfDate,
    total: STATIC_PERIOD_ASSET_IDS.size,
    current,
    expired,
    missing,
    affectedAssets,
  };
}
