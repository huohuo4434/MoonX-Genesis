/**
 * Map accuracy-store published daily forecasts into legacy DailyForecast shape for homepage today view.
 */
import "server-only";

import { listDailyForecastRecords } from "@/lib/data/daily-accuracy-store";
import { sessionLabelForMarket } from "@/lib/calendar/next-trading-day";
import type { DailyForecast, DailyForecastMarket } from "@/types/daily-forecast";
import type { DailyForecastRecord } from "@/types/daily-accuracy";

function marketToLegacy(m: DailyForecastRecord["market"]): DailyForecastMarket {
  if (m === "CRYPTO") return "crypto";
  if (m === "US") return "us";
  if (m === "CN") return "cn";
  return "hk";
}

function directionToLegacy(d: DailyForecastRecord["direction"]): DailyForecast["direction"] {
  if (d === "UP") return "看涨";
  if (d === "DOWN") return "看跌";
  return "中性";
}

function assetIdFromSymbol(symbol: string): string {
  const map: Record<string, string> = {
    BTC: "bitcoin",
    NDX: "nasdaq-100",
    SSEC: "shanghai-composite",
    HSTECH: "hang-seng",
    GLD: "gold",
  };
  return map[symbol] ?? symbol.toLowerCase();
}

function bjDateKey(now = new Date()): string {
  return new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export async function getPublishedAccuracyForecastsForToday(now = new Date()): Promise<DailyForecast[]> {
  const today = bjDateKey(now);
  const records = await listDailyForecastRecords();
  return records
    .filter(
      (r) =>
        r.forecastDate === today &&
        !r.isSystemTest &&
        (r.status === "published" || r.status === "verifying" || r.status === "verified")
    )
    .map((r) => {
      const market = marketToLegacy(r.market);
      const f: DailyForecast = {
        id: r.id,
        assetId: assetIdFromSymbol(r.symbol),
        assetName: r.assetName,
        symbol: r.symbol,
        market,
        forecastForDate: r.forecastDate,
        tradingSessionLabel: sessionLabelForMarket(market),
        publishedAt: r.publishedAt,
        updatedAt: r.updatedAt,
        publicAt: r.publishedAt,
        accessLevel: "public",
        status: r.status === "verified" ? "verified" : "published",
        version: r.originalVersion,
        direction: directionToLegacy(r.direction),
        confidence: r.probability ?? 55,
        summary: r.summary ?? `${r.assetName}日度方向：${r.directionLabel}`,
        reviewedBy: "admin",
        reviewedAt: r.reviewedAt ?? r.publishedAt,
        publishedBy: "admin",
      };
      return f;
    });
}
