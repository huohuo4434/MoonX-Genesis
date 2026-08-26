import type { DailyAccuracyDirection, DailyForecastRecord, DailyVerificationResult } from "@/types/daily-accuracy";
import { DIRECTION_LABELS } from "@/types/daily-accuracy";
import type { WeeklyAnalysisMemberView } from "@/types/weekly-analysis";
import type {
  WeeklyRollingConfidence,
  WeeklyRollingActualSession,
  WeeklyRollingDay,
  WeeklyRollingDayMatch,
  WeeklyRollingVerification,
} from "@/types/weekly-rolling-verification";
import { isPublicCountableVerdict, selectCanonicalDailyForecasts } from "@/lib/accuracy/public-history-filter";
import { getChinaDateKey } from "@/lib/date/china-date";

const CRYPTO_SYMBOLS = new Set(["BTC", "ETH"]);

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function normalizeWeeklyRollingSymbol(value: string): string {
  const symbol = value.trim().toUpperCase();
  if (["GLD", "GOLD", "XAU", "GC", "GC=F"].includes(symbol)) return "GOLD";
  if (["SHCOMP", "SSEC", "000001.SS"].includes(symbol)) return "SSEC";
  if (["SILVER", "SI", "SI=F", "SLV"].includes(symbol)) return "SILVER";
  if (["WTI", "CL", "CL=F"].includes(symbol)) return "WTI";
  return symbol;
}

