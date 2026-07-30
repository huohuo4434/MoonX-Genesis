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
import { PATTERN_LABELS, VERDICT_LABELS } from "@/types/daily-accuracy";
import {
  classifyIntradayPattern,
  comparePatterns,
  derivePatternThresholds,
  inferPredictedPattern,
  patternFamily,
  type IntradayVerificationBar,
} from "@/lib/verification/pattern-classifier";

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
  intradayBars?: IntradayVerificationBar[];
  atrPct?: number | null;
}): DailyVerificationResult {
  const actualReturnPct = computeReturnPct(input.previousClose, input.actualClose);
  const fallbackDirection = directionFromReturnPct(actualReturnPct);
  const predicted = inferPredictedPattern(input.record);
  const thresholds = derivePatternThresholds({
    atrPct: input.atrPct,
    market: input.record.market,
    symbol: input.record.symbol,
  });
  const classified = input.intradayBars?.length
    ? classifyIntradayPattern({
        bars: input.intradayBars,
        previousClose: input.previousClose,
        thresholds,
      })
    : null;

  if (!classified && predicted.mode === "FULL_PATH") {
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
      actualDirection: fallbackDirection,
      actualPattern: fallbackDirection === "UP" ? "UP" : fallbackDirection === "DOWN" ? "DOWN" : "RANGE",
      actualPatternLabel: PATTERN_LABELS[fallbackDirection === "UP" ? "UP" : fallbackDirection === "DOWN" ? "DOWN" : "RANGE"],
      validationMode: "UNVERIFIABLE",
      verdict: "UNVERIFIABLE",
      verdictLabel: VERDICT_LABELS.UNVERIFIABLE,
      directionVerdict: patternFamily(predicted.pattern) === fallbackDirection ? "FULL_HIT" : "MISS",
      pathVerdict: "UNVERIFIABLE",
      pathVerdictLabel: "缺少15分钟盘中K线，无法验证路径",
      patternScore: 0,
      pathScore: 0,
      intradayPath: input.intradayBars?.map((bar) => ({ time: bar.localTime, close: bar.close })),
      validationExplanation: "原预测包含盘中路径，但数据源未返回足够的15分钟K线；不允许仅凭日K猜测路径。",
      thresholds,
      timingVerdict: "无法验证",
      priceTargetVerdict: "未单独验证",
      verifiedAt: input.verifiedAt ?? new Date().toISOString(),
      dataSource: input.dataSource,
      isSystemTest: input.record.isSystemTest,
    };
  }

  const actualPattern = classified?.pattern ?? (fallbackDirection === "UP" ? "UP" : fallbackDirection === "DOWN" ? "DOWN" : "RANGE");
  const validationMode = predicted.mode;
  const compared = comparePatterns({
    predicted: predicted.pattern,
    actual: actualPattern,
    validationMode,
  });
  const directionVerdict =
    patternFamily(predicted.pattern) === patternFamily(actualPattern) ? "FULL_HIT" : "MISS";
  const resultVerdict =
    validationMode === "LEGACY_DIRECTION_ONLY" && compared.verdict === "FULL_HIT"
      ? "HIT"
      : compared.verdict;

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
    actualDirection: classified?.direction ?? fallbackDirection,
    actualPattern,
    actualPatternLabel: PATTERN_LABELS[actualPattern],
    validationMode,
    verdict: resultVerdict,
    verdictLabel: VERDICT_LABELS[resultVerdict],
    directionVerdict,
    pathVerdict: resultVerdict,
    pathVerdictLabel:
      validationMode === "LEGACY_DIRECTION_ONLY"
        ? "早期记录仅支持方向验证"
        : VERDICT_LABELS[resultVerdict],
    patternScore: compared.patternScore,
    pathScore: compared.pathScore,
    validationExplanation: [compared.explanation, classified?.explanation].filter(Boolean).join(" "),
    mainHighTime: classified?.mainHighTime ?? null,
    mainLowTime: classified?.mainLowTime ?? null,
    sessionRangePct: classified?.sessionRangePct,
    closeLocation: classified?.closeLocation,
    intradayPath: input.intradayBars?.map((bar) => ({ time: bar.localTime, close: bar.close })),
    thresholds: classified?.thresholds ?? thresholds,
    timingVerdict: classified ? "已按15分钟K线验证" : "仅方向验证",
    priceTargetVerdict: "支撑压力反应待独立验证",
    verifiedAt: input.verifiedAt ?? new Date().toISOString(),
    dataSource: classified ? `${input.dataSource}; yahoo-15m` : input.dataSource,
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
  let fullHitCount = 0;
  let partialHitCount = 0;
  let unverifiableCount = 0;
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
    if (r.verdict === "HIT" || r.verdict === "FULL_HIT") { hitCount += 1; fullHitCount += 1; }
    else if (r.verdict === "PARTIAL_HIT") { partialHitCount += 1; }
    else if (r.verdict === "UNVERIFIABLE") { unverifiableCount += 1; }
    else if (r.verdict === "MISS") missCount += 1;
    else if (r.verdict === "VOID") voidCount += 1;
    else if (r.verdict === "MANUAL_REVIEW") manualReviewCount += 1;
    else pendingCount += 1;
  }

  const verifiedCount = hitCount + partialHitCount + missCount;
  const hit7 = results.filter(
    (r) => !r.isSystemTest && (r.verdict === "HIT" || r.verdict === "FULL_HIT") && inLastDays(r.forecastDate, 7, now)
  ).length;
  const miss7 = results.filter(
    (r) => !r.isSystemTest && r.verdict === "MISS" && inLastDays(r.forecastDate, 7, now)
  ).length;
  const hit30 = results.filter(
    (r) => !r.isSystemTest && (r.verdict === "HIT" || r.verdict === "FULL_HIT") && inLastDays(r.forecastDate, 30, now)
  ).length;
  const miss30 = results.filter(
    (r) => !r.isSystemTest && r.verdict === "MISS" && inLastDays(r.forecastDate, 30, now)
  ).length;

  return {
    totalForecasts: formal.length,
    verifiedCount,
    hitCount,
    fullHitCount,
    partialHitCount,
    unverifiableCount,
    missCount,
    hitRate: rate(hitCount, missCount),
    weightedHitRate: verifiedCount ? (fullHitCount + partialHitCount * 0.5) / verifiedCount : null,
    pathHitRate: verifiedCount ? fullHitCount / verifiedCount : null,
    directionHitRate: rate(hitCount + partialHitCount, missCount),
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
    (r) => !r.isSystemTest && ["HIT", "FULL_HIT", "PARTIAL_HIT", "MISS"].includes(r.verdict)
  );
  const fullHitCount = countable.filter((r) => r.verdict === "HIT" || r.verdict === "FULL_HIT").length;
  const partialHitCount = countable.filter((r) => r.verdict === "PARTIAL_HIT").length;
  const hitCount = fullHitCount;
  const missCount = countable.filter((r) => r.verdict === "MISS").length;
  const hit7 = countable.filter((r) => inLastDays(r.forecastDate, 7, now) && (r.verdict === "HIT" || r.verdict === "FULL_HIT")).length;
  const miss7 = countable.filter((r) => inLastDays(r.forecastDate, 7, now) && r.verdict === "MISS").length;
  const hit30 = countable.filter((r) => inLastDays(r.forecastDate, 30, now) && (r.verdict === "HIT" || r.verdict === "FULL_HIT")).length;
  const miss30 = countable.filter((r) => inLastDays(r.forecastDate, 30, now) && r.verdict === "MISS").length;

  return {
    totalForecasts,
    verifiedCount: countable.length,
    hitCount,
    fullHitCount,
    partialHitCount,
    unverifiableCount: results.filter((r) => r.verdict === "UNVERIFIABLE").length,
    missCount,
    hitRate: rate(hitCount, missCount),
    weightedHitRate: countable.length ? (fullHitCount + partialHitCount * 0.5) / countable.length : null,
    pathHitRate: countable.length ? fullHitCount / countable.length : null,
    directionHitRate: countable.length ? (fullHitCount + partialHitCount) / countable.length : null,
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
