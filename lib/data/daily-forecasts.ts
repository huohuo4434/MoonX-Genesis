/**
 * Daily forecast store + lifecycle.
 * One record per (asset, forecastForDate); status/accessLevel evolve — no duplicate copies.
 *
 * Today / tomorrow routing uses Beijing calendar dates:
 *   today    = forecastForDate === Beijing today
 *   tomorrow = forecastForDate === Beijing tomorrow
 */
import type {
  DailyForecast,
  DailyForecastTeaser,
  TomorrowForecastPublicSummary,
} from "@/types/daily-forecast";
import {
  sessionLabelForMarket,
} from "@/lib/calendar/next-trading-day";
import { getBeijingTodayKey, getBeijingTomorrowKey } from "@/lib/calendar/beijing-date";
import { formatDateChina, formatDateTimeChina } from "@/lib/utils/datetime";
import { PUBLISHED_DAILY_FORECASTS } from "@/lib/data/published-daily-forecasts-20260728";
import { applyDailyPriceOverlay } from "@/lib/data/apply-price-overlays";
import { applyBeijingForecastDateRoll } from "@/lib/data/daily-forecast-date-roll";

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
    assetName: "黄金ETF",
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

/** Human-reviewed publish gate — AI must not auto-publish. */
export function isHumanPublishedForecast(f: DailyForecast): boolean {
  if (f.status === "draft" || f.status === "scheduled") return false;
  if (!f.reviewedBy || !f.reviewedAt || !f.publishedBy) return false;
  if (f.confidence <= 0) return false;
  if (f.summary === "研究尚未完成") return false;
  return f.status === "published" || f.status === "revised" || f.status === "expired" || f.status === "verified";
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
const CURATED_FORECASTS: DailyForecast[] = [...PUBLISHED_DAILY_FORECASTS];

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
    .map((f) => applyForecastLifecycle(f, now))
    .map(applyDailyPriceOverlay);
}

export function getForecastById(id: string, now = new Date()): DailyForecast | undefined {
  return listDailyForecasts(now).find((f) => f.id === id);
}

/** Tomorrow = Beijing tomorrow for all core assets. */
export function getTomorrowCoreForecasts(now = new Date()): DailyForecast[] {
  const all = listDailyForecasts(now);
  const tomorrow = getBeijingTomorrowKey(now);
  return CORE_TOMORROW_ASSETS.map((asset) => {
    const published = all.find(
      (f) =>
        f.assetId === asset.assetId &&
        f.forecastForDate === tomorrow &&
        isHumanPublishedForecast(f)
    );
    if (published) return published;
    return (
      all.find((f) => f.assetId === asset.assetId && f.forecastForDate === tomorrow) ??
      all.find((f) => f.id === `NEXT-${asset.symbol}-PENDING`)!
    );
  });
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
  const tomorrow = getBeijingTomorrowKey(now);
  const published = forecasts.filter((f) => isHumanPublishedForecast(f));
  const drafts = forecasts.filter((f) => !isHumanPublishedForecast(f));
  const updatedTimes = published
    .map((f) => f.updatedAt || f.publishedAt)
    .filter(Boolean)
    .sort();
  const last = updatedTimes[updatedTimes.length - 1];
  const lastUpdatedLabel = last ? formatDateTimeChina(last) : "—";

  return {
    nextDateLabel: formatDateChina(tomorrow),
    nextDateIso: tomorrow,
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
  return f.directionLabel ?? f.direction;
}
