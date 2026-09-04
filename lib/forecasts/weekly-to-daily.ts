import { getDayGanzhi, relateGanzhiToWeeklyDirection } from "@/lib/calendar/ganzhi";
import { isTradingDay } from "@/lib/calendar/next-trading-day";
import type { DailyForecastMarket } from "@/types/daily-forecast";
import { normalizeFormalDirection } from "@/lib/forecasts/formal-direction";
import { applyCryptoPointGuidanceToDaily } from "@/lib/forecasts/crypto-point-guidance";
import {
  listTradingDaysInPeriod,
  movingLinesActiveNearDate,
} from "@/lib/forecasts/moving-line-map";
import {
  assessMarketProgress,
  type MarketSnapshot,
} from "@/lib/forecasts/market-progress";
import type {
  CalendarEvidence,
  GeneratedDailyForecastRecord,
  WeeklyForecastSourceRecord,
} from "@/lib/weekly-source/types";

const MARKET_META: Record<
  string,
  { assetName: string; legacyMarket: DailyForecastMarket; quoteSymbol: string }
> = {
  BTC: { assetName: "比特币", legacyMarket: "crypto", quoteSymbol: "BTC-USD" },
  ETH: { assetName: "以太坊", legacyMarket: "crypto", quoteSymbol: "ETH-USD" },
  SPX: { assetName: "标普500", legacyMarket: "us", quoteSymbol: "^GSPC" },
  NDX: { assetName: "纳斯达克100", legacyMarket: "us", quoteSymbol: "^NDX" },
  SHCOMP: { assetName: "上证指数", legacyMarket: "cn", quoteSymbol: "000001.SS" },
  SSEC: { assetName: "上证指数", legacyMarket: "cn", quoteSymbol: "000001.SS" },
  HSTECH: { assetName: "恒生科技", legacyMarket: "hk", quoteSymbol: "HSTECH.HK" },
  GLD: { assetName: "国际金价", legacyMarket: "commodity", quoteSymbol: "GC=F" },
  Gold: { assetName: "国际金价", legacyMarket: "commodity", quoteSymbol: "GC=F" },
  GOLD: { assetName: "国际金价", legacyMarket: "commodity", quoteSymbol: "GC=F" },
  XAU: { assetName: "国际金价", legacyMarket: "commodity", quoteSymbol: "GC=F" },
  SILVER: { assetName: "国际银价", legacyMarket: "commodity", quoteSymbol: "SI=F" },
  SI: { assetName: "国际银价", legacyMarket: "commodity", quoteSymbol: "SI=F" },
  WTI: { assetName: "WTI原油", legacyMarket: "commodity", quoteSymbol: "CL=F" },
};

export function marketMeta(code: string) {
  const k = code === "CL" ? "WTI" : code === "000001.SS" ? "SHCOMP" : code;
  return MARKET_META[k] ?? { assetName: code, legacyMarket: "us" as const, quoteSymbol: code };
}

function baseProbabilities(direction: string): { up: number; flat: number; down: number } {
  const d = normalizeFormalDirection(direction);
  if (d === "上涨" || d === "震荡上涨") return { up: 52, flat: 28, down: 20 };
  if (d === "下跌" || d === "震荡下跌") return { up: 20, flat: 28, down: 52 };
  if (d === "先涨后跌" || d === "冲高回落") return { up: 34, flat: 30, down: 36 };
  if (d === "先跌后涨" || d === "探底回升") return { up: 36, flat: 30, down: 34 };
  return { up: 30, flat: 40, down: 30 };
}

function conciseWeeklyReason(text: string | null | undefined): string | null {
  if (!text) return null;
  const clauses = text
    .replace(/\s+/g, " ")
    .split(/[。；]/u)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !/不编造具体变盘日|技术分析只负责|完整研究依据按需展开|先看明确方向/u.test(item));
  return clauses.slice(0, 2).join("；") || null;
}

function isStageSource(weekly: WeeklyForecastSourceRecord): boolean {
  return weekly.specialPatterns.some((pattern) => pattern.endsWith("_NOT_DAILY_HEXAGRAM"));
}

