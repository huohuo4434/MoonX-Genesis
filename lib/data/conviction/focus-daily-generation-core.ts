import type { ConvictionPeriodForecast } from "@/lib/data/conviction/asteroid-forecasts";
import { nextMondayWindow } from "@/lib/data/conviction/focus-dossier-core";
import type { CalendarEvidence, GeneratedDailyForecastRecord } from "@/lib/weekly-source/types";
import { FOCUS_DAILY_MARKET_PREFIX } from "@/lib/weekly-source/generated-daily-namespace-core";

const DAY_MS = 86_400_000;
export type FocusDailySourceKind = "TEACHER_DAILY" | "MOOX_WEEK_DERIVED" | "MOOX_ROLLING_REVISION";
export type FocusRealizedPhase = "NONE" | "EARLY_RALLY" | "EARLY_DROP";
export type FocusDailyAuxiliaryEvidence = {
  evidenceKey: string;
  supportLevels: string[];
  resistanceLevels: string[];
  technicalEvidence: string | null;
  newsEvidence: string | null;
  realizedPhase?: FocusRealizedPhase;
  marketDataStatus?: "AVAILABLE" | "UNAVAILABLE";
  chanStatus?: "AVAILABLE" | "UNAVAILABLE";
  chanTimeframes?: Array<"1D">;
  chanStage?: string | null;
};
export type FocusClosedDailyBar = { date: string; open: number; high: number; low: number; close: number; synthetic?: boolean };
export type FocusDailyQuoteCapability = { available: boolean; market: "CRYPTO" | "HK" | "CN" | "US" | null; quoteSymbol: string | null; reason: string | null };
export type FocusDailyChanCapability = {
  catalogSupported: boolean;
  instrument: string | null;
  analyzedTimeframes: Array<"1D">;
  reason: string | null;
};

const CHAN_FOCUS_INSTRUMENTS: Readonly<Record<string, string>> = Object.freeze({
  BTC: "BTCUSDT", ETH: "ETHUSDT", SNDK: "SNDK", MU: "MU", GOOGL: "GOOGL", MSFT: "MSFT",
});

export function focusDailyChanCapability(symbolInput: string): FocusDailyChanCapability {
  const instrument = CHAN_FOCUS_INSTRUMENTS[symbolInput.trim().toUpperCase()] ?? null;
  return instrument
    ? { catalogSupported: true, instrument, analyzedTimeframes: ["1D"], reason: null }
    : { catalogSupported: false, instrument: null, analyzedTimeframes: [], reason: "CHAN_INSTRUMENT_UNAVAILABLE" };
}
export function focusDailyQuoteCapability(input: { symbol: string; assetType?: string; exchange?: string | null }): FocusDailyQuoteCapability {
  const symbol = input.symbol.trim().toUpperCase();
  if (!symbol || symbol === "ASTEROID") return { available: false, market: null, quoteSymbol: null, reason: "QUOTE_MAPPING_UNAVAILABLE" };
  if (input.assetType === "CRYPTO") return { available: true, market: "CRYPTO", quoteSymbol: `${symbol}-USD`, reason: null };
  if (/香港/.test(input.exchange ?? "")) return { available: true, market: "HK", quoteSymbol: `${symbol.padStart(4, "0")}.HK`, reason: null };
  if (/上海/.test(input.exchange ?? "")) return { available: true, market: "CN", quoteSymbol: `${symbol}.SS`, reason: null };
  if (/深圳/.test(input.exchange ?? "")) return { available: true, market: "CN", quoteSymbol: `${symbol}.SZ`, reason: null };
  return { available: true, market: "US", quoteSymbol: symbol, reason: null };
}

