/**
 * Daily forecast store + lifecycle.
 * One record per (asset, forecastForDate); status/accessLevel evolve — no duplicate copies.
 *
 * Today / tomorrow routing uses Beijing calendar dates:
 *   today    = forecastForDate === Beijing today
 *   tomorrow = earliest published/locked batch with forecastForDate > Beijing today
 *              (never hardcode “calendar tomorrow”; never use Wave as subject)
 */
import type {
  DailyForecast,
  DailyForecastTeaser,
  TomorrowForecastPublicSummary,
} from "@/types/daily-forecast";
import {
  isTradingDay,
  sessionLabelForMarket,
} from "@/lib/calendar/next-trading-day";
import { getBeijingTodayKey, getBeijingTomorrowKey } from "@/lib/calendar/beijing-date";
import { formatDateChina, formatDateTimeChina } from "@/lib/utils/datetime";
import { PUBLISHED_DAILY_FORECASTS } from "@/lib/data/published-daily-forecasts-20260728";
import {
  PUBLISHED_DAILY_FORECASTS_20260730,
  PUBLISHED_DAILY_FORECASTS_20260731,
} from "@/lib/data/published-daily-forecasts-20260730";
import { applyDailyPriceOverlay } from "@/lib/data/apply-price-overlays";
import { applyBeijingForecastDateRoll } from "@/lib/data/daily-forecast-date-roll";
import { normalizeFormalDirection } from "@/lib/forecasts/formal-direction";

export const CORE_TOMORROW_ASSETS = [
  {
    assetId: "bitcoin",
    assetName: "比特币",
    symbol: "BTC",
    market: "crypto" as const,
  },
  {
    assetId: "sp500",
    assetName: "标普500指数",
    symbol: "SPX",
    market: "us" as const,
  },
  {
    assetId: "nasdaq-100",
    assetName: "纳斯达克100",
    symbol: "NDX",
    market: "us" as const,
  },
  {
    assetId: "shanghai-composite",
    assetName: "上证指数",
    symbol: "000001.SS",
    market: "cn" as const,
  },
  {
    assetId: "hang-seng",
    assetName: "恒生科技指数",
    symbol: "HSTECH",
    market: "hk" as const,
  },
  {
    assetId: "gold",
    assetName: "国际金价",
    symbol: "GLD",
    market: "commodity" as const,
  },
  {
    assetId: "wti-crude",
    assetName: "WTI原油",
    symbol: "WTI",
    market: "commodity" as const,
  },
] as const;

function parseIso(iso: string): Date {
  const parts = iso.split("-").map(Number);
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(y, m - 1, d);
}

