import type { ConvictionPeriodForecast } from "@/lib/data/conviction/asteroid-forecasts";
import { nextMondayWindow } from "@/lib/data/conviction/focus-dossier-core";
import {
  focusAuthorityDerivedStep,
  focusAuthorityDisplayWindow,
  focusAuthorityIsFormal,
  focusFutureRhythmRevision,
  selectFocusCurrentAuthority,
} from "@/lib/data/conviction/focus-daily-policy-core";
import type { CalendarEvidence, GeneratedDailyForecastRecord } from "@/lib/weekly-source/types";
import { FOCUS_DAILY_MARKET_PREFIX } from "@/lib/weekly-source/generated-daily-namespace-core";
import { buildFocusQimenParallelReading } from "@/lib/forecasts/focus-qimen-parallel";
import { getDayGanzhi, relateGanzhiToWeeklyDirection } from "@/lib/calendar/ganzhi";
import { isFocusTradingDay } from "@/lib/data/conviction/focus-market-session";

const DAY_MS = 86_400_000;
export type FocusDailySourceKind = "TEACHER_DAILY" | "MOOX_WEEK_DERIVED" | "MOOX_PERIOD_DERIVED" | "MOOX_ROLLING_REVISION";
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
  chanTimeframes?: Array<"1H" | "4H" | "1D">;
  chanStage?: string | null;
  sessionMovePct?: number | null;
  recentMovePct?: number | null;
  currentPrice?: number | null;
  previousClose?: number | null;
};
export type FocusClosedDailyBar = { date: string; open: number; high: number; low: number; close: number; synthetic?: boolean };
export type FocusDailyQuoteCapability = { available: boolean; market: "CRYPTO" | "HK" | "CN" | "US" | null; quoteSymbol: string | null; reason: string | null };
export type FocusDailyChanCapability = {
  catalogSupported: boolean;
  instrument: string | null;
  analyzedTimeframes: Array<"1H" | "1D">;
  reason: string | null;
};

const CHAN_FOCUS_INSTRUMENTS: Readonly<Record<string, string>> = Object.freeze({
  BTC: "BTCUSDT", ETH: "ETHUSDT", SOL: "SOLUSDT", HYPE: "HYPEUSDT", ASTEROID: "ASTEROID-DEX",
  SNDK: "SNDK", MU: "MU", NBIS: "NBIS", GOOGL: "GOOGL", GOOG: "GOOGL", MSFT: "MSFT",
  TSLA: "TSLA", LITE: "LITE", SPCX: "SPCX", INTC: "INTC",
  GOLD: "GOLD", SILVER: "SILVER", WTI: "WTI",
  "002460": "002460.SZ", "300784": "300784.SZ", "300562": "300562.SZ", "688825": "688825.SS",
  "00700": "0700.HK", "0700": "0700.HK", "688111": "688111.SS",
});

export function focusDailyChanCapability(symbolInput: string): FocusDailyChanCapability {
  const instrument = CHAN_FOCUS_INSTRUMENTS[symbolInput.trim().toUpperCase()] ?? null;
  return instrument
    ? { catalogSupported: true, instrument, analyzedTimeframes: ["1H"], reason: null }
    : { catalogSupported: false, instrument: null, analyzedTimeframes: [], reason: "CHAN_INSTRUMENT_UNAVAILABLE" };
}
export function focusDailyQuoteCapability(input: { symbol: string; assetType?: string; exchange?: string | null }): FocusDailyQuoteCapability {
  const symbol = input.symbol.trim().toUpperCase();
  if (!symbol || symbol === "ASTEROID") return { available: false, market: null, quoteSymbol: null, reason: "QUOTE_MAPPING_UNAVAILABLE" };
  if (input.assetType === "CRYPTO") return { available: true, market: "CRYPTO", quoteSymbol: `${symbol}-USD`, reason: null };
  if (input.assetType === "COMMODITY") {
    const commoditySymbols: Readonly<Record<string, string>> = Object.freeze({ GOLD: "GC=F", SILVER: "SI=F", WTI: "CL=F" });
    const quoteSymbol = commoditySymbols[symbol] ?? null;
    return quoteSymbol
      ? { available: true, market: "US", quoteSymbol, reason: null }
      : { available: false, market: null, quoteSymbol: null, reason: "QUOTE_MAPPING_UNAVAILABLE" };
  }
  if (/香港/.test(input.exchange ?? "")) return { available: true, market: "HK", quoteSymbol: `${symbol.padStart(4, "0")}.HK`, reason: null };
  if (/上海/.test(input.exchange ?? "")) return { available: true, market: "CN", quoteSymbol: `${symbol}.SS`, reason: null };
  if (/深圳/.test(input.exchange ?? "")) return { available: true, market: "CN", quoteSymbol: `${symbol}.SZ`, reason: null };
  return { available: true, market: "US", quoteSymbol: symbol, reason: null };
}

