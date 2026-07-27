/**
 * Daily forecast store + lifecycle.
 * One record per (asset, forecastForDate); status/accessLevel evolve — no duplicate copies.
 *
 * Real payment/login not connected: member content is gated by lib/access/member-preview.
 */
import type {
  DailyForecast,
  DailyForecastTeaser,
  TomorrowForecastPublicSummary,
} from "@/types/daily-forecast";
import {
  formatForecastDateZh,
  getCurrentSessionDate,
  getNextForecastDate,
  sessionLabelForMarket,
} from "@/lib/calendar/next-trading-day";

export const CORE_TOMORROW_ASSETS = [
  {
    assetId: "bitcoin",
    assetName: "比特币",
    symbol: "BTC",
    market: "crypto" as const,
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
    symbol: "SSEC",
    market: "cn" as const,
  },
  {
    assetId: "hang-seng",
    assetName: "恒生科技",
    symbol: "HSTECH",
    market: "hk" as const,
  },
  {
    assetId: "gold",
    assetName: "国际黄金",
    symbol: "XAU",
    market: "commodity" as const,
  },
] as const;

function toIsoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIso(iso: string): Date {
  const parts = iso.split("-").map(Number);
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(y, m - 1, d);
}

function addDaysIso(iso: string, n: number): string {
  const d = parseIso(iso);
  d.setDate(d.getDate() + n);
  return toIsoDateLocal(d);
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
 * member tomorrow → public today after publicAt → expired after session → verified after review.
 */
export function applyForecastLifecycle(forecast: DailyForecast, now = new Date()): DailyForecast {
  if (forecast.status === "draft" || forecast.status === "reviewed" || forecast.status === "scheduled") {
    return forecast;
  }
  if (forecast.status === "verified") {
    return forecast;
  }

  const next = { ...forecast };
  const forDay = parseIso(next.forecastForDate);
  const dayStart = new Date(forDay.getFullYear(), forDay.getMonth(), forDay.getDate());
  const publicAt = next.publicAt ? new Date(next.publicAt) : dayStart;

  // Phase 2: on forecast day after publicAt → public "today"
  if (now.getTime() >= publicAt.getTime() && now.getTime() >= dayStart.getTime()) {
    next.accessLevel = "public";
  }

  // Phase 3: after forecast calendar day ends → expired (await verification)
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
  return CORE_TOMORROW_ASSETS.map((asset) => {
    const forecastForDate = getNextForecastDate(asset.market, now);
    return {
      id: `NEXT-${asset.symbol}-PENDING`,
      assetId: asset.assetId,
      assetName: asset.assetName,
      symbol: asset.symbol,
      market: asset.market,
      forecastForDate,
      tradingSessionLabel: sessionLabelForMarket(asset.market),
      publishedAt: eveningIso(toIsoDateLocal(now)),
      updatedAt: eveningIso(toIsoDateLocal(now)),
      // Becomes public at start of forecast day (member-first until then)
      publicAt: eveningIso(forecastForDate, 0, 0),
      accessLevel: "member" as const,
      status: "draft" as const,
      version: 1,
      direction: "中性" as const,
      confidence: 0,
      summary: "研究尚未完成",
      // Publish metadata intentionally absent until human review
    };
  });
}

/**
 * Today's public verifying slots — separate forecastForDate from tomorrow.
 * Placeholders only (confidence 0); not fabricated directional calls.
 */
function buildTodayVerifying(now: Date): DailyForecast[] {
  return CORE_TOMORROW_ASSETS.map((asset) => {
    const forecastForDate = getCurrentSessionDate(asset.market, now);
    const firstPublishedDay = addDaysIso(forecastForDate, -1);
    return {
      id: `TODAY-${asset.symbol}-VERIFY`,
      assetId: asset.assetId,
      assetName: asset.assetName,
      symbol: asset.symbol,
      market: asset.market,
      forecastForDate,
      tradingSessionLabel: "当前交易日",
      publishedAt: eveningIso(firstPublishedDay),
      updatedAt: eveningIso(firstPublishedDay),
      publicAt: eveningIso(firstPublishedDay),
      accessLevel: "public" as const,
      status: "published" as const,
      version: 1,
      direction: "中性" as const,
      confidence: 0,
      summary: "研究尚未完成",
      reviewedBy: "editor-placeholder",
      reviewedAt: eveningIso(firstPublishedDay, 20, 0),
      publishedBy: "editor-placeholder",
      correctionNote: undefined,
    };
  });
}

/** In-memory curated overrides (human-published). Empty until editors add real calls. */
const CURATED_FORECASTS: DailyForecast[] = [];

function allRawForecasts(now: Date): DailyForecast[] {
  const pending = buildPendingTomorrow(now);
  const today = buildTodayVerifying(now);
  // Curated wins on same id / same asset+date
  const map = new Map<string, DailyForecast>();
  for (const f of [...today, ...pending, ...CURATED_FORECASTS]) {
    const key = `${f.assetId}:${f.forecastForDate}`;
    map.set(key, f);
  }
  return Array.from(map.values());
}

export function listDailyForecasts(now = new Date()): DailyForecast[] {
  return allRawForecasts(now).map((f) => applyForecastLifecycle(f, now));
}

export function getForecastById(id: string, now = new Date()): DailyForecast | undefined {
  return listDailyForecasts(now).find((f) => f.id === id);
}

/** Tomorrow slots for homepage core assets (by each market's next session). */
export function getTomorrowCoreForecasts(now = new Date()): DailyForecast[] {
  const all = listDailyForecasts(now);
  return CORE_TOMORROW_ASSETS.map((asset) => {
    const nextDate = getNextForecastDate(asset.market, now);
    return (
      all.find((f) => f.assetId === asset.assetId && f.forecastForDate === nextDate) ??
      all.find((f) => f.id === `NEXT-${asset.symbol}-PENDING`)!
    );
  });
}

/**
 * Public today: forecastForDate matches current session AND publicAt <= now.
 * Never returns member-only fields via callers that strip — use toTeaser for public HTML.
 */
export function getPublicTodayForecasts(now = new Date()): DailyForecast[] {
  const all = listDailyForecasts(now);
  return CORE_TOMORROW_ASSETS.map((asset) => {
    const session = getCurrentSessionDate(asset.market, now);
    const match = all.find(
      (f) =>
        f.assetId === asset.assetId &&
        f.forecastForDate === session &&
        f.accessLevel === "public" &&
        (!f.publicAt || new Date(f.publicAt).getTime() <= now.getTime())
    );
    return match;
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
  const dates = [...new Set(forecasts.map((f) => f.forecastForDate))].sort();
  const primaryDate = dates[0] ?? getNextForecastDate("us", now);
  const updatedTimes = forecasts
    .map((f) => f.updatedAt || f.publishedAt)
    .filter(Boolean)
    .sort();
  const last = updatedTimes[updatedTimes.length - 1];
  const lastUpdatedLabel = last
    ? new Date(last).toLocaleTimeString("zh-CN", {
        timeZone: "Asia/Shanghai",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "—";

  return {
    nextDateLabel: formatForecastDateZh(primaryDate),
    nextDateIso: primaryDate,
    assetCount: forecasts.length,
    assetNames: forecasts.map((f) => f.assetName),
    lastUpdatedLabel,
    publishedCount: forecasts.filter((f) => f.status === "published" || f.status === "revised").length,
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
