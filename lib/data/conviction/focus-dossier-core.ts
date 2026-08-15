import type { ConvictionPeriodForecast } from "@/lib/data/conviction/asteroid-forecasts";
import type {
  FocusDossierDay,
  FocusDossierView,
  FocusSupplementalEvidence,
  FocusWeekPreparation,
} from "@/types/focus-dossier";
import type { GeneratedDailyForecastRecord } from "@/lib/weekly-source/types";

const DAY_MS = 86_400_000;
const MAX_DISPLAY_PERIOD_DAYS = 62;

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

export function focusDossierPeriodDates(start: string, end: string): string[] {
  const first = parseDateKey(start);
  const last = parseDateKey(end);
  if (first == null || last == null || first > last || last - first > (MAX_DISPLAY_PERIOD_DAYS - 1) * DAY_MS) return [];
  const dates: string[] = [];
  for (let cursor = first; cursor <= last; cursor += DAY_MS) {
    dates.push(new Date(cursor).toISOString().slice(0, 10));
  }
  return dates;
}

export async function loadFocusDossierGeneratedDailies(input: {
  dossier: Pick<FocusDossierView, "periodStart" | "periodEnd">;
  marketCode: string;
  read: (marketCode: string, dates: string[]) => Promise<GeneratedDailyForecastRecord[]>;
}): Promise<GeneratedDailyForecastRecord[]> {
  if (!input.dossier.periodStart || !input.dossier.periodEnd) return [];
  const dates = focusDossierPeriodDates(input.dossier.periodStart, input.dossier.periodEnd);
  if (!dates.length) return [];
  return input.read(input.marketCode, dates);
}

