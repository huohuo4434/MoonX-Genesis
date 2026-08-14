import type { ConvictionPeriodForecast } from "@/lib/data/conviction/asteroid-forecasts";
import { nextMondayWindow } from "@/lib/data/conviction/focus-dossier-core";
import type { GeneratedDailyForecastRecord } from "@/lib/weekly-source/types";
import { FOCUS_DAILY_MARKET_PREFIX } from "@/lib/weekly-source/generated-daily-namespace-core";

const DAY_MS = 86_400_000;

export type FocusDailyAuxiliaryEvidence = {
  evidenceKey: string;
  supportLevels: string[];
  resistanceLevels: string[];
  technicalEvidence: string;
  newsEvidence: string | null;
};

export type FocusClosedDailyBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  synthetic?: boolean;
};

export function filterClosedFocusDailyBars(
  bars: readonly FocusClosedDailyBar[],
  asOfDate: string
): FocusClosedDailyBar[] {
  return bars
    .filter((bar) => bar.date < asOfDate && !bar.synthetic)
    .filter((bar) => [bar.open, bar.high, bar.low, bar.close].every((value) => Number.isFinite(value) && value > 0))
    .filter((bar) => bar.high >= Math.max(bar.open, bar.close) && bar.low <= Math.min(bar.open, bar.close))
    .sort((left, right) => left.date.localeCompare(right.date));
}

export function focusDailyMarketCode(assetId: string): string {
  const normalized = assetId.trim().toUpperCase();
  if (!/^[A-Z0-9-]+$/.test(normalized)) throw new Error("focus-asset-id-invalid");
  return `${FOCUS_DAILY_MARKET_PREFIX}${normalized}`;
}

function dateRange(start: string, days: number): string[] {
  const parsed = Date.parse(`${start}T00:00:00Z`);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== start) throw new Error("focus-period-invalid");
  return Array.from({ length: days }, (_, index) => new Date(parsed + index * DAY_MS).toISOString().slice(0, 10));
}

function isFormalNextWeek(forecast: ConvictionPeriodForecast, start: string, end: string, nowMs: number): boolean {
  const publishedAt = Date.parse(forecast.publishedAt);
  const lockedAt = Date.parse(forecast.lockedAt);
  return forecast.forecastType.startsWith("WEEK") && forecast.periodStart === start && forecast.periodEnd === end &&
    forecast.status === "published" && Number.isFinite(publishedAt) && Number.isFinite(lockedAt) &&
    publishedAt <= nowMs && lockedAt <= nowMs;
}

export function selectFormalNextFocusWeek(input: {
  forecasts: readonly ConvictionPeriodForecast[];
  asOfDate: string;
  nowMs: number;
}): ConvictionPeriodForecast | null {
  const target = nextMondayWindow(input.asOfDate);
  return input.forecasts.filter((forecast) => isFormalNextWeek(forecast, target.start, target.end, input.nowMs))
    .sort((left, right) => right.version - left.version || right.publishedAt.localeCompare(left.publishedAt) || right.id.localeCompare(left.id))[0] ?? null;
}

function probabilities(direction: string): { up: number; flat: number; down: number } {
  if (/跌|回落|回调/.test(direction)) return { up: 20, flat: 35, down: 45 };
  if (/涨|上行|反弹/.test(direction)) return { up: 45, flat: 35, down: 20 };
  return { up: 25, flat: 50, down: 25 };
}

