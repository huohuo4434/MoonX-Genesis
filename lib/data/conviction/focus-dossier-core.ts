import type { ConvictionPeriodForecast } from "@/lib/data/conviction/asteroid-forecasts";
import type { FocusDossierDay, FocusDossierView, FocusWeekPreparation } from "@/types/focus-dossier";
import type { GeneratedDailyForecastRecord } from "@/lib/weekly-source/types";

const DAY_MS = 86_400_000;

function parseDateKey(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== value) return null;
  return parsed;
}

function addDays(value: string, days: number): string {
  const parsed = parseDateKey(value);
  if (parsed == null) throw new Error(`Invalid date key: ${value}`);
  return new Date(parsed + days * DAY_MS).toISOString().slice(0, 10);
}

function dateRange(start: string, end: string): string[] {
  const first = parseDateKey(start);
  const last = parseDateKey(end);
  if (first == null || last == null || first > last || last - first > 13 * DAY_MS) return [];
  const dates: string[] = [];
  for (let cursor = first; cursor <= last; cursor += DAY_MS) {
    dates.push(new Date(cursor).toISOString().slice(0, 10));
  }
  return dates;
}

function isFormal(forecast: ConvictionPeriodForecast, nowMs: number): boolean {
  const publishedAt = Date.parse(forecast.publishedAt);
  const lockedAt = Date.parse(forecast.lockedAt);
  return forecast.status === "published" && Number.isFinite(publishedAt) && Number.isFinite(lockedAt) &&
    publishedAt <= nowMs && lockedAt <= nowMs;
}

function weeklyForecasts(forecasts: readonly ConvictionPeriodForecast[], nowMs: number) {
  return forecasts.filter((forecast) =>
    forecast.forecastType.startsWith("WEEK") && isFormal(forecast, nowMs) &&
    parseDateKey(forecast.periodStart) != null && parseDateKey(forecast.periodEnd) != null
  );
}

function latest<T extends ConvictionPeriodForecast>(forecasts: readonly T[]): T | null {
  return forecasts.slice().sort((left, right) =>
    right.version - left.version || right.publishedAt.localeCompare(left.publishedAt) || right.id.localeCompare(left.id)
  )[0] ?? null;
}

export function nextMondayWindow(asOfDate: string): { start: string; end: string } {
  const parsed = parseDateKey(asOfDate);
  if (parsed == null) throw new Error(`Invalid date key: ${asOfDate}`);
  const weekday = new Date(parsed).getUTCDay();
  const daysUntilMonday = weekday === 0 ? 1 : 8 - weekday;
  const start = addDays(asOfDate, daysUntilMonday);
  return { start, end: addDays(start, 6) };
}

export function prepareNextFocusWeek(input: {
  assetId: string;
  forecasts: readonly ConvictionPeriodForecast[];
  asOfDate: string;
  nowMs: number;
}): FocusWeekPreparation {
  const target = nextMondayWindow(input.asOfDate);
  const forecast = latest(weeklyForecasts(input.forecasts, input.nowMs).filter((item) =>
    item.periodStart === target.start && item.periodEnd === target.end
  ));
  if (!forecast) {
    return { assetId: input.assetId, targetStart: target.start, targetEnd: target.end, status: "AWAITING_FORMAL_EVIDENCE", forecastId: null, missingDates: dateRange(target.start, target.end) };
  }
  const present = new Set((forecast.dailyPath ?? []).map((day) => day.date));
  const missingDates = dateRange(target.start, target.end).filter((date) => !present.has(date));
  return {
    assetId: input.assetId,
    targetStart: target.start,
    targetEnd: target.end,
    status: missingDates.length ? "EVIDENCE_INCOMPLETE" : "READY",
    forecastId: forecast.id,
    missingDates,
  };
}