function pathForDay(weekly: WeeklyForecastSourceRecord, progress: number): string {
  const path = weekly.weeklyPath;
  if (isStageSource(weekly)) return path;
  if (progress < 0.34) {
    const m = path.match(/^[^，,；;]+/);
    return m?.[0] ?? path;
  }
  if (progress < 0.67) {
    const parts = path.split(/[，,；;]/);
    return parts[1]?.trim() || parts[0] || path;
  }
  const parts = path.split(/[，,；;]/);
  return parts[parts.length - 1]?.trim() || path;
}

function directionForDay(
  weekly: WeeklyForecastSourceRecord,
  progress: number,
  movingActive: number[]
): string {
  const weeklyDir = normalizeFormalDirection(weekly.weeklyDirection);
  if (isStageSource(weekly)) return weeklyDir;
  // No moving lines → do not invent a turning day; follow weekly with soft fade
  if (!weekly.movingLines.length) {
    if (progress > 0.75 && /震荡上涨|上涨/.test(weeklyDir)) return "震荡";
    return weeklyDir;
  }
  if (/先涨后跌/.test(weeklyDir)) {
    if (progress < 0.4) return movingActive.includes(2) || progress < 0.25 ? "上涨" : "震荡上涨";
    if (progress < 0.7) return "震荡";
    return "冲高回落";
  }
  if (/震荡上涨/.test(weeklyDir)) {
    if (progress > 0.75 && (movingActive.includes(5) || movingActive.includes(6))) return "冲高回落";
    return progress < 0.2 ? "震荡" : "震荡上涨";
  }
  if (/震荡下跌/.test(weeklyDir)) {
    if (progress < 0.25) return "震荡";
    if (progress < 0.55) return "震荡下跌";
    return "下跌";
  }
  if (/先跌后涨/.test(weeklyDir)) {
    if (progress < 0.45) return "下跌";
    return "探底回升";
  }
  return weeklyDir;
}

export function buildCalendarEvidence(
  forecastDate: string,
  weeklyDirection: string
): CalendarEvidence {
  const day = getDayGanzhi(forecastDate);
  const relationToWeekly = relateGanzhiToWeeklyDirection(day, weeklyDirection);
  return {
    calendarDateChina: day.calendarDateChina,
    dayStem: day.dayStem,
    dayBranch: day.dayBranch,
    dayElement: day.dayElement,
    ganzhiLabel: day.ganzhiLabel,
    relationToWeekly,
    note: `目标日${day.ganzhiLabel}：天干${day.dayElement}、地支${day.branchElement}；对「${normalizeFormalDirection(weeklyDirection)}」周势${relationToWeekly}`,
  };
}