function eveningIso(dateIso: string, hour = 21, minute = 30): string {
  const d = parseIso(dateIso);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/**
 * Publish eligibility. Both locked system forecasts and administrator overrides are valid.
 * The site must never be blank merely because an administrator did not act.
 */
export function isHumanPublishedForecast(f: DailyForecast): boolean {
  if (f.status === "draft" || f.status === "scheduled") return false;
  const hasPublisher = Boolean(f.publishedBy);
  const isSystemPublisher = f.publishedBy === "weekly-to-daily" || f.publishedBy === "moox-auto-engine";
  const hasReview = Boolean(f.reviewedBy && f.reviewedAt);
  if (!hasPublisher || (!hasReview && !isSystemPublisher)) return false;
  if (f.confidence <= 0) return false;
  if (!f.summary || f.summary === "研究尚未完成") return false;
  return f.status === "published" || f.status === "revised" || f.status === "expired" || f.status === "verified";
}

/**
 * When a batch is shown as “今日”, rewrite mistaken “明日 / 下一交易日” in display copy only.
 * Does not mutate other pages’ tomorrow-facing content.
 */
export function rewriteTodayFacingCopy(
  text: string | undefined,
  forecastForDate: string,
  now = new Date()
): string | undefined {
  if (!text) return text;
  if (forecastForDate !== getBeijingTodayKey(now)) return text;
  return text.replaceAll("下一交易日", "今日").replaceAll("明日", "今日");
}

export function applyTradingSessionEligibility(f: DailyForecast): DailyForecast {
  if (isTradingDay(f.market, f.forecastForDate)) return f;
  return {
    ...f,
    accuracyEligible: false,
    accuracyExclusionReason:
      f.accuracyExclusionReason || "该市场当日休市，不计入正式日度验证",
  };
}

export function applyTodayFacingCopy(f: DailyForecast, now = new Date()): DailyForecast {
  const today = getBeijingTodayKey(now);
  if (f.forecastForDate !== today) return f;
  return {
    ...f,
    headline: rewriteTodayFacingCopy(f.headline, f.forecastForDate, now),
    summary: rewriteTodayFacingCopy(f.summary, f.forecastForDate, now) ?? f.summary,
    expectedPath: f.expectedPath?.map(
      (step) => rewriteTodayFacingCopy(step, f.forecastForDate, now) ?? step
    ),
    directionLabel: normalizeFormalDirection(f.directionLabel ?? f.direction),
  };
}

/**
 * Apply lifecycle in memory (same record, no clones for stages).
 * member tomorrow → public today after publicAt / forecast date arrival.
 */
export function applyForecastLifecycle(forecast: DailyForecast, now = new Date()): DailyForecast {
  if (forecast.status === "draft" || forecast.status === "reviewed" || forecast.status === "scheduled") {
    return forecast;
  }
  if (forecast.status === "verified") {
    return forecast;
  }

  const next = { ...forecast };
  const today = getBeijingTodayKey(now);
  const publicAt = next.publicAt ? new Date(next.publicAt) : null;

  // On/after forecast calendar day (Beijing), published member content becomes public today view.
  if (
    next.forecastForDate <= today &&
    isHumanPublishedForecast(next) &&
    (!publicAt || now.getTime() >= publicAt.getTime())
  ) {
    next.accessLevel = "public";
  }

  const forDay = parseIso(next.forecastForDate);
  const dayEnd = new Date(forDay.getFullYear(), forDay.getMonth(), forDay.getDate() + 1);
  if (
    now.getTime() >= dayEnd.getTime() &&
    (next.status === "published" || next.status === "revised") &&
    next.accessLevel === "public"
  ) {
    next.status = "expired";
  }

  return next;
}

function buildPendingTomorrow(now: Date): DailyForecast[] {
  const tomorrow = getBeijingTomorrowKey(now);
  return CORE_TOMORROW_ASSETS.map((asset) => ({
    id: `NEXT-${asset.symbol}-PENDING`,
    assetId: asset.assetId,
    assetName: asset.assetName,
    symbol: asset.symbol,
    market: asset.market,
    forecastForDate: tomorrow,
    tradingSessionLabel: sessionLabelForMarket(asset.market),
    publishedAt: "",
    updatedAt: "",
    publicAt: eveningIso(tomorrow, 0, 0),
    accessLevel: "member" as const,
    status: "draft" as const,
    version: 0,
    direction: "中性" as const,
    confidence: 0,
    summary: "研究尚未完成",
  }));
}

/** In-memory curated overrides (human-published). */
const CURATED_FORECASTS: DailyForecast[] = [
  ...PUBLISHED_DAILY_FORECASTS,
  ...PUBLISHED_DAILY_FORECASTS_20260730,
  ...PUBLISHED_DAILY_FORECASTS_20260731,
];

function allRawForecasts(now: Date): DailyForecast[] {
  const pending = buildPendingTomorrow(now);
  const map = new Map<string, DailyForecast>();
  for (const f of pending) {
    map.set(`${f.assetId}:${f.forecastForDate}`, f);
  }
  for (const f of CURATED_FORECASTS) {
    map.set(`${f.assetId}:${f.forecastForDate}`, f);
  }
  return Array.from(map.values());
}

export function listDailyForecasts(now = new Date()): DailyForecast[] {
  return applyBeijingForecastDateRoll(allRawForecasts(now), now)
    .map(applyTradingSessionEligibility)
    .map((f) => applyForecastLifecycle(f, now))
    .map(applyDailyPriceOverlay);
}

export function getForecastById(id: string, now = new Date()): DailyForecast | undefined {
  return listDailyForecasts(now).find((f) => f.id === id);
}

/** Earliest published batch date strictly after Beijing today. */
export function getNextPublishedForecastDateKey(now = new Date()): string | null {
  const today = getBeijingTodayKey(now);
  const dates = [
    ...new Set(
      listDailyForecasts(now)
        .filter(isHumanPublishedForecast)
        .map((f) => f.forecastForDate)
        .filter((d) => d > today)
    ),
  ].sort();
  return dates[0] ?? null;
}

/**
 * Next formal member batch: forecastForDate > Beijing today, published/locked only.
 * Empty when no future formal batch exists — never substitute Wave / today / drafts.
 */
export function getTomorrowCoreForecasts(now = new Date()): DailyForecast[] {
  const all = listDailyForecasts(now);
  const nextDate = getNextPublishedForecastDateKey(now);
  if (!nextDate) return [];

  return CORE_TOMORROW_ASSETS.map((asset) => {
    return all.find(
      (f) =>
        f.assetId === asset.assetId &&
        f.forecastForDate === nextDate &&
        isHumanPublishedForecast(f)
    );
  }).filter((f): f is DailyForecast => Boolean(f));
}

/**
 * Public today: forecastForDate === Beijing today AND human-published.
 * Member-published tomorrow records auto-roll in when their date arrives.
 */
export function getPublicTodayForecasts(now = new Date()): DailyForecast[] {
  const all = listDailyForecasts(now);
  const today = getBeijingTodayKey(now);
  return CORE_TOMORROW_ASSETS.map((asset) => {
    return all.find(
      (f) =>
        f.assetId === asset.assetId &&
        f.forecastForDate === today &&
        isTradingDay(f.market, today) &&
        isHumanPublishedForecast(f)
    );
  }).filter((f): f is DailyForecast => Boolean(f));
}

export function toTeaser(f: DailyForecast): DailyForecastTeaser {
  return {
    id: f.id,
    assetId: f.assetId,
    assetName: f.assetName,
    symbol: f.symbol,
    market: f.market,
    forecastForDate: f.forecastForDate,
    tradingSessionLabel: f.tradingSessionLabel,
    status: f.status,
    updatedAt: f.updatedAt,
    publishedAt: f.publishedAt,
    isReady: isHumanPublishedForecast(f),
  };
}

/** Safe public summary for non-member homepage / RSC props. */
export function buildTomorrowPublicSummary(now = new Date()): TomorrowForecastPublicSummary {
  const forecasts = getTomorrowCoreForecasts(now);
  const teasers = forecasts.map(toTeaser);
  const nextDate = getNextPublishedForecastDateKey(now) ?? getBeijingTomorrowKey(now);
  const published = forecasts.filter((f) => isHumanPublishedForecast(f));
  const drafts = forecasts.filter((f) => !isHumanPublishedForecast(f));
  const updatedTimes = published
    .map((f) => f.updatedAt || f.publishedAt)
    .filter(Boolean)
    .sort();
  const last = updatedTimes[updatedTimes.length - 1];
  const lastUpdatedLabel = last ? formatDateTimeChina(last) : "—";

  return {
    nextDateLabel: formatDateChina(nextDate),
    nextDateIso: nextDate,
    assetCount: forecasts.length,
    assetNames: forecasts.map((f) => f.assetName),
    lastUpdatedLabel,
    publishedCount: published.length,
    draftCount: drafts.length,
    allDraft: published.length === 0,
    teasers,
  };
}

/** Full member payloads — call only after canAccessForecast. */
export function getMemberTomorrowForecasts(now = new Date()): DailyForecast[] {
  return getTomorrowCoreForecasts(now);
}

export function getAllMemberForecasts(now = new Date()): DailyForecast[] {
  return listDailyForecasts(now).filter(
    (f) => f.accessLevel === "member" || f.accessLevel === "premium" || isHumanPublishedForecast(f)
  );
}

export function displayDirection(f: DailyForecast): string {
  return normalizeFormalDirection(f.directionLabel ?? f.direction);
}

/** Strip sensitive forecast fields for unauthorized responses. */
export function toTodayPublicTeaserMeta(forecasts: DailyForecast[]): {
  published: boolean;
  marketCount: number;
  forecastDate: string | null;
  publishedAt: string | null;
  locked: true;
} {
  const ready = forecasts.filter(isHumanPublishedForecast);
  return {
    published: ready.length > 0,
    marketCount: ready.length,
    forecastDate: ready[0]?.forecastForDate ?? null,
    publishedAt:
      ready
        .map((f) => f.publishedAt)
        .filter(Boolean)
        .sort()[0] ?? null,
    locked: true,
  };
}
