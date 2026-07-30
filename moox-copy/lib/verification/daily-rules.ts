/**
 * Pure daily accuracy rules — no I/O.
 */

import type {
  DailyAccuracyDirection,
  DailyAccuracyStats,
  DailyForecastRecord,
  DailyVerdict,
  DailyVerificationResult,
} from "@/types/daily-accuracy";
import { VERDICT_LABELS } from "@/types/daily-accuracy";

const FLAT_BAND = 0.1; // ±0.10%

export function computeReturnPct(previousClose: number, actualClose: number): number {
  if (!Number.isFinite(previousClose) || previousClose === 0) {
    throw new Error("invalid previousClose");
  }
  return ((actualClose - previousClose) / previousClose) * 100;
}

export function looksLikeFuturesRoll(previousClose: number, open: number, close: number): boolean {
  if (!Number.isFinite(previousClose) || previousClose === 0) return false;
  const gap = Math.abs(open - previousClose) / previousClose;
  const move = Math.abs(close - previousClose) / previousClose;
  return gap >= 0.05 || move >= 0.08;
}

export function directionFromReturnPct(returnPct: number): DailyAccuracyDirection {
  if (returnPct > FLAT_BAND) return "UP";
  if (returnPct < -FLAT_BAND) return "DOWN";
  return "FLAT";
}

export function verdictFromDirections(
  predicted: DailyAccuracyDirection,
  actual: DailyAccuracyDirection
): Extract<DailyVerdict, "HIT" | "MISS"> {
  return predicted === actual ? "HIT" : "MISS";
}

export function isPublishedBeforeCutoff(record: DailyForecastRecord): boolean {
  if (!record.publishedAt || !record.cutoffAt) return false;
  return new Date(record.publishedAt).getTime() <= new Date(record.cutoffAt).getTime();
}

export function canEnterAccuracyPool(record: DailyForecastRecord): boolean {
  if (record.isSystemTest) return false;
  if (record.status === "draft" || record.status === "invalid") return false;
  if (record.status !== "published" && record.status !== "verifying" && record.status !== "verified") {
    return false;
  }
  return isPublishedBeforeCutoff(record);
}

export function buildVoidResult(
  record: DailyForecastRecord,
  reason: string,
  dataSource = "calendar"
): DailyVerificationResult {
  return {
    forecastId: record.id,
    forecastDate: record.forecastDate,
    assetName: record.assetName,
    symbol: record.symbol,
    previousClose: 0,
    actualClose: 0,
    actualReturnPct: 0,
    actualDirection: "FLAT",
    verdict: "VOID",
    verdictLabel: VERDICT_LABELS.VOID,
    verifiedAt: new Date().toISOString(),
    dataSource,
    errorMessage: reason,
    isSystemTest: record.isSystemTest,
  };
}

export function buildManualReviewResult(
  record: DailyForecastRecord,
  errorMessage: string,
  dataSource = "unavailable"
): DailyVerificationResult {
  return {
    forecastId: record.id,
    forecastDate: record.forecastDate,
    assetName: record.assetName,
    symbol: record.symbol,
    previousClose: 0,
    actualClose: 0,
    actualReturnPct: 0,
    actualDirection: "FLAT",
    verdict: "MANUAL_REVIEW",
    verdictLabel: VERDICT_LABELS.MANUAL_REVIEW,
    verifiedAt: new Date().toISOString(),
    dataSource,
    errorMessage,
    isSystemTest: record.isSystemTest,
  };
}

export function buildHitMissResult(input: {
  record: DailyForecastRecord;
  previousClose: number;
  actualOpen?: number;
  actualHigh?: number;
  actualLow?: number;
  actualClose: number;
  dataSource: string;
  verifiedAt?: string;
}): DailyVerificationResult {
  const actualReturnPct = computeReturnPct(input.previousClose, input.actualClose);
  const actualDirection = directionFromReturnPct(actualReturnPct);
  const verdict = verdictFromDirections(input.record.direction, actualDirection);
  return {
    forecastId: input.record.id,
    forecastDate: input.record.forecastDate,
    assetName: input.record.assetName,
    symbol: input.record.symbol,
    previousClose: input.previousClose,
    actualOpen: input.actualOpen,
    actualHigh: input.actualHigh,
    actualLow: input.actualLow,
    actualClose: input.actualClose,
    actualReturnPct: Number(actualReturnPct.toFixed(4)),
    actualDirection,
    verdict,
    verdictLabel: VERDICT_LABELS[verdict],
    directionVerdict: verdict,
    pathVerdict: "INSUFFICIENT_DATA",
    pathVerdictLabel: "数据不足，待人工确认",
    timingVerdict: "未单独验证",
    priceTargetVerdict: "未单独验证",
    verifiedAt: input.verifiedAt ?? new Date().toISOString(),
    dataSource: input.dataSource,
    isSystemTest: input.record.isSystemTest,
  };
}