export function generateDailyFromWeekly(input: {
  weekly: WeeklyForecastSourceRecord;
  forecastDate: string;
  version?: number;
  status?: GeneratedDailyForecastRecord["status"];
  snapshot?: MarketSnapshot;
  previousVersionId?: string | null;
  invalidationTriggered?: boolean;
}): GeneratedDailyForecastRecord {
  const { weekly, forecastDate } = input;
  const meta = marketMeta(weekly.marketCode);
  const tradingDays = listTradingDaysInPeriod(weekly.periodStart, weekly.periodEnd, (iso) =>
    isTradingDay(meta.legacyMarket, iso)
  );
  const progress =
    tradingDays.length <= 1
      ? 0.5
      : Math.max(0, tradingDays.indexOf(forecastDate)) / Math.max(1, tradingDays.length - 1);

  const moving = movingLinesActiveNearDate({
    movingLines: weekly.movingLines,
    tradingDays,
    forecastDate,
  });

  let direction = directionForDay(weekly, progress, moving.active);
  let path = pathForDay(weekly, progress);
  const explicitDaily = weekly.dailyPath?.find((item) => item.date === forecastDate);
  if (explicitDaily) {
    direction = normalizeFormalDirection(explicitDaily.direction);
    path = explicitDaily.summary;
  }
  let probs = baseProbabilities(direction);
  if (weekly.specialPatterns.includes("OVERLAPPING_LIUYAO_PATH_CONFLICT")) {
    probs = { up: probs.up - 5, flat: probs.flat + 10, down: probs.down - 5 };
  }
  const calendarEvidence = buildCalendarEvidence(forecastDate, weekly.weeklyDirection);
  if (calendarEvidence.relationToWeekly === "增强" && probs.up >= probs.down) {
    probs = { up: Math.min(75, probs.up + 3), flat: probs.flat, down: Math.max(10, probs.down - 3) };
  } else if (calendarEvidence.relationToWeekly === "增强" && probs.down > probs.up) {
    probs = { up: Math.max(10, probs.up - 3), flat: probs.flat, down: Math.min(75, probs.down + 3) };
  } else if (calendarEvidence.relationToWeekly === "减弱") {
    probs = {
      up: Math.max(12, probs.up - 2),
      flat: Math.min(50, probs.flat + 4),
      down: Math.max(12, probs.down - 2),
    };
  }

  const assessed = assessMarketProgress({
    weeklyDirection: weekly.weeklyDirection,
    weeklyPath: weekly.weeklyPath,
    baseDirection: direction,
    baseUp: probs.up,
    baseFlat: probs.flat,
    baseDown: probs.down,
    basePath: path,
    snapshot: input.snapshot ?? {
      lastPrice: null,
      previousClose: null,
      weekOpen: null,
      weekHigh: null,
      weekLow: null,
      nearestSupport: null,
      nearestResistance: null,
      atr: null,
      weekReturnPct: null,
    },
    invalidationTriggered: input.invalidationTriggered,
  });

  // Technical progress adjusts risk/path confidence, not the source-owned side.
  direction = assessed.direction;
  path = assessed.expectedPath;
  probs = {
    up: assessed.upProbability,
    flat: assessed.sidewaysProbability,
    down: assessed.downProbability,
  };

  const version = input.version ?? 1;
  const id = `GDF-${weekly.marketCode}-${forecastDate.replace(/-/g, "")}-V${version}`;
  const nowIso = new Date().toISOString();
  const status = input.status ?? "DRAFT";

  const liuyaoEvidence = [
    `日判${normalizeFormalDirection(direction)}`,
    weekly.primaryHexagram ? `周卦${weekly.primaryHexagram}${weekly.changedHexagram ? `→${weekly.changedHexagram}` : ""}` : null,
    `周势${normalizeFormalDirection(weekly.weeklyDirection)}`,
    calendarEvidence.note,
    moving.labels.length ? moving.labels.join("；") : null,
    conciseWeeklyReason(weekly.interpretation),
  ]
    .filter(Boolean)
    .join("；");

  const baseRecord: GeneratedDailyForecastRecord = {
    id,
    marketCode: weekly.marketCode,
    forecastDate,
    sourceWeeklyForecastId: weekly.id,
    direction: normalizeFormalDirection(direction),
    upProbability: probs.up,
    sidewaysProbability: probs.flat,
    downProbability: probs.down,
    expectedPath: path,
    supportLevels: [],
    resistanceLevels: [],
    confirmationLevel: null,
    invalidationLevel: null,
    riskLevel: /高/.test(weekly.riskSummary) ? "高" : "中高",
    catalysts: [],
    risks: [weekly.riskSummary, explicitDaily?.riskNote].filter(Boolean) as string[],
    liuyaoEvidence,
    qimenEvidence: null,
    calendarEvidence,
    technicalEvidence:
      assessed.status === "AHEAD" || assessed.status === "INVALIDATED"
        ? assessed.revisionReason
        : "关键价位结合当周结构观察，缺行情源时显示计算中",
    newsEvidence: null,
    marketProgressStatus: assessed.status,
    revisionReason: assessed.revisionReason,
    previousVersionId: input.previousVersionId ?? null,
    version,
    status,
    generatedAt: nowIso,
    publishedAt: status === "PUBLISHED" || status === "LOCKED" ? nowIso : null,
    lockedAt: status === "LOCKED" ? nowIso : null,
    validatedAt: null,
    validationStatus: null,
  };

  return applyCryptoPointGuidanceToDaily(baseRecord);
}

/** Create V2 when invalidation requires a new version — never mutates V1 fields. */
export function reviseAsNewVersion(
  previous: GeneratedDailyForecastRecord,
  weekly: WeeklyForecastSourceRecord,
  snapshot: MarketSnapshot
): GeneratedDailyForecastRecord {
  return generateDailyFromWeekly({
    weekly,
    forecastDate: previous.forecastDate,
    version: previous.version + 1,
    status: previous.status === "LOCKED" ? "LOCKED" : "DRAFT",
    snapshot,
    previousVersionId: previous.id,
    invalidationTriggered: true,
  });
}
