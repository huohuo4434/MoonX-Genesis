/**
 * Pure public historical accuracy filters (no I/O).
 * Past verified forecasts only — never today / tomorrow / pending / draft.
 */
import { getChinaDateKey } from "@/lib/date/china-date";
import { HSTECH_MIN_INDEX_LEVEL, isHstechSymbol } from "@/lib/market-data/quote-symbols";
import type {
  DailyAccuracyStats,
  DailyForecastRecord,
  DailyVerificationResult,
  DailyVerdict,
} from "@/types/daily-accuracy";
import { DIRECTION_LABELS, PATTERN_LABELS, VERDICT_LABELS } from "@/types/daily-accuracy";
import { inferPredictedPattern } from "@/lib/verification/pattern-classifier";

/**
 * Public history: HIT / MISS only (PARTIAL maps here if introduced later).
 * VOID / MANUAL_REVIEW / PENDING / DRAFT / LOCKED never appear on public pages.
 */
export const PUBLIC_FINAL_VERDICTS = new Set<DailyVerdict>([
  "HIT",
  "FULL_HIT",
  "PARTIAL_HIT",
  "MISS",
  "UNVERIFIABLE",
]);

/** Countable for weighted accuracy denominator. */
export const PUBLIC_COUNTABLE_VERDICTS = new Set<DailyVerdict>([
  "HIT",
  "FULL_HIT",
  "PARTIAL_HIT",
  "MISS",
]);

export type PublicAccuracyHistoryItem = {
  forecastId: string;
  forecastDate: string;
  assetName: string;
  symbol: string;
  market: string;
  predictedDirection: string;
  predictedPattern: string;
  actualDirection: string;
  actualPattern: string;
  validationMode: string;
  actualReturnPct: number | null;
  previousClose: number | null;
  actualOpen: number | null;
  actualHigh: number | null;
  actualLow: number | null;
  actualClose: number | null;
  mainHighTime?: string | null;
  mainLowTime?: string | null;
  intradayPath?: Array<{ time: string; close: number }>;
  verdict: DailyVerdict;
  verdictLabel: string;
  verifiedAt: string;
  version: number;
  source: string;
  pathVerdictLabel?: string;
  timingVerdict?: string;
  priceTargetVerdict?: string;
  dataSource?: string;
  errorMessage?: string;
  probability?: number;
  summary?: string;
  expectedPath?: string[];
  supportLevels?: string[];
  resistanceLevels?: string[];
  confirmation?: string;
  invalidation?: string;
  patternScore?: number;
  pathScore?: number;
  zoneScore?: number;
  conditionScore?: number;
  totalScore?: number;
  validationExplanation?: string;
};

export function isPublicFinalVerdict(v: DailyVerdict | string | null | undefined): boolean {
  return Boolean(v && PUBLIC_FINAL_VERDICTS.has(v as DailyVerdict));
}

export function isPublicCountableVerdict(v: DailyVerdict | string | null | undefined): boolean {
  return Boolean(v && PUBLIC_COUNTABLE_VERDICTS.has(v as DailyVerdict));
}

function inLastDays(isoDate: string, days: number, now: Date): boolean {
  const t = new Date(`${isoDate}T12:00:00Z`).getTime();
  return t >= now.getTime() - days * 24 * 60 * 60 * 1000;
}

function rate(hits: number, misses: number): number | null {
  const den = hits + misses;
  if (den === 0) return null;
  return hits / den;
}

/**
 * predictionDate < China today AND verifiedAt present AND final verdict.
 */