function isMarketClosed(symbol: string, date: string): boolean {
  if (CRYPTO_SYMBOLS.has(normalizeWeeklyRollingSymbol(symbol))) return false;
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

function weeklyPlanDirection(direction: string, index: number, total: number): DailyAccuracyDirection | null {
  const progress = total <= 1 ? 0.5 : index / Math.max(1, total - 1);
  if (direction === "上涨") return "UP";
  if (direction === "下跌") return "DOWN";
  if (direction === "震荡") return "FLAT";
  if (direction === "震荡上涨") return progress < 0.25 ? "FLAT" : "UP";
  if (direction === "震荡下跌") return progress < 0.25 ? "FLAT" : "DOWN";
  if (["先涨后跌", "冲高回落"].includes(direction)) {
    if (progress < 0.4) return "UP";
    if (progress < 0.65) return "FLAT";
    return "DOWN";
  }
  if (["先跌后涨", "探底回升"].includes(direction)) {
    if (progress < 0.4) return "DOWN";
    if (progress < 0.65) return "FLAT";
    return "UP";
  }
  return null;
}

function wasPublishedBeforeCutoff(forecast: DailyForecastRecord): boolean {
  const publishedAt = Date.parse(forecast.publishedAt);
  const cutoffAt = Date.parse(forecast.cutoffAt);
  return Number.isFinite(publishedAt) && Number.isFinite(cutoffAt) && publishedAt <= cutoffAt;
}

export function scoreRollingDailyDirection(
  predicted: DailyAccuracyDirection,
  actual: DailyAccuracyDirection,
): { match: Exclude<WeeklyRollingDayMatch, "PENDING">; score: number } {
  if (predicted === actual) return { match: "EXACT", score: 1 };
  if (predicted === "FLAT" || actual === "FLAT") return { match: "PARTIAL", score: 0.5 };
  return { match: "OPPOSITE", score: 0 };
}

function confidenceFor(verifiedDays: number, matchingPct: number | null): WeeklyRollingConfidence {
  if (!verifiedDays || matchingPct == null) return "WAITING";
  if (verifiedDays < 3) return "EARLY";
  if (matchingPct >= 75) return "HIGH";
  if (matchingPct >= 50) return "MEDIUM";
  return "REVIEW";
}

function conclusion(confidence: WeeklyRollingConfidence, matchingPct: number | null) {
  if (confidence === "WAITING") return {
    zh: "尚无已收盘的有效验证日，等待实际走势。",
    en: "No closed, verifiable session yet.",
  };
  if (confidence === "EARLY") return {
    zh: `当前匹配度${matchingPct}%；有效样本不足3天，只作早期观察。`,
    en: `Current match ${matchingPct}%; fewer than three verified sessions, so this remains preliminary.`,
  };
  if (confidence === "HIGH") return {
    zh: `当前匹配度${matchingPct}%；已发生区间与预测路径高度一致，后续仍需每日验证。`,
    en: `Current match ${matchingPct}%; the realized path is closely aligned so far, with daily verification still required.`,
  };
  if (confidence === "MEDIUM") return {
    zh: `当前匹配度${matchingPct}%；部分节奏兑现，后续方向应降低权重并等待确认。`,
    en: `Current match ${matchingPct}%; part of the rhythm matched, but the remaining path should carry reduced weight.`,
  };
  return {
    zh: `当前匹配度${matchingPct}%；已发生走势与预测明显偏离，本周路径需要复核，不能机械沿用。`,
    en: `Current match ${matchingPct}%; the realized tape materially diverges, so the weekly path needs review rather than mechanical use.`,
  };
}

export function buildWeeklyRollingVerification(input: {
  weekly: WeeklyAnalysisMemberView;
  forecasts: readonly DailyForecastRecord[];
  results: readonly DailyVerificationResult[];
  actuals?: readonly WeeklyRollingActualSession[];
  now?: Date;
}): WeeklyRollingVerification {
  const { weekly } = input;
  const now = input.now ?? new Date();
  const todayKey = getChinaDateKey(now);
  const symbol = normalizeWeeklyRollingSymbol(weekly.displaySymbol ?? weekly.symbol);
  const canonical = selectCanonicalDailyForecasts(input.forecasts).filter(
    (row) => normalizeWeeklyRollingSymbol(row.symbol) === symbol
      && row.forecastDate >= weekly.weekStart
      && row.forecastDate <= weekly.weekEnd
      && wasPublishedBeforeCutoff(row),
  );
  const forecastsByDate = new Map(canonical.map((row) => [row.forecastDate, row]));
  const resultByForecastId = new Map(
    input.results
      .filter((row) => {
        const verifiedAt = Date.parse(row.verifiedAt);
        return row.forecastDate <= todayKey && Number.isFinite(verifiedAt) && verifiedAt <= now.getTime() && isPublicCountableVerdict(row.verdict);
      })
      .map((row) => [row.forecastId, row]),
  );
  const actualByDate = new Map(
    (input.actuals ?? [])
      .filter((row) => normalizeWeeklyRollingSymbol(row.symbol) === symbol)
      .filter((row) => {
        const verifiedAt = Date.parse(row.verifiedAt);
        return row.date <= todayKey && Number.isFinite(verifiedAt) && verifiedAt <= now.getTime();
      })
      .map((row) => [row.date, row]),
  );
  const dates = Array.from({ length: 7 }, (_, index) => addDays(weekly.weekStart, index));
  const tradingDates = dates.filter((date) => !isMarketClosed(symbol, date));

  const days: WeeklyRollingDay[] = dates.map((date) => {
    const actual = actualByDate.get(date);
    const marketClosed = isMarketClosed(symbol, date) || actual?.marketClosed === true;
    if (marketClosed) {
      return {
        date, marketClosed, predictedDirection: null, predictedLabel: null, predictionSource: null,
        actualDirection: null, actualLabel: null, status: "CLOSED", match: "PENDING", score: null,
      };
    }
    const locked = forecastsByDate.get(date);
    const tradingIndex = tradingDates.indexOf(date);
    const planned = weeklyPlanDirection(weekly.overallDirection, tradingIndex, tradingDates.length);
    const predictedDirection = locked?.direction ?? planned;
    const result = locked ? resultByForecastId.get(locked.id) : undefined;
    const actualDirection = result?.actualDirection ?? actual?.actualDirection ?? null;
    if (!actualDirection || !predictedDirection) {
      return {
        date, marketClosed, predictedDirection, predictedLabel: predictedDirection ? DIRECTION_LABELS[predictedDirection] : null,
        predictionSource: predictedDirection ? (locked ? "LOCKED_DAILY" : "WEEKLY_PLAN") : null,
        actualDirection: null, actualLabel: null, status: "PENDING", match: "PENDING", score: null,
      };
    }
    const scored = scoreRollingDailyDirection(predictedDirection, actualDirection);
    return {
      date, marketClosed, predictedDirection, predictedLabel: DIRECTION_LABELS[predictedDirection],
      predictionSource: locked ? "LOCKED_DAILY" : "WEEKLY_PLAN", actualDirection,
      actualLabel: result ? DIRECTION_LABELS[result.actualDirection] : actual?.actualLabel ?? DIRECTION_LABELS[actualDirection], status: "VERIFIED",
      match: scored.match, score: scored.score,
    };
  });

  const verified = days.filter((day) => day.status === "VERIFIED" && day.score != null);
  const matchingPct = verified.length
    ? Math.round((verified.reduce((sum, day) => sum + (day.score ?? 0), 0) / verified.length) * 100)
    : null;
  const confidence = confidenceFor(verified.length, matchingPct);
  const copy = conclusion(confidence, matchingPct);
  return {
    weeklyAnalysisId: weekly.id,
    assetId: weekly.assetId,
    assetName: weekly.assetName,
    symbol: weekly.displaySymbol ?? weekly.symbol,
    weekStart: weekly.weekStart,
    weekEnd: weekly.weekEnd,
    days,
    verifiedDays: verified.length,
    exactDays: verified.filter((day) => day.match === "EXACT").length,
    partialDays: verified.filter((day) => day.match === "PARTIAL").length,
    oppositeDays: verified.filter((day) => day.match === "OPPOSITE").length,
    matchingPct,
    confidence,
    conclusionZh: copy.zh,
    conclusionEn: copy.en,
  };
}