export function buildFocusDossier(input: {
  assetId: string;
  forecasts: readonly ConvictionPeriodForecast[];
  asOfDate: string;
  nowMs: number;
  generatedDailies?: readonly GeneratedDailyForecastRecord[];
}): FocusDossierView {
  const weekly = weeklyForecasts(input.forecasts, input.nowMs);
  const current = latest(weekly.filter((item) => item.periodStart <= input.asOfDate && item.periodEnd >= input.asOfDate));
  const next = latest(weekly.filter((item) => item.periodStart > input.asOfDate).sort((a, b) => a.periodStart.localeCompare(b.periodStart)).slice(0, 1));
  const longTerm = latest(input.forecasts.filter((item) => item.forecastType === "YEAR_1" && isFormal(item, input.nowMs)));
  if (!current) {
    return {
      executionAuthority: "RESEARCH_ONLY", tradingEligible: false,
      assetId: input.assetId, asOfDate: input.asOfDate, evidenceStatus: "MISSING", statusLabel: "本周正式资料待更新",
      conclusion: null, periodStart: null, periodEnd: null, dailyPath: [], supportLevels: [], resistanceLevels: [], confirmation: null,
      invalidation: null, occurred: [], pendingVerification: [], nextWeek: next ? { periodStart: next.periodStart, periodEnd: next.periodEnd, conclusion: next.summary, dailyEvidenceReady: dateRange(next.periodStart, next.periodEnd).every((date) => next.dailyPath?.some((day) => day.date === date)) } : null,
      version: null, publicationStatus: "MISSING", lockStatus: "MISSING", lockedAt: null, source: null, longTermBackground: longTerm?.archiveSummary ?? longTerm?.summary ?? null,
    };
  }
  const sourceDays = new Map((current.dailyPath ?? []).map((day) => [day.date, day]));
  const generatedDays = new Map((input.generatedDailies ?? []).filter((day) => {
    const publishedAt = day.publishedAt ? Date.parse(day.publishedAt) : Number.NaN;
    return day.sourceWeeklyForecastId === current.id && ["PUBLISHED", "LOCKED"].includes(day.status) &&
      Number.isFinite(publishedAt) && publishedAt <= input.nowMs;
  }).map((day) => [day.forecastDate, day]));
  const requiredDates = dateRange(current.periodStart, current.periodEnd);
  const dailyPath: FocusDossierDay[] = requiredDates.map((date) => {
    const day = sourceDays.get(date);
    const generated = day?.status === "已验证" ? null : generatedDays.get(date);
    if (generated) return {
      date,
      state: date === input.asOfDate ? "TODAY" as const : "PENDING" as const,
      direction: generated.direction === "NEUTRAL" ? "观察" : generated.direction,
      summary: generated.expectedPath,
      confirmation: generated.confirmationLevel,
      invalidation: generated.invalidationLevel,
    };
    if (!day) return { date, state: "MISSING" as const, direction: null, summary: "该日正式证据待更新，不生成占位预测。", confirmation: null, invalidation: null };
    const state: FocusDossierDay["state"] = day.status === "已验证" ? "OCCURRED" : date === input.asOfDate ? "TODAY" : "PENDING";
    return { date, state, direction: day.direction, summary: day.summary, confirmation: day.confirmation ?? null, invalidation: day.riskNote ?? null };
  });
  const complete = requiredDates.length === 7 && dailyPath.every((day) => day.state !== "MISSING");
  return {
    executionAuthority: "RESEARCH_ONLY", tradingEligible: false,
    assetId: input.assetId, asOfDate: input.asOfDate, evidenceStatus: complete ? "READY" : "INCOMPLETE",
    statusLabel: complete
      ? generatedDays.size > 0 ? "本周结论已锁定；逐日研究已发布" : "本周资料完整并已锁定"
      : "本周结论已锁定；逐日资料待补齐",
    conclusion: current.summary, periodStart: current.periodStart, periodEnd: current.periodEnd, dailyPath,
    supportLevels: current.supportLevels, resistanceLevels: current.resistanceLevels,
    confirmation: current.confirmationLevel ?? null, invalidation: current.invalidationLevel ?? null,
    occurred: dailyPath.filter((day) => day.state === "OCCURRED").map((day) => `${day.date} ${day.summary}`),
    pendingVerification: dailyPath.filter((day) => day.state !== "OCCURRED").map((day) => `${day.date} ${day.summary}`),
    nextWeek: next ? { periodStart: next.periodStart, periodEnd: next.periodEnd, conclusion: next.summary, dailyEvidenceReady: dateRange(next.periodStart, next.periodEnd).every((date) => next.dailyPath?.some((day) => day.date === date)) } : null,
    version: current.version, publicationStatus: "PUBLISHED", lockStatus: "LOCKED", lockedAt: current.lockedAt, source: current.sourceType,
    longTermBackground: longTerm?.archiveSummary ?? longTerm?.summary ?? null,
  };
}

export function buildMemberFocusDossier(input: {
  assetId: string;
  asOfDate: string;
  nowMs: number;
  weekly: null | {
    id: string; weekStart: string; weekEnd: string; overallDirection: string; headline: string;
    weeklyPath: string; keySupport: string[]; keyResistance: string[]; confirmation?: string;
    invalidation: string; publishedAt: string; status: string; publicSourceLabel: string;
  };
  daily: ReadonlyArray<null | {
    forecastDate: string; direction: string; headline: string; confirmation?: string;
    invalidation: string; status: string; publishedAt: string;
  }>;
}): FocusDossierView {
  const weekly = input.weekly;
  const publishedAt = weekly ? Date.parse(weekly.publishedAt) : Number.NaN;
  if (!weekly || weekly.status !== "published" || !Number.isFinite(publishedAt) || publishedAt > input.nowMs ||
      weekly.weekStart > input.asOfDate || weekly.weekEnd < input.asOfDate) {
    return buildFocusDossier({ assetId: input.assetId, forecasts: [], asOfDate: input.asOfDate, nowMs: input.nowMs });
  }
  const validDaily = new Map(input.daily.filter((item) => item && item.status === "published" && Date.parse(item.publishedAt) <= input.nowMs).map((item) => [item!.forecastDate, item!]));
  const dates = dateRange(weekly.weekStart, weekly.weekEnd);
  const dailyPath: FocusDossierDay[] = dates.map((date) => {
    const day = validDaily.get(date);
    return day
      ? { date, state: date === input.asOfDate ? "TODAY" : "PENDING", direction: day.direction, summary: day.headline, confirmation: day.confirmation ?? null, invalidation: day.invalidation }
      : { date, state: "MISSING", direction: null, summary: "该日正式资料待更新，不生成占位预测。", confirmation: null, invalidation: null };
  });
  return {
    executionAuthority: "RESEARCH_ONLY", tradingEligible: false,
    assetId: input.assetId, asOfDate: input.asOfDate, evidenceStatus: "INCOMPLETE",
    statusLabel: "本周结论已发布；统一锁定与7日资料待补齐", conclusion: `${weekly.overallDirection}｜${weekly.headline}`,
    periodStart: weekly.weekStart, periodEnd: weekly.weekEnd, dailyPath, supportLevels: weekly.keySupport,
    resistanceLevels: weekly.keyResistance, confirmation: weekly.confirmation ?? null, invalidation: weekly.invalidation,
    occurred: [], pendingVerification: dailyPath.map((day) => `${day.date} ${day.summary}`), nextWeek: null,
    version: null, publicationStatus: "PUBLISHED", lockStatus: "LOCK_NOT_PROVIDED", lockedAt: null, source: weekly.publicSourceLabel, longTermBackground: weekly.weeklyPath,
  };
}