export function filterPublicAccuracyHistory(input: {
  forecasts: DailyForecastRecord[];
  results: DailyVerificationResult[];
  now?: Date;
}): PublicAccuracyHistoryItem[] {
  const todayKey = getChinaDateKey(input.now ?? new Date());
  const forecastById = new Map(input.forecasts.map((f) => [f.id, f]));

  const items: PublicAccuracyHistoryItem[] = [];
  for (const r of input.results) {
    if (r.isSystemTest) continue;
    if (!r.verifiedAt) continue;
    if (!isPublicFinalVerdict(r.verdict)) continue;
    // Strict: forecastDate < today (never <=)
    if (!(r.forecastDate < todayKey)) continue;

    const f = forecastById.get(r.forecastId);
    if (f) {
      if (f.status === "draft") continue;
      if (f.isSystemTest) continue;
    }

    // HSTECH ETF-scale closes (e.g. 4.644) must never enter public accuracy.
    if (
      isHstechSymbol(r.symbol, f?.quoteSymbol) &&
      typeof r.actualClose === "number" &&
      Number.isFinite(r.actualClose) &&
      r.actualClose > 0 &&
      r.actualClose < HSTECH_MIN_INDEX_LEVEL
    ) {
      continue;
    }

    const rawDirection =
      f?.directionLabel ??
      (f?.direction ? DIRECTION_LABELS[f.direction] : "—");
    const predictedDirection = rawDirection;
    const inferred = f ? inferPredictedPattern(f) : null;
    const predictedPattern = f?.predictedPattern
      ? PATTERN_LABELS[f.predictedPattern]
      : inferred
        ? PATTERN_LABELS[inferred.pattern]
        : predictedDirection;
    const actualPattern = r.actualPattern
      ? PATTERN_LABELS[r.actualPattern]
      : DIRECTION_LABELS[r.actualDirection] ?? r.actualDirection;

    items.push({
      forecastId: r.forecastId,
      forecastDate: r.forecastDate,
      assetName: r.assetName || f?.assetName || r.symbol,
      symbol: r.symbol,
      market: f?.market ?? "CRYPTO",
      predictedDirection,
      predictedPattern,
      actualDirection: DIRECTION_LABELS[r.actualDirection] ?? r.actualDirection,
      actualPattern,
      validationMode: r.validationMode ?? (inferred?.mode ?? "LEGACY_DIRECTION_ONLY"),
      actualReturnPct: isPublicCountableVerdict(r.verdict) ? r.actualReturnPct : null,
      previousClose: r.previousClose || null,
      actualOpen: r.actualOpen ?? null,
      actualHigh: r.actualHigh ?? null,
      actualLow: r.actualLow ?? null,
      actualClose: r.actualClose || null,
      mainHighTime: r.mainHighTime ?? null,
      mainLowTime: r.mainLowTime ?? null,
      intradayPath: r.intradayPath,
      verdict: r.verdict,
      verdictLabel: VERDICT_LABELS[r.verdict] ?? r.verdictLabel,
      verifiedAt: r.verifiedAt,
      version: f?.originalVersion ?? 1,
      source: "MOOX",
      pathVerdictLabel: r.pathVerdictLabel,
      timingVerdict: r.timingVerdict,
      priceTargetVerdict: r.priceTargetVerdict,
      dataSource: r.dataSource,
      errorMessage: r.errorMessage,
      probability: f?.probability,
      summary: f?.summary,
      expectedPath: f?.expectedPath,
      supportLevels: f?.supportLevels,
      resistanceLevels: f?.resistanceLevels,
      confirmation: f?.confirmation,
      invalidation: f?.invalidation,
      patternScore: r.patternScore,
      pathScore: r.pathScore,
      zoneScore: r.zoneScore,
      conditionScore: r.conditionScore,
      totalScore: r.totalScore,
      validationExplanation: r.validationExplanation,
    });
  }

  return items.sort((a, b) => {
    const d = b.forecastDate.localeCompare(a.forecastDate);
    if (d !== 0) return d;
    return a.symbol.localeCompare(b.symbol);
  });
}