export function filterClosedFocusDailyBars(bars: readonly FocusClosedDailyBar[], asOfDate: string): FocusClosedDailyBar[] {
  return bars.filter((bar) => bar.date < asOfDate && !bar.synthetic)
    .filter((bar) => [bar.open, bar.high, bar.low, bar.close].every((value) => Number.isFinite(value) && value > 0))
    .filter((bar) => bar.high >= Math.max(bar.open, bar.close) && bar.low <= Math.min(bar.open, bar.close))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function focusDailyMarketCode(assetId: string): string {
  const normalized = assetId.trim().toUpperCase();
  if (!/^[A-Z0-9-]+$/.test(normalized)) throw new Error("focus-asset-id-invalid");
  return `${FOCUS_DAILY_MARKET_PREFIX}${normalized}`;
}

function parseDate(value: string): number {
  const parsed = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== value) throw new Error("focus-period-invalid");
  return parsed;
}
function dates(start: string, end: string): string[] {
  const first = parseDate(start), last = parseDate(end);
  const length = Math.floor((last - first) / DAY_MS) + 1;
  // A formally locked weekly study may begin after Monday when the source is
  // first supplied mid-week. Preserve its exact period instead of rejecting a
  // valid short week; cap the horizon so malformed/sentinel ranges fail closed.
  if (length < 1 || length > 14) throw new Error("focus-week-period-out-of-range");
  return Array.from({ length }, (_, index) => new Date(first + index * DAY_MS).toISOString().slice(0, 10));
}
function isFormalWeek(forecast: ConvictionPeriodForecast, start: string, end: string, nowMs: number): boolean {
  const publishedAt = Date.parse(forecast.publishedAt), lockedAt = Date.parse(forecast.lockedAt);
  return forecast.forecastType.startsWith("WEEK") && forecast.periodStart === start && forecast.periodEnd === end && forecast.status === "published" && Number.isFinite(publishedAt) && Number.isFinite(lockedAt) && publishedAt <= nowMs && lockedAt <= nowMs;
}
function latestFormal(forecasts: readonly ConvictionPeriodForecast[], start: string, end: string, nowMs: number) {
  return forecasts.filter((forecast) => isFormalWeek(forecast, start, end, nowMs)).sort((a, b) => b.version - a.version || b.publishedAt.localeCompare(a.publishedAt) || b.id.localeCompare(a.id))[0] ?? null;
}
export function selectFormalNextFocusWeek(input: { forecasts: readonly ConvictionPeriodForecast[]; asOfDate: string; nowMs: number }) {
  const target = nextMondayWindow(input.asOfDate);
  return latestFormal(input.forecasts, target.start, target.end, input.nowMs);
}
export function selectFormalCurrentFocusWeek(input: { forecasts: readonly ConvictionPeriodForecast[]; asOfDate: string; nowMs: number }) {
  return input.forecasts.filter((forecast) => isFormalWeek(forecast, forecast.periodStart, forecast.periodEnd, input.nowMs) && forecast.periodStart <= input.asOfDate && input.asOfDate <= forecast.periodEnd)
    .sort((a, b) => b.version - a.version || b.publishedAt.localeCompare(a.publishedAt) || b.id.localeCompare(a.id))[0] ?? null;
}

function stableHash(value: string): string { let hash = 2_166_136_261; for (let i = 0; i < value.length; i += 1) { hash ^= value.charCodeAt(i); hash = Math.imul(hash, 16_777_619); } return (hash >>> 0).toString(16).padStart(8, "0"); }
function weeklyBias(value: string): "UP" | "DOWN" | "MIXED" {
  if (/SHORT|BEAR|下跌|看空|回落/i.test(value)) return "DOWN";
  if (/LONG|BULL|上涨|看多|反弹/i.test(value)) return "UP";
  return "MIXED";
}
function pathTemplate(weekly: ConvictionPeriodForecast): Array<{ direction: string; path: string }> {
  const text = [weekly.direction, weekly.expectedPath, weekly.summary, weekly.rollingUpdate?.label, weekly.rollingUpdate?.summary, weekly.ichingEvidence?.notes].filter(Boolean).join(" ");
  if (/先跌后涨|探底回升|dip.+rebound/i.test(text)) return [{ direction: "回撤观察", path: "先行回撤，等待止跌" }, { direction: "探底", path: "延续探底但不预设最低点" }, { direction: "企稳观察", path: "观察回落是否完成" }, { direction: "修复", path: "进入修复窗口" }, { direction: "反弹", path: "修复延续" }, { direction: "整固", path: "反弹后整固" }, { direction: "偏强观察", path: "保留周方向，等待确认" }];
  if (/冲高回落|先涨后跌|surge.+pullback/i.test(text)) return [{ direction: "偏强", path: "先行上冲" }, { direction: "冲高", path: "观察冲高兑现" }, { direction: "高位整固", path: "防止重复追涨" }, { direction: "回落", path: "进入兑现或回撤窗口" }, { direction: "回撤观察", path: "观察回落深度" }, { direction: "企稳观察", path: "等待回撤稳定" }, { direction: "周末确认", path: "核验周路径是否完成" }];
  const bias = weeklyBias(text);
  if (bias === "UP") return ["整固", "偏强", "回踩观察", "修复上行", "整固", "偏强确认", "周末复核"].map((direction, index) => ({ direction, path: index % 2 ? "顺周方向推进，仍等待日内确认" : "不追价，观察结构与兑现程度" }));
  if (bias === "DOWN") return ["整固", "偏弱", "反抽观察", "回落", "整固", "偏弱确认", "周末复核"].map((direction, index) => ({ direction, path: index % 2 ? "顺周方向推进，仍等待日内确认" : "不追价，观察结构与兑现程度" }));
  return ["区间观察", "波动观察", "区间观察", "等待确认", "波动观察", "等待确认", "周末复核"].map((direction) => ({ direction, path: "周方向不清晰时只记录节奏，不生成单边日结论" }));
}
function probabilities(direction: string) { if (/回落|回撤|偏弱|探底/.test(direction)) return { up: 20, flat: 35, down: 45 }; if (/偏强|上行|反弹|修复|冲高/.test(direction)) return { up: 45, flat: 35, down: 20 }; return { up: 25, flat: 50, down: 25 }; }
function sourceMarker(kind: FocusDailySourceKind, weekly: ConvictionPeriodForecast, asOfDate: string) { return `FOCUS_SOURCE_KIND=${kind};AS_OF=${asOfDate};WEEKLY=${weekly.id}:V${weekly.version}`; }