function stableHash(value: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function buildFocusDailyPublicationBatch(input: {
  assetId: string;
  weekly: ConvictionPeriodForecast;
  asOfDate: string;
  nowMs: number;
  auxiliary: FocusDailyAuxiliaryEvidence;
  latest: readonly GeneratedDailyForecastRecord[];
}): { all: GeneratedDailyForecastRecord[]; append: GeneratedDailyForecastRecord[] } {
  const target = nextMondayWindow(input.asOfDate);
  if (!isFormalNextWeek(input.weekly, target.start, target.end, input.nowMs)) throw new Error("focus-week-not-formally-locked");
  const marketCode = focusDailyMarketCode(input.assetId);
  const latestByDate = new Map(input.latest.map((record) => [record.forecastDate, record]));
  const sourceDays = new Map((input.weekly.dailyPath ?? []).map((day) => [day.date, day]));
  const publishedAt = new Date(input.nowMs).toISOString();
  const all = dateRange(target.start, 7).map((forecastDate) => {
    const sourceDay = sourceDays.get(forecastDate);
    const direction = sourceDay?.direction?.trim() || "NEUTRAL";
    const path = sourceDay?.summary?.trim() || "观察：正式锁定周资料未提供该日独立节奏，不从周卦机械拆分每日走势。";
    const probs = probabilities(direction);
    const evidenceKey = stableHash(JSON.stringify({
      sourceId: input.weekly.id,
      sourceVersion: input.weekly.version,
      forecastDate,
      direction,
      path,
      sourceConfirmation: sourceDay?.confirmation ?? null,
      sourceRisk: sourceDay?.riskNote ?? null,
      auxiliary: input.auxiliary.evidenceKey,
    }));
    const previous = latestByDate.get(forecastDate) ?? null;
    const version = previous ? previous.version + 1 : 1;
    return {
      id: `GDF-${marketCode}-${forecastDate.replace(/-/g, "")}-V${version}`,
      marketCode,
      forecastDate,
      sourceWeeklyForecastId: input.weekly.id,
      direction,
      upProbability: probs.up,
      sidewaysProbability: probs.flat,
      downProbability: probs.down,
      expectedPath: path,
      supportLevels: input.auxiliary.supportLevels,
      resistanceLevels: input.auxiliary.resistanceLevels,
      confirmationLevel: sourceDay?.confirmation ?? input.weekly.confirmationLevel ?? null,
      invalidationLevel: sourceDay?.riskNote ?? input.weekly.invalidationLevel ?? null,
      riskLevel: input.weekly.riskLevel,
      catalysts: input.weekly.catalysts,
      risks: input.weekly.risks,
      liuyaoEvidence: `正式锁定周来源 ${input.weekly.id} V${input.weekly.version}；方向 ${input.weekly.direction}；日节奏${sourceDay ? "来自原始dailyPath" : "缺失，保持NEUTRAL观察"}。`,
      qimenEvidence: null,
      calendarEvidence: null,
      technicalEvidence: input.auxiliary.technicalEvidence,
      newsEvidence: input.auxiliary.newsEvidence,
      marketProgressStatus: "NOT_STARTED" as const,
      revisionReason: `FOCUS_EVIDENCE:${evidenceKey}`,
      previousVersionId: previous?.id ?? null,
      version,
      status: "PUBLISHED" as const,
      generatedAt: publishedAt,
      publishedAt,
      lockedAt: null,
      validatedAt: null,
      validationStatus: null,
    };
  });
  return {
    all,
    append: all.filter((candidate) => latestByDate.get(candidate.forecastDate)?.revisionReason !== candidate.revisionReason),
  };
}

export async function executeAtomicFocusDailyAppend(input: {
  records: readonly GeneratedDailyForecastRecord[];
  writeAll: (records: readonly GeneratedDailyForecastRecord[]) => Promise<GeneratedDailyForecastRecord[]>;
  isUniqueConflict: (error: unknown) => boolean;
  readWinners: (records: readonly GeneratedDailyForecastRecord[]) => Promise<GeneratedDailyForecastRecord[]>;
}): Promise<{ created: number; records: GeneratedDailyForecastRecord[] }> {
  try {
    const records = await input.writeAll(input.records);
    if (records.length !== input.records.length) throw new Error("focus-publication-batch-incomplete");
    return { created: records.length, records };
  } catch (error) {
    if (!input.isUniqueConflict(error)) throw error;
    const winners = await input.readWinners(input.records);
    if (winners.length !== input.records.length) throw error;
    return { created: 0, records: winners };
  }
}