function rate(hits: number, misses: number): number | null {
  const den = hits + misses;
  if (den === 0) return null;
  return hits / den;
}

function inLastDays(isoDate: string, days: number, now = new Date()): boolean {
  const t = new Date(`${isoDate}T12:00:00Z`).getTime();
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  return t >= cutoff;
}

const FORMAL_STATUSES = new Set(["published", "verifying", "verified", "invalid"]);

/** Build dashboard stats from the same forecast+result pairs shown in the list. */
export function computeVerificationDashboardStats(
  forecasts: DailyForecastRecord[],
  results: DailyVerificationResult[],
  now = new Date()
): DailyAccuracyStats {
  const formal = forecasts.filter((f) => FORMAL_STATUSES.has(f.status));
  const byId = new Map(results.map((r) => [r.forecastId, r]));

  let pendingCount = 0;
  let hitCount = 0;
  let missCount = 0;
  let voidCount = 0;
  let manualReviewCount = 0;
  let invalidCount = 0;

  for (const f of formal) {
    if (f.status === "invalid") invalidCount += 1;
    const r = byId.get(f.id);
    if (!r) {
      pendingCount += 1;
      continue;
    }
    if (r.isSystemTest) {
      voidCount += 1;
      continue;
    }
    if (r.verdict === "HIT") hitCount += 1;
    else if (r.verdict === "MISS") missCount += 1;
    else if (r.verdict === "VOID") voidCount += 1;
    else if (r.verdict === "MANUAL_REVIEW") manualReviewCount += 1;
    else pendingCount += 1;
  }

  const verifiedCount = hitCount + missCount;
  const hit7 = results.filter(
    (r) => !r.isSystemTest && r.verdict === "HIT" && inLastDays(r.forecastDate, 7, now)
  ).length;
  const miss7 = results.filter(
    (r) => !r.isSystemTest && r.verdict === "MISS" && inLastDays(r.forecastDate, 7, now)
  ).length;
  const hit30 = results.filter(
    (r) => !r.isSystemTest && r.verdict === "HIT" && inLastDays(r.forecastDate, 30, now)
  ).length;
  const miss30 = results.filter(
    (r) => !r.isSystemTest && r.verdict === "MISS" && inLastDays(r.forecastDate, 30, now)
  ).length;

  return {
    totalForecasts: formal.length,
    verifiedCount,
    hitCount,
    missCount,
    hitRate: rate(hitCount, missCount),
    hitRate7d: rate(hit7, miss7),
    hitRate30d: rate(hit30, miss30),
    voidCount,
    manualReviewCount,
    pendingCount,
    invalidCount,
  };
}

/** Accuracy excludes VOID, MANUAL_REVIEW, and system tests. */
export function computeDailyAccuracyStats(
  results: DailyVerificationResult[],
  pendingCount = 0,
  now = new Date(),
  totalForecasts = 0,
  invalidCount = 0
): DailyAccuracyStats {
  const countable = results.filter(
    (r) => !r.isSystemTest && (r.verdict === "HIT" || r.verdict === "MISS")
  );
  const hitCount = countable.filter((r) => r.verdict === "HIT").length;
  const missCount = countable.filter((r) => r.verdict === "MISS").length;
  const hit7 = countable.filter((r) => inLastDays(r.forecastDate, 7, now) && r.verdict === "HIT").length;
  const miss7 = countable.filter((r) => inLastDays(r.forecastDate, 7, now) && r.verdict === "MISS").length;
  const hit30 = countable.filter((r) => inLastDays(r.forecastDate, 30, now) && r.verdict === "HIT").length;
  const miss30 = countable.filter((r) => inLastDays(r.forecastDate, 30, now) && r.verdict === "MISS").length;

  return {
    totalForecasts,
    verifiedCount: countable.length,
    hitCount,
    missCount,
    hitRate: rate(hitCount, missCount),
    hitRate7d: rate(hit7, miss7),
    hitRate30d: rate(hit30, miss30),
    voidCount: results.filter((r) => r.verdict === "VOID").length,
    manualReviewCount: results.filter((r) => r.verdict === "MANUAL_REVIEW").length,
    pendingCount,
    invalidCount,
  };
}

/** Long-term research must never enter daily accuracy. */
export function isLongTermResearchKind(kind: string | undefined | null): boolean {
  if (!kind) return false;
  const k = kind.toLowerCase();
  return (
    k.includes("annual") ||
    k.includes("yearly") ||
    k.includes("monthly") ||
    k.includes("weekly") ||
    k.includes("risk") ||
    k.includes("framework") ||
    k.includes("long")
  );
}