function exactDatedKeyEvidence(weekly: ConvictionPeriodForecast, forecastDate: string) {
  return (weekly.keyDates ?? [])
    .filter((item) => item.date === forecastDate)
    .map((item) => ({ date: forecastDate, type: item.source, label: item.label }));
}

function encodeCalendarEvidence(weekly: ConvictionPeriodForecast, forecastDate: string): CalendarEvidence | null {
  const evidence = exactDatedKeyEvidence(weekly, forecastDate);
  if (!evidence.length) return null;
  const source = weekly.keyDates?.find((item) => item.date === forecastDate);
  return {
    calendarDateChina: forecastDate,
    dayStem: "",
    dayBranch: "",
    dayElement: "",
    ganzhiLabel: source?.ganzhi ?? "",
    relationToWeekly: "不变",
    note: `FOCUS_KEY_DAY_EVIDENCE=${JSON.stringify(evidence)}`,
  } as CalendarEvidence;
}

export function buildFocusDailyPublicationBatch(input: { assetId: string; weekly: ConvictionPeriodForecast; asOfDate: string; nowMs: number; auxiliary: FocusDailyAuxiliaryEvidence; latest: readonly GeneratedDailyForecastRecord[]; mode?: "CURRENT" | "NEXT" }): { all: GeneratedDailyForecastRecord[]; append: GeneratedDailyForecastRecord[] } {
  const mode = input.mode ?? "NEXT";
  const expected = mode === "NEXT" ? nextMondayWindow(input.asOfDate) : { start: input.weekly.periodStart, end: input.weekly.periodEnd };
  if (!isFormalWeek(input.weekly, expected.start, expected.end, input.nowMs)) throw new Error("focus-week-not-formally-locked");
  const marketCode = focusDailyMarketCode(input.assetId), latestByDate = new Map(input.latest.map((record) => [record.forecastDate, record]));
  const sourceDays = new Map((input.weekly.dailyPath ?? []).map((day) => [day.date, day]));
  const template = pathTemplate(input.weekly), publishedAt = new Date(input.nowMs).toISOString();
  const periodDates = dates(expected.start, expected.end);
  const all = periodDates.filter((forecastDate) => mode === "NEXT" || forecastDate >= input.asOfDate).map((forecastDate) => {
    const index = periodDates.indexOf(forecastDate);
    const sourceDay = sourceDays.get(forecastDate);
    const rolling = mode === "CURRENT" && !sourceDay && input.auxiliary.realizedPhase && input.auxiliary.realizedPhase !== "NONE";
    const sourceKind: FocusDailySourceKind = sourceDay ? "TEACHER_DAILY" : rolling ? "MOOX_ROLLING_REVISION" : "MOOX_WEEK_DERIVED";
    let derived = template[index] ?? template.at(-1)!;
    if (rolling && forecastDate > input.asOfDate) derived = input.auxiliary.realizedPhase === "EARLY_RALLY" ? { direction: "整固兑现观察", path: "前段上涨已提前兑现，未来日改为整固/兑现观察，不重复机械大涨" } : { direction: "企稳修复观察", path: "前段下跌已提前兑现，未来日改为企稳/修复观察，不重复机械大跌" };
    const direction = sourceDay?.direction?.trim() || derived.direction;
    const path = sourceDay?.summary?.trim() || `${derived.path}；该日为MOOX基于正式锁定周路径的确定性拆解，不是独立日卦或奇门盘。`;
    const evidenceKey = stableHash(JSON.stringify({ sourceId: input.weekly.id, sourceVersion: input.weekly.version, forecastDate, direction, path, sourceKind, confirmation: sourceDay?.confirmation ?? input.weekly.confirmationLevel ?? null, risk: sourceDay?.riskNote ?? input.weekly.invalidationLevel ?? null, auxiliary: input.auxiliary.evidenceKey }));
    const previous = latestByDate.get(forecastDate) ?? null, version = previous ? previous.version + 1 : 1, probs = probabilities(direction);
    const calendarEvidence = encodeCalendarEvidence(input.weekly, forecastDate);
    const qimenEvidence = exactDatedKeyEvidence(input.weekly, forecastDate).some((item) => item.type === "QIMEN") ? calendarEvidence?.note ?? null : null;
    const technicalEvidence = [
      input.auxiliary.technicalEvidence,
      `FOCUS_AUX=${JSON.stringify({ marketDataStatus: input.auxiliary.marketDataStatus ?? (input.auxiliary.supportLevels.length ? "AVAILABLE" : "UNAVAILABLE"), chanStatus: input.auxiliary.chanStatus ?? "UNAVAILABLE", chanTimeframes: input.auxiliary.chanTimeframes ?? [], chanStage: input.auxiliary.chanStage ?? null })}`,
    ].filter(Boolean).join("; ");
    return { id: `GDF-${marketCode}-${forecastDate.replace(/-/g, "")}-V${version}`, marketCode, forecastDate, sourceWeeklyForecastId: input.weekly.id, direction, upProbability: probs.up, sidewaysProbability: probs.flat, downProbability: probs.down, expectedPath: path, supportLevels: input.auxiliary.supportLevels, resistanceLevels: input.auxiliary.resistanceLevels, confirmationLevel: sourceDay?.confirmation ?? input.weekly.confirmationLevel ?? null, invalidationLevel: sourceDay?.riskNote ?? input.weekly.invalidationLevel ?? null, riskLevel: input.weekly.riskLevel, catalysts: input.weekly.catalysts, risks: input.weekly.risks, liuyaoEvidence: `${sourceMarker(sourceKind, input.weekly, input.asOfDate)}；正式周方向=${input.weekly.direction}；日节奏不改写周证据。`, qimenEvidence, calendarEvidence, technicalEvidence, newsEvidence: input.auxiliary.newsEvidence, marketProgressStatus: rolling ? "AHEAD" as const : "NOT_STARTED" as const, revisionReason: `FOCUS_DAILY:${sourceKind}:${evidenceKey}`, previousVersionId: previous?.id ?? null, version, status: "PUBLISHED" as const, generatedAt: publishedAt, publishedAt, lockedAt: null, validatedAt: null, validationStatus: null };
  });
  return { all, append: all.filter((candidate) => latestByDate.get(candidate.forecastDate)?.revisionReason !== candidate.revisionReason) };
}

export async function executeAtomicFocusDailyAppend(input: { records: readonly GeneratedDailyForecastRecord[]; writeAll: (records: readonly GeneratedDailyForecastRecord[]) => Promise<GeneratedDailyForecastRecord[]>; isUniqueConflict: (error: unknown) => boolean; readWinners: (records: readonly GeneratedDailyForecastRecord[]) => Promise<GeneratedDailyForecastRecord[]> }): Promise<{ created: number; records: GeneratedDailyForecastRecord[] }> {
  try { const records = await input.writeAll(input.records); if (records.length !== input.records.length) throw new Error("focus-publication-batch-incomplete"); return { created: records.length, records }; }
  catch (error) { if (!input.isUniqueConflict(error)) throw error; const winners = await input.readWinners(input.records); if (winners.length !== input.records.length) throw error; return { created: 0, records: winners }; }
}
