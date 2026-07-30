/**
 * Map moonx-data daily forecast records into UI DailyForecast shape.
 */
import "server-only";

import { listDailyForecastRecords } from "@/lib/data/moonx-data-store";
import { sessionLabelForMarket } from "@/lib/calendar/next-trading-day";
import { getBeijingTodayKey } from "@/lib/calendar/beijing-date";
import type { DailyForecast, DailyForecastMarket } from "@/types/daily-forecast";
import type { DailyForecastRecord } from "@/types/daily-accuracy";

function marketToLegacy(m: DailyForecastRecord["market"]): DailyForecastMarket {
  if (m === "CRYPTO") return "crypto";
  if (m === "US") return "us";
  if (m === "US_FUTURES") return "commodity";
  if (m === "CN") return "cn";
  return "hk";
}

function assetIdFromSymbol(symbol: string): string {
  const map: Record<string, string> = {
    BTC: "bitcoin",
    SPX: "sp500",
    NDX: "nasdaq-100",
    SSEC: "shanghai-composite",
    "000001.SS": "shanghai-composite",
    HSTECH: "hang-seng",
    GLD: "gold",
    WTI: "wti-crude",
    "CL=F": "wti-crude",
  };
  return map[symbol] ?? symbol.toLowerCase();
}

function isFormalStoreStatus(status: DailyForecastRecord["status"]): boolean {
  return (
    status === "published" ||
    status === "verifying" ||
    status === "verified" ||
    status === "invalid"
  );
}

function toUi(r: DailyForecastRecord, visibility: "public" | "member"): DailyForecast {
  const market = marketToLegacy(r.market);
  const isAbstain = /暂无判断|依据不足|观望/.test(r.summary ?? "") || r.source === "依据不足";
  const tradingSessionLabel =
    r.symbol === "WTI" || r.market === "US_FUTURES"
      ? "NYMEX WTI近月连续合约交易日"
      : r.symbol === "SPX"
        ? "美股常规交易时段"
        : sessionLabelForMarket(market);
  return {
    id: r.id,
    assetId: assetIdFromSymbol(r.symbol),
    assetName: r.symbol === "WTI" ? "WTI原油" : r.assetName,
    symbol: r.symbol === "SSEC" ? "000001.SS" : r.symbol,
    market,
    forecastForDate: r.forecastDate,
    tradingSessionLabel,
    publishedAt: r.publishedAt,
    updatedAt: r.updatedAt,
    publicAt: `${r.forecastDate}T08:00:00+08:00`,
    accessLevel: visibility,
    status: r.status === "invalid" && isAbstain ? "published" : r.status === "verified" ? "verified" : "published",
    version: r.originalVersion,
    direction:
      isAbstain ? "中性" : r.direction === "UP" ? "看涨" : r.direction === "DOWN" ? "看跌" : "中性",
    directionLabel: isAbstain ? "暂无判断" : r.directionLabel,
    confidence: r.probability ?? 50,
    summary: r.summary ?? "",
    headline: isAbstain ? `${r.assetName}当前暂无明确结论` : undefined,
    probabilities:
      r.direction === "UP"
        ? {
            up: r.probability ?? 55,
            flat: Math.round((100 - (r.probability ?? 55)) * 0.55),
            down: Math.round((100 - (r.probability ?? 55)) * 0.45),
          }
        : r.direction === "DOWN"
          ? {
              up: Math.round((100 - (r.probability ?? 55)) * 0.45),
              flat: Math.round((100 - (r.probability ?? 55)) * 0.55),
              down: r.probability ?? 55,
            }
          : {
              up: Math.round((100 - (r.probability ?? 50)) / 2),
              flat: r.probability ?? 50,
              down: Math.round((100 - (r.probability ?? 50)) / 2),
            },
    reviewedBy: "automation",
    reviewedAt: r.reviewedAt ?? r.publishedAt,
    publishedBy: "automation",
    accuracyEligible: r.status !== "invalid",
    supportLevels: r.supportLevels,
    resistanceLevels: r.resistanceLevels,
    confirmation: r.confirmation,
    invalidation: r.invalidation,
    priceSnapshot: r.priceSnapshot ?? undefined,
    priceDataSourceLabel: r.priceDataSourceLabel,
    priceSnapshotAtLabel: r.priceSnapshotAtLabel,
  };
}

export async function getStoreForecastsForToday(now = new Date()): Promise<DailyForecast[]> {
  const today = getBeijingTodayKey(now);
  const records = await listDailyForecastRecords();
  return records
    .filter((r) => r.forecastDate === today && isFormalStoreStatus(r.status))
    .map((r) => toUi(r, "public"));
}

/** Next formal store batch after Beijing today (not hard-coded calendar tomorrow). */
export async function getStoreForecastsForTomorrow(now = new Date()): Promise<DailyForecast[]> {
  const today = getBeijingTodayKey(now);
  const records = await listDailyForecastRecords();
  const nextDates = [
    ...new Set(
      records
        .filter((r) => r.forecastDate > today && isFormalStoreStatus(r.status) && r.status !== "invalid")
        .map((r) => r.forecastDate)
    ),
  ].sort();
  const next = nextDates[0];
  if (!next) return [];
  return records
    .filter((r) => r.forecastDate === next && isFormalStoreStatus(r.status) && r.status !== "invalid")
    .map((r) => toUi(r, "member"));
}
