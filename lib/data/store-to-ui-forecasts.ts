/**
 * Map moonx-data daily forecast records into UI DailyForecast shape.
 */
import "server-only";

import { listDailyForecastRecords } from "@/lib/data/moonx-data-store";
import { sessionLabelForMarket } from "@/lib/calendar/next-trading-day";
import { getBeijingTodayKey } from "@/lib/calendar/beijing-date";
import { consensusStarsFromInputs } from "@/lib/forecasts/consensus-confidence";
import type { DailyForecast, DailyForecastMarket } from "@/types/daily-forecast";
import { normalizeDailyLanguage, normalizeDailyPath, signalStrengthFromConfidence } from "@/lib/forecasts/daily-language";
import { canonicalAssetCode, canonicalAssetId, assetDisplayName } from "@/lib/presentation/asset-catalog";
import { normalizeForecastContract } from "@/lib/forecasts/forecast-contract";
import type { DailyForecastRecord } from "@/types/daily-accuracy";
import { isActivePredictionSymbol } from "@/lib/prediction-scope";

function marketToLegacy(m: DailyForecastRecord["market"]): DailyForecastMarket {
  if (m === "CRYPTO") return "crypto";
  if (m === "US") return "us";
  if (m === "US_FUTURES") return "commodity";
  if (m === "CN") return "cn";
  return "hk";
}

function assetIdFromSymbol(symbol: string): string {
  return canonicalAssetId(symbol);
}

function canonicalStoreSymbol(symbol: string): string {
  return canonicalAssetCode(symbol);
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
  const consensus = r.consensusStars
    ? {
        stars: r.consensusStars,
        score: r.consensusScore ?? r.probability ?? 50,
        label: r.consensusLabel ?? "方法共识",
        activeModules: 2,
        note: "星级在发布时锁定，用于后续按共识等级分类验证。",
      }
    : consensusStarsFromInputs({
        confidence: r.probability ?? 50,
        frameworkCount: /综合|周期|六爻|老师|技术/.test(`${r.source} ${r.summary ?? ""}`) ? 2 : 1,
        hasTechnical: Boolean(r.supportLevels?.length && r.resistanceLevels?.length),
        pathDefined: Boolean(r.expectedPath?.length),
      });
  const tradingSessionLabel =
    r.symbol === "WTI" || r.symbol === "CL=F"
      ? "NYMEX WTI近月连续合约交易日"
      : r.symbol === "GOLD" || r.symbol === "GC=F"
        ? "COMEX国际金价交易日"
        : r.symbol === "SILVER" || r.symbol === "SI" || r.symbol === "SI=F"
          ? "COMEX国际银价交易日"
      : r.symbol === "SPX"
        ? "美股常规交易时段"
        : sessionLabelForMarket(market);
  const canonicalSymbol = canonicalStoreSymbol(r.symbol);
  return normalizeForecastContract({
    id: r.id,
    assetId: assetIdFromSymbol(canonicalSymbol),
    assetName: assetDisplayName(canonicalSymbol, r.assetName),
    symbol: canonicalSymbol,
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
    directionLabel: isAbstain ? "暂无判断" : r.predictedPatternLabel ?? r.directionLabel,
    confidence: r.probability ?? 50,
    consensusStars: consensus.stars,
    consensusScore: consensus.score,
    consensusLabel: consensus.label,
    consensusModuleCount: consensus.activeModules,
    consensusNote: consensus.note,
    summary: normalizeDailyLanguage(r.summary),
    expectedPath: normalizeDailyPath(r.expectedPath),
    pathBias: normalizeDailyLanguage(r.predictedPatternLabel ?? r.expectedPath?.join(" → ")),
    intradayRhythm: normalizeDailyPath(r.expectedPath),
    signalStrength: signalStrengthFromConfidence(r.probability ?? 50),
    waitForConfirmation: !Boolean(r.supportLevels?.length && r.resistanceLevels?.length && r.confirmation),
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
  });
}

function storeStatusRank(status: DailyForecastRecord["status"]): number {
  if (status === "verified") return 6;
  if (status === "verifying") return 5;
  if (status === "published") return 4;
  if (status === "invalid") return 3;
  return 1;
}

function recordTime(record: DailyForecastRecord): number {
  const value = record.updatedAt || record.publishedAt || record.createdAt;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Keep history in storage while exposing only one current version per asset/session. */
export function selectCurrentStoreRecords(records: DailyForecastRecord[]): DailyForecastRecord[] {
  const selected = new Map<string, DailyForecastRecord>();
  for (const record of records) {
    if (!isActivePredictionSymbol(record.symbol)) continue;
    const key = `${canonicalStoreSymbol(record.symbol)}:${record.forecastDate}`;
    const current = selected.get(key);
    if (!current) {
      selected.set(key, record);
      continue;
    }
    const better =
      record.originalVersion > current.originalVersion ||
      (record.originalVersion === current.originalVersion &&
        (storeStatusRank(record.status) > storeStatusRank(current.status) ||
          (storeStatusRank(record.status) === storeStatusRank(current.status) &&
            recordTime(record) > recordTime(current))));
    if (better) selected.set(key, record);
  }
  return [...selected.values()];
}

export async function getStoreForecastsForToday(now = new Date()): Promise<DailyForecast[]> {
  const today = getBeijingTodayKey(now);
  const records = selectCurrentStoreRecords(await listDailyForecastRecords());
  return records
    .filter((r) => r.forecastDate === today && isFormalStoreStatus(r.status))
    .map((r) => toUi(r, "public"));
}

/** Next formal store batch after Beijing today (not hard-coded calendar tomorrow). */
export async function getStoreForecastsForTomorrow(now = new Date()): Promise<DailyForecast[]> {
  const today = getBeijingTodayKey(now);
  const records = selectCurrentStoreRecords(await listDailyForecastRecords());
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