function validFocusDailyBars(bars: readonly FocusClosedDailyBar[]): FocusClosedDailyBar[] {
  return bars.filter((bar) => !bar.synthetic)
    .filter((bar) => [bar.open, bar.high, bar.low, bar.close].every((value) => Number.isFinite(value) && value > 0))
    .filter((bar) => bar.high >= Math.max(bar.open, bar.close) && bar.low <= Math.min(bar.open, bar.close))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function filterClosedFocusDailyBars(bars: readonly FocusClosedDailyBar[], asOfDate: string): FocusClosedDailyBar[] {
  return validFocusDailyBars(bars).filter((bar) => bar.date < asOfDate);
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
  if (length < 1 || length > 14) throw new Error("focus-period-out-of-range");
  return Array.from({ length }, (_, index) => new Date(first + index * DAY_MS).toISOString().slice(0, 10));
}
function isFormalWeek(forecast: ConvictionPeriodForecast, start: string, end: string, nowMs: number): boolean {
  return forecast.forecastType.startsWith("WEEK") && forecast.periodStart === start && forecast.periodEnd === end && focusAuthorityIsFormal(forecast, nowMs);
}
function latestFormal(forecasts: readonly ConvictionPeriodForecast[], start: string, end: string, nowMs: number) {
  return forecasts.filter((forecast) => isFormalWeek(forecast, start, end, nowMs)).sort((a, b) => b.version - a.version || b.publishedAt.localeCompare(a.publishedAt) || b.id.localeCompare(a.id))[0] ?? null;
}
export function selectFormalNextFocusWeek(input: { forecasts: readonly ConvictionPeriodForecast[]; asOfDate: string; nowMs: number }) {
  const target = nextMondayWindow(input.asOfDate);
  return latestFormal(input.forecasts, target.start, target.end, input.nowMs);
}
export function selectFormalCurrentFocusWeek(input: { forecasts: readonly ConvictionPeriodForecast[]; asOfDate: string; nowMs: number }) {
  return input.forecasts.filter((forecast) => forecast.forecastType.startsWith("WEEK") && focusAuthorityIsFormal(forecast, input.nowMs) && forecast.periodStart <= input.asOfDate && input.asOfDate <= forecast.periodEnd)
    .sort((a, b) => b.version - a.version || b.publishedAt.localeCompare(a.publishedAt) || b.id.localeCompare(a.id))[0] ?? null;
}
export function selectFormalCurrentFocusAuthority(input: { forecasts: readonly ConvictionPeriodForecast[]; asOfDate: string; nowMs: number }) {
  return selectFocusCurrentAuthority(input);
}

function stableHash(value: string): string { let hash = 2_166_136_261; for (let i = 0; i < value.length; i += 1) { hash ^= value.charCodeAt(i); hash = Math.imul(hash, 16_777_619); } return (hash >>> 0).toString(16).padStart(8, "0"); }
function probabilities(direction: string) { if (/回落|回撤|偏弱|探底|下跌/.test(direction)) return { up: 20, flat: 35, down: 45 }; if (/偏强|上行|上涨|反弹|修复|冲高/.test(direction)) return { up: 45, flat: 35, down: 20 }; return { up: 25, flat: 50, down: 25 }; }
function encode(value: string): string { return encodeURIComponent(value); }
function sourceMarker(kind: FocusDailySourceKind, authority: ConvictionPeriodForecast, asOfDate: string, liuyaoDirection: string, liuyaoSummary: string) {
  return `FOCUS_SOURCE_KIND=${kind};AS_OF=${asOfDate};AUTHORITY=${authority.id}:V${authority.version};FOCUS_LIUYAO_DIRECTION=${encode(liuyaoDirection)};FOCUS_LIUYAO_SUMMARY=${encode(liuyaoSummary)}`;
}

function exactDatedKeyEvidence(authority: ConvictionPeriodForecast, forecastDate: string) {
  return (authority.keyDates ?? [])
    .filter((item) => item.date === forecastDate)
    .map((item) => ({ date: forecastDate, type: item.source, label: item.label }));
}

function encodeCalendarEvidence(authority: ConvictionPeriodForecast, forecastDate: string): CalendarEvidence {
  const day = getDayGanzhi(forecastDate);
  const relationToWeekly = relateGanzhiToWeeklyDirection(day, authority.direction);
  const evidence = exactDatedKeyEvidence(authority, forecastDate);
  const source = authority.keyDates?.find((item) => item.date === forecastDate);
  const explicitGanzhi = source?.ganzhi?.trim();
  const keyMarker = evidence.length ? `；FOCUS_KEY_DAY_EVIDENCE=${JSON.stringify(evidence)}` : "";
  return {
    calendarDateChina: forecastDate,
    dayStem: day.dayStem,
    dayBranch: day.dayBranch,
    dayElement: day.dayElement,
    ganzhiLabel: explicitGanzhi || day.ganzhiLabel,
    relationToWeekly,
    note: `日干支=${day.ganzhiLabel}；天干${day.dayElement}；地支${day.branchElement}；对周期方向=${relationToWeekly}${keyMarker}`,
  };
}

export function buildFocusDailyPublicationBatch(input: { assetId: string; weekly: ConvictionPeriodForecast; asOfDate: string; nowMs: number; auxiliary: FocusDailyAuxiliaryEvidence; latest: readonly GeneratedDailyForecastRecord[]; mode?: "CURRENT" | "NEXT" }): { all: GeneratedDailyForecastRecord[]; append: GeneratedDailyForecastRecord[] } {
  const mode = input.mode ?? "NEXT";
  const authority = input.weekly;
  const expected = mode === "NEXT" ? nextMondayWindow(input.asOfDate) : focusAuthorityDisplayWindow(authority, input.asOfDate);
  if (mode === "NEXT") {
    if (!isFormalWeek(authority, expected.start, expected.end, input.nowMs)) throw new Error("focus-next-week-not-formally-locked");
  } else if (!focusAuthorityIsFormal(authority, input.nowMs) || !(authority.periodStart <= input.asOfDate && input.asOfDate <= authority.periodEnd)) {
    throw new Error("focus-current-authority-not-formally-locked");
  }

  const marketCode = focusDailyMarketCode(input.assetId), latestByDate = new Map(input.latest.map((record) => [record.forecastDate, record]));
  const sourceDays = new Map((authority.dailyPath ?? []).map((day) => [day.date, day]));
  const publishedAt = new Date(input.nowMs).toISOString();
  const periodDates = dates(expected.start, expected.end);
  const all = periodDates.filter((forecastDate) => (mode === "NEXT" || forecastDate >= input.asOfDate) && isFocusTradingDay(input.assetId, forecastDate)).map((forecastDate) => {
    const sourceDay = sourceDays.get(forecastDate);
    const base = sourceDay
      ? { direction: sourceDay.direction.trim(), summary: sourceDay.summary.trim() }
      : focusAuthorityDerivedStep(authority, forecastDate, input.asOfDate);
    const revised = mode === "CURRENT"
      ? focusFutureRhythmRevision({ original: base, realizedPhase: input.auxiliary.realizedPhase ?? "NONE", forecastDate, asOfDate: input.asOfDate })
      : { ...base, revised: false };
    const sourceKind: FocusDailySourceKind = revised.revised
      ? "MOOX_ROLLING_REVISION"
      : sourceDay ? "TEACHER_DAILY" : authority.forecastType.startsWith("WEEK") ? "MOOX_WEEK_DERIVED" : "MOOX_PERIOD_DERIVED";
    const liuyaoDirection = base.direction;
    const liuyaoSummary = base.summary;
    const direction = revised.direction;
    const path = revised.summary;
    const qimenReading = buildFocusQimenParallelReading({
      assetId: input.assetId,
      forecastDate,
      liuyaoDirection,
    });
    const calendarEvidence = encodeCalendarEvidence(authority, forecastDate);
    const teacherQimenKeyDate = exactDatedKeyEvidence(authority, forecastDate).some((item) => item.type === "QIMEN") ? calendarEvidence.note : null;
    const qimenEvidence = [qimenReading.evidence, teacherQimenKeyDate].filter((value): value is string => Boolean(value)).join("；") || null;
    // A published forecast gets a new version only when its forecast meaning changes.
    // Live prices, intraday Chan levels and X mention counts are enrichment data and may
    // change on every cron run; including them here previously created dozens of
    // indistinguishable versions for the same asset/date. The current as-of date is
    // already carried by the source marker, while a realised phase change alters
    // sourceKind/direction/path and therefore still creates an auditable revision.
    const evidenceKey = stableHash(JSON.stringify({ sourceId: authority.id, sourceVersion: authority.version, forecastDate, liuyaoDirection, liuyaoSummary, direction, path, sourceKind, confirmation: sourceDay?.confirmation ?? authority.confirmationLevel ?? null, risk: sourceDay?.riskNote ?? authority.invalidationLevel ?? null, qimen: qimenReading.verificationKey }));
    const previous = latestByDate.get(forecastDate) ?? null, version = previous ? previous.version + 1 : 1, probs = probabilities(direction);
    const technicalEvidence = [
      input.auxiliary.technicalEvidence,
      `FOCUS_AUX=${JSON.stringify({ marketDataStatus: input.auxiliary.marketDataStatus ?? (input.auxiliary.supportLevels.length ? "AVAILABLE" : "UNAVAILABLE"), chanStatus: input.auxiliary.chanStatus ?? "UNAVAILABLE", chanTimeframes: input.auxiliary.chanTimeframes ?? [], chanStage: input.auxiliary.chanStage ?? null, sessionMovePct: input.auxiliary.sessionMovePct ?? null, recentMovePct: input.auxiliary.recentMovePct ?? null, currentPrice: input.auxiliary.currentPrice ?? null, previousClose: input.auxiliary.previousClose ?? null })}`,
    ].filter(Boolean).join("; ");
    return {
      id: `GDF-${marketCode}-${forecastDate.replace(/-/g, "")}-V${version}`,
      marketCode,
      forecastDate,
      sourceWeeklyForecastId: authority.id,
      direction,
      upProbability: probs.up,
      sidewaysProbability: probs.flat,
      downProbability: probs.down,
      expectedPath: path,
      supportLevels: input.auxiliary.supportLevels,
      resistanceLevels: input.auxiliary.resistanceLevels,
      confirmationLevel: sourceDay?.confirmation ?? authority.confirmationLevel ?? null,
      invalidationLevel: sourceDay?.riskNote ?? authority.invalidationLevel ?? null,
      riskLevel: authority.riskLevel,
      catalysts: authority.catalysts,
      risks: authority.risks,
      liuyaoEvidence: sourceMarker(sourceKind, authority, input.asOfDate, liuyaoDirection, liuyaoSummary),
      qimenEvidence,
      calendarEvidence,
      technicalEvidence,
      newsEvidence: input.auxiliary.newsEvidence,
      marketProgressStatus: revised.revised ? "AHEAD" as const : "NOT_STARTED" as const,
      revisionReason: `FOCUS_DAILY:${sourceKind}:${evidenceKey}`,
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
  return { all, append: all.filter((candidate) => latestByDate.get(candidate.forecastDate)?.revisionReason !== candidate.revisionReason) };
}

export async function executeAtomicFocusDailyAppend(input: { records: readonly GeneratedDailyForecastRecord[]; writeAll: (records: readonly GeneratedDailyForecastRecord[]) => Promise<GeneratedDailyForecastRecord[]>; isUniqueConflict: (error: unknown) => boolean; readWinners: (records: readonly GeneratedDailyForecastRecord[]) => Promise<GeneratedDailyForecastRecord[]> }): Promise<{ created: number; records: GeneratedDailyForecastRecord[] }> {
  try { const records = await input.writeAll(input.records); if (records.length !== input.records.length) throw new Error("focus-publication-batch-incomplete"); return { created: records.length, records }; }
  catch (error) { if (!input.isUniqueConflict(error)) throw error; const winners = await input.readWinners(input.records); if (winners.length !== input.records.length) throw error; return { created: 0, records: winners }; }
}