export function computePublicAccuracyStats(
  items: PublicAccuracyHistoryItem[],
  now = new Date()
): DailyAccuracyStats {
  const countable = items.filter((i) => isPublicCountableVerdict(i.verdict));
  const fullHitCount = countable.filter((i) => i.verdict === "HIT" || i.verdict === "FULL_HIT").length;
  const partialHitCount = countable.filter((i) => i.verdict === "PARTIAL_HIT").length;
  const missCount = countable.filter((i) => i.verdict === "MISS").length;
  const full7 = countable.filter(
    (i) => (i.verdict === "HIT" || i.verdict === "FULL_HIT") && inLastDays(i.forecastDate, 7, now)
  ).length;
  const partial7 = countable.filter(
    (i) => i.verdict === "PARTIAL_HIT" && inLastDays(i.forecastDate, 7, now)
  ).length;
  const miss7 = countable.filter(
    (i) => i.verdict === "MISS" && inLastDays(i.forecastDate, 7, now)
  ).length;
  const full30 = countable.filter(
    (i) => (i.verdict === "HIT" || i.verdict === "FULL_HIT") && inLastDays(i.forecastDate, 30, now)
  ).length;
  const partial30 = countable.filter(
    (i) => i.verdict === "PARTIAL_HIT" && inLastDays(i.forecastDate, 30, now)
  ).length;
  const miss30 = countable.filter(
    (i) => i.verdict === "MISS" && inLastDays(i.forecastDate, 30, now)
  ).length;
  const weighted = (full: number, partial: number, miss: number) => {
    const den = full + partial + miss;
    return den ? (full + partial * 0.5) / den : null;
  };
  const fullPathItems = countable.filter((i) => i.validationMode === "FULL_PATH");
  const fullPathHits = fullPathItems.filter((i) => i.verdict === "FULL_HIT" || i.verdict === "HIT").length;
  const directionHits = countable.filter((i) => i.verdict !== "MISS").length;

  return {
    totalForecasts: items.length,
    verifiedCount: countable.length,
    hitCount: fullHitCount,
    fullHitCount,
    partialHitCount,
    unverifiableCount: items.filter((i) => i.verdict === "UNVERIFIABLE").length,
    missCount,
    hitRate: rate(fullHitCount, missCount),
    weightedHitRate: weighted(fullHitCount, partialHitCount, missCount),
    pathHitRate: fullPathItems.length ? fullPathHits / fullPathItems.length : null,
    directionHitRate: countable.length ? directionHits / countable.length : null,
    hitRate7d: weighted(full7, partial7, miss7),
    hitRate30d: weighted(full30, partial30, miss30),
    voidCount: 0,
    manualReviewCount: 0,
    pendingCount: 0,
    invalidCount: 0,
  };
}

export function publicSourceAccuracyBreakdown(
  items: PublicAccuracyHistoryItem[]
): Array<{ source: string; hit: number; miss: number; hitRate: number | null }> {
  const buckets = new Map<string, { hit: number; miss: number }>();
  const normalize = (s: string) => {
    if (/老师|teacher/i.test(s)) return "老师研究";
    if (/周期|推演|cycle|综合|composite|MoonX/i.test(s)) return "MoonX综合判断";
    if (/技术|technical/i.test(s)) return "技术分析";
    if (/自测|用户|user/i.test(s)) return "用户自测";
    return s || "MoonX综合判断";
  };
  for (const r of items) {
    if (!isPublicCountableVerdict(r.verdict)) continue;
    const source = normalize(r.source);
    const cur = buckets.get(source) ?? { hit: 0, miss: 0 };
    if (r.verdict === "HIT" || r.verdict === "FULL_HIT" || r.verdict === "PARTIAL_HIT") cur.hit += 1;
    else cur.miss += 1;
    buckets.set(source, cur);
  }
  return [...buckets.entries()].map(([source, v]) => ({
    source,
    hit: v.hit,
    miss: v.miss,
    hitRate: rate(v.hit, v.miss),
  }));
}

export function publicConfidenceAccuracyBreakdown(
  items: PublicAccuracyHistoryItem[]
): Array<{ bucket: string; hit: number; miss: number; hitRate: number | null }> {
  const order = ["50%以下", "50%至59%", "60%至69%", "70%以上"] as const;
  const buckets: Record<(typeof order)[number], { hit: number; miss: number }> = {
    "50%以下": { hit: 0, miss: 0 },
    "50%至59%": { hit: 0, miss: 0 },
    "60%至69%": { hit: 0, miss: 0 },
    "70%以上": { hit: 0, miss: 0 },
  };
  for (const r of items) {
    if (!isPublicCountableVerdict(r.verdict)) continue;
    const p = r.probability ?? 0;
    const key =
      p < 50 ? "50%以下" : p < 60 ? "50%至59%" : p < 70 ? "60%至69%" : "70%以上";
    if (r.verdict === "HIT" || r.verdict === "FULL_HIT" || r.verdict === "PARTIAL_HIT") buckets[key].hit += 1;
    else buckets[key].miss += 1;
  }
  return order.map((bucket) => ({
    bucket,
    hit: buckets[bucket].hit,
    miss: buckets[bucket].miss,
    hitRate: rate(buckets[bucket].hit, buckets[bucket].miss),
  }));
}