export async function loadFocusDossierDailyAudit(input: {
  accessMode: "publicOnly" | "deviceRequired" | "fullAccess";
  dossier: Pick<FocusDossierView, "periodStart" | "periodEnd">;
  marketCode: string;
  sourceWeeklyForecastId: string;
  read: (query: {
    marketCode: string; sourceWeeklyForecastId: string; periodStart: string; periodEnd: string; readOnly: true;
  }) => Promise<GeneratedDailyForecastRecord[]>;
}): Promise<GeneratedDailyForecastRecord[]> {
  if (input.accessMode !== "fullAccess" || !input.dossier.periodStart || !input.dossier.periodEnd) return [];
  if (!focusDossierPeriodDates(input.dossier.periodStart, input.dossier.periodEnd).length) return [];
  return input.read({
    marketCode: input.marketCode,
    sourceWeeklyForecastId: input.sourceWeeklyForecastId,
    periodStart: input.dossier.periodStart,
    periodEnd: input.dossier.periodEnd,
    readOnly: true,
  });
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

function hasCompleteDailyCoverage(forecast: ConvictionPeriodForecast): boolean {
  const requiredDates = focusDossierPeriodDates(forecast.periodStart, forecast.periodEnd);
  if (!requiredDates.length) return false;
  const suppliedDates = new Set((forecast.dailyPath ?? []).map((day) => day.date));
  return requiredDates.every((date) => suppliedDates.has(date));
}

function sourceDayToView(
  date: string,
  asOfDate: string,
  sourceDays: Map<string, NonNullable<ConvictionPeriodForecast["dailyPath"]>[number]>,
): FocusDossierDay {
  const day = sourceDays.get(date);
  if (!day) {
    return {
      date,
      state: "MISSING",
      direction: null,
      summary: "该日正式证据待更新；不生成占位预测。",
      confirmation: null,
      invalidation: null,
    };
  }
  const state: FocusDossierDay["state"] = day.status === "已验证"
    ? "OCCURRED"
    : date === asOfDate ? "TODAY" : "PENDING";
  return {
    date,
    state,
    direction: day.direction,
    summary: day.summary,
    confirmation: day.confirmation ?? null,
    invalidation: day.riskNote ?? null,
  };
}

function nextForecastView(forecast: ConvictionPeriodForecast | null, asOfDate: string) {
  if (!forecast) return null;
  const sourceDays = new Map((forecast.dailyPath ?? []).map((day) => [day.date, day]));
  return {
    periodStart: forecast.periodStart,
    periodEnd: forecast.periodEnd,
    conclusion: forecast.summary,
    dailyEvidenceReady: hasCompleteDailyCoverage(forecast),
    dailyPath: focusDossierPeriodDates(forecast.periodStart, forecast.periodEnd).map((date) => sourceDayToView(date, asOfDate, sourceDays)),
    supportLevels: [...forecast.supportLevels],
    resistanceLevels: [...forecast.resistanceLevels],
    confirmation: forecast.confirmationLevel ?? null,
    invalidation: forecast.invalidationLevel ?? null,
    version: forecast.version,
    source: forecast.sourceType,
    lockedAt: forecast.lockedAt,
  };
}

function emptyDossier(input: {
  assetId: string;
  asOfDate: string;
  next: ConvictionPeriodForecast | null;
  monthly: ConvictionPeriodForecast | null;
  longTerm: ConvictionPeriodForecast | null;
  supplementalEvidence: readonly FocusSupplementalEvidence[];
}): FocusDossierView {
  const nextWeek = nextForecastView(input.next, input.asOfDate);
  const nextReady = Boolean(nextWeek?.dailyEvidenceReady);
  const monthlyEvidence = input.monthly ? {
    periodStart: input.monthly.periodStart,
    periodEnd: input.monthly.periodEnd,
    conclusion: input.monthly.summary,
    version: input.monthly.version,
    source: input.monthly.sourceType,
    lockedAt: input.monthly.lockedAt,
  } : null;
  return {
    executionAuthority: "RESEARCH_ONLY",
    tradingEligible: false,
    assetId: input.assetId,
    asOfDate: input.asOfDate,
    evidenceStatus: nextReady || monthlyEvidence ? "INCOMPLETE" : "MISSING",
    statusLabel: nextReady
      ? "本期周资料缺失或已结束；下周逐日证据已准备"
      : monthlyEvidence
        ? "月度结论已发布；周证据缺失；日证据缺失"
        : "本期正式周资料待更新",
    conclusion: null,
    periodStart: null,
    periodEnd: null,
    dailyPath: [],
    dailyAuditRows: [],
    supportLevels: [],
    resistanceLevels: [],
    confirmation: null,
    invalidation: null,
    occurred: [],
    pendingVerification: [],
    nextWeek,
    displayScope: nextReady ? "NEXT_PERIOD_READY" : monthlyEvidence ? "MONTH_ONLY" : "MISSING",
    weeklyEvidenceStatus: "MISSING",
    dailyEvidenceStatus: "MISSING",
    monthlyEvidence,
    supplementalEvidence: [...input.supplementalEvidence],
    version: null,
    publicationStatus: "MISSING",
    lockStatus: "MISSING",
    lockedAt: null,
    source: null,
    longTermBackground: input.longTerm?.archiveSummary ?? input.longTerm?.summary ?? null,
  };
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
    return { assetId: input.assetId, targetStart: target.start, targetEnd: target.end, status: "AWAITING_FORMAL_EVIDENCE", forecastId: null, missingDates: focusDossierPeriodDates(target.start, target.end) };
  }
  const present = new Set((forecast.dailyPath ?? []).map((day) => day.date));
  const missingDates = focusDossierPeriodDates(target.start, target.end).filter((date) => !present.has(date));
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
  generatedDailyAudit?: readonly GeneratedDailyForecastRecord[];
  supplementalEvidence?: readonly FocusSupplementalEvidence[];
}): FocusDossierView {
  const weekly = weeklyForecasts(input.forecasts, input.nowMs);
  const current = latest(weekly.filter((item) => item.periodStart <= input.asOfDate && item.periodEnd >= input.asOfDate));
  const nextWindow = nextMondayWindow(input.asOfDate);
  const next = latest(weekly.filter((item) => item.periodStart === nextWindow.start && item.periodEnd === nextWindow.end));
  const monthly = latest(input.forecasts.filter((item) =>
    item.forecastType === "MONTH_1" && isFormal(item, input.nowMs) &&
    item.periodStart <= input.asOfDate && item.periodEnd >= input.asOfDate
  ));
  const longTerm = latest(input.forecasts.filter((item) => item.forecastType === "YEAR_1" && isFormal(item, input.nowMs)));
  const supplementalEvidence = input.supplementalEvidence ?? [];
  if (!current) {
    return emptyDossier({ assetId: input.assetId, asOfDate: input.asOfDate, next, monthly, longTerm, supplementalEvidence });
  }

  const sourceDays = new Map((current.dailyPath ?? []).map((day) => [day.date, day]));
  const generatedDays = new Map((input.generatedDailies ?? []).filter((day) => {
    const publishedAt = day.publishedAt ? Date.parse(day.publishedAt) : Number.NaN;
    return day.sourceWeeklyForecastId === current.id && ["PUBLISHED", "LOCKED"].includes(day.status) &&
      Number.isFinite(publishedAt) && publishedAt <= input.nowMs;
  }).sort((a, b) => a.forecastDate.localeCompare(b.forecastDate) || a.version - b.version).map((day) => [day.forecastDate, day]));
  const requiredDates = focusDossierPeriodDates(current.periodStart, current.periodEnd);
  const dailyPath: FocusDossierDay[] = requiredDates.map((date) => {
    const sourceDay = sourceDays.get(date);
    const generated = sourceDay?.status === "已验证" ? null : generatedDays.get(date);
    if (generated) {
      const sourceKind = generated.liuyaoEvidence?.match(/FOCUS_SOURCE_KIND=(TEACHER_DAILY|MOOX_WEEK_DERIVED|MOOX_ROLLING_REVISION)/)?.[1] as FocusDossierDay["sourceKind"];
      const generatedAsOf = generated.liuyaoEvidence?.match(/AS_OF=(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
      return {
        date,
        state: date === input.asOfDate ? "TODAY" : "PENDING",
        direction: generated.direction === "NEUTRAL" ? "观察" : generated.direction,
        summary: generated.expectedPath,
        confirmation: generated.confirmationLevel,
        invalidation: generated.invalidationLevel,
        sourceKind: sourceKind ?? null,
        version: generated.version,
        asOfDate: generatedAsOf,
        rollingReason: generated.revisionReason,
      };
    }
    return sourceDayToView(date, input.asOfDate, sourceDays);
  });
  const complete = requiredDates.length > 0 && dailyPath.every((day) => day.state !== "MISSING");
  const dailyAuditRows = (input.generatedDailyAudit ?? []).map((row) => ({
    forecastDate: row.forecastDate,
    version: row.version,
    direction: row.direction,
    path: row.expectedPath,
    validationStatus: row.validationStatus,
    publishedAt: row.publishedAt,
    previousVersionId: row.previousVersionId,
    sourceKind: (row.liuyaoEvidence?.match(/FOCUS_SOURCE_KIND=(TEACHER_DAILY|MOOX_WEEK_DERIVED|MOOX_ROLLING_REVISION)/)?.[1] ?? null) as FocusDossierView["dailyAuditRows"][number]["sourceKind"],
    revisionReason: row.revisionReason,
  }));
  const nextWeek = nextForecastView(next, input.asOfDate);
  const asOfMs = parseDateKey(input.asOfDate);
  const weekend = asOfMs != null && [0, 6].includes(new Date(asOfMs).getUTCDay());
  const highlightPreparedNext = Boolean(weekend && nextWeek?.dailyEvidenceReady);
  return {
    executionAuthority: "RESEARCH_ONLY",
    tradingEligible: false,
    assetId: input.assetId,
    asOfDate: input.asOfDate,
    evidenceStatus: complete ? "READY" : "INCOMPLETE",
    statusLabel: highlightPreparedNext
      ? "本期资料仍保留；下周逐日证据已准备"
      : complete
        ? generatedDays.size > 0 ? "本期结论已锁定；逐日研究已发布" : "本期资料完整并已锁定"
      : "本期结论已锁定；逐日资料待补齐",
    conclusion: current.summary,
    periodStart: current.periodStart,
    periodEnd: current.periodEnd,
    dailyPath,
    dailyAuditRows,
    supportLevels: current.supportLevels,
    resistanceLevels: current.resistanceLevels,
    confirmation: current.confirmationLevel ?? null,
    invalidation: current.invalidationLevel ?? null,
    occurred: dailyPath.filter((day) => day.state === "OCCURRED").map((day) => `${day.date} ${day.summary}`),
    pendingVerification: dailyPath.filter((day) => day.state !== "OCCURRED").map((day) => `${day.date} ${day.summary}`),
    nextWeek,
    displayScope: highlightPreparedNext ? "NEXT_PERIOD_READY" : "CURRENT_PERIOD",
    weeklyEvidenceStatus: "READY",
    dailyEvidenceStatus: complete ? "READY" : "INCOMPLETE",
    monthlyEvidence: monthly ? {
      periodStart: monthly.periodStart,
      periodEnd: monthly.periodEnd,
      conclusion: monthly.summary,
      version: monthly.version,
      source: monthly.sourceType,
      lockedAt: monthly.lockedAt,
    } : null,
    supplementalEvidence: [...supplementalEvidence],
    version: current.version,
    publicationStatus: "PUBLISHED",
    lockStatus: "LOCKED",
    lockedAt: current.lockedAt,
    source: current.sourceType,
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
  const dates = focusDossierPeriodDates(weekly.weekStart, weekly.weekEnd);
  const dailyPath: FocusDossierDay[] = dates.map((date) => {
    const day = validDaily.get(date);
    return day
      ? { date, state: date === input.asOfDate ? "TODAY" : "PENDING", direction: day.direction, summary: day.headline, confirmation: day.confirmation ?? null, invalidation: day.invalidation }
      : { date, state: "MISSING", direction: null, summary: "该日正式资料待更新；不生成占位预测。", confirmation: null, invalidation: null };
  });
  const complete = dates.length > 0 && dailyPath.every((day) => day.state !== "MISSING");
  return {
    executionAuthority: "RESEARCH_ONLY",
    tradingEligible: false,
    assetId: input.assetId,
    asOfDate: input.asOfDate,
    evidenceStatus: complete ? "READY" : "INCOMPLETE",
    statusLabel: complete ? "本期结论与逐日资料已发布" : "本期结论已发布；逐日资料待补齐",
    conclusion: `${weekly.overallDirection}｜${weekly.headline}`,
    periodStart: weekly.weekStart,
    periodEnd: weekly.weekEnd,
    dailyPath,
    dailyAuditRows: [],
    supportLevels: weekly.keySupport,
    resistanceLevels: weekly.keyResistance,
    confirmation: weekly.confirmation ?? null,
    invalidation: weekly.invalidation,
    occurred: [],
    pendingVerification: dailyPath.map((day) => `${day.date} ${day.summary}`),
    nextWeek: null,
    displayScope: "CURRENT_PERIOD",
    weeklyEvidenceStatus: "READY",
    dailyEvidenceStatus: complete ? "READY" : "INCOMPLETE",
    monthlyEvidence: null,
    supplementalEvidence: [],
    version: null,
    publicationStatus: "PUBLISHED",
    lockStatus: "LOCK_NOT_PROVIDED",
    lockedAt: null,
    source: weekly.publicSourceLabel,
    longTermBackground: weekly.weeklyPath,
  };
}
