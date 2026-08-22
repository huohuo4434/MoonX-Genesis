/**
 * MOOX V7.20.2 — Focus/watchlist multi-horizon dual-method comparison.
 *
 * Liuyao remains the immutable source research. Qimen is generated independently
 * for the same day or period and is displayed next to Liuyao. Neither method is
 * allowed to overwrite the other. Historical Qimen backfills are explicitly
 * excluded from hit-rate statistics.
 */
import type { ConvictionPeriodForecast, ConvictionForecastType } from "@/lib/data/conviction/asteroid-forecasts";
import {
  MOOX_FOCUS_QIMEN_ACCURACY_BASELINE,
  buildFocusQimenParallelReading,
  buildFocusQimenParallelReadingWithOptions,
  getFocusQimenUseGodDefinition,
  type FocusQimenParallelReading,
  type FocusQimenRelation,
  type FocusQimenUseGodBasis,
  type FocusQimenValidationStatus,
} from "@/lib/forecasts/focus-qimen-parallel";

const DAY_MS = 86_400_000;
const MAX_DAILY_ROWS = 7;

export const MOOX_FOCUS_QIMEN_MULTI_HORIZON_VERSION = "FOCUS_QIMEN_MULTI_HORIZON_V1_20260818";

export type FocusDualMethodDailyRow = {
  date: string;
  state: "OCCURRED" | "TODAY" | "PENDING" | "MISSING";
  liuyaoDirection: string | null;
  liuyaoSummary: string;
  rhythmDirection: string | null;
  rhythmSummary: string | null;
  qimen: FocusQimenParallelReading;
  relation: FocusQimenRelation;
  relationLabel: string;
};

export type FocusQimenHorizonReading = {
  policyVersion: string;
  protocol: "PARALLEL_METHOD_NO_OVERRIDE";
  forecastId: string;
  forecastType: ConvictionForecastType;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  methodLabel: "时家奇门·周期起局" | "奇门证据不足";
  liuyaoDirection: string;
  liuyaoSummary: string;
  qimenDirection: string;
  qimenDirectionCode: FocusQimenParallelReading["directionCode"];
  qimenConfidence: number | null;
  qimenScore: number | null;
  qimenSummary: string;
  qimenMysticNote: string;
  relation: FocusQimenRelation;
  relationLabel: string;
  castAt: string;
  chartSummary: string;
  useGod: string;
  useGodBasis: FocusQimenUseGodBasis;
  useGodBasisLabel: string;
  useGodNote: string;
  validationStatus: FocusQimenValidationStatus;
  verificationEligible: boolean;
  verificationKey: string;
  retroactiveNotice: string | null;
  evidence: string;
};

export type FocusMethodVerificationStats = {
  daily: {
    total: number;
    resonance: number;
    divergence: number;
    liuyaoMissing: number;
    forwardPending: number;
    retroactiveExcluded: number;
    notEligible: number;
  };
  horizons: {
    total: number;
    resonance: number;
    divergence: number;
    liuyaoMissing: number;
    forwardPending: number;
    retroactiveExcluded: number;
    notEligible: number;
  };
  liuyaoVerified: {
    samples: number;
    hits: number;
    misses: number;
    partial: number;
    void: number;
  };
  qimenVerified: {
    samples: number;
    hits: number;
    misses: number;
    partial: number;
    void: number;
  };
  note: string;
};

export type FocusQimenParallelView = {
  policyVersion: string;
  protocol: "PARALLEL_METHOD_NO_OVERRIDE";
  title: string;
  notice: string;
  sourceBoundary: string;
  useGod: {
    displayName: string;
    label: string;
    primary: string[];
    secondary: string[];
    basis: FocusQimenUseGodBasis;
    basisLabel: string;
    note: string;
  };
  dailyRows: FocusDualMethodDailyRow[];
  horizonRows: FocusQimenHorizonReading[];
  stats: FocusMethodVerificationStats;
};

export type FocusQimenDailyPathInput = {
  date: string;
  state: "OCCURRED" | "TODAY" | "PENDING" | "MISSING";
  direction: string | null;
  summary: string;
  rhythmDirection?: string | null;
  rhythmSummary?: string | null;
};

export type FocusQimenAuditInput = {
  forecastDate: string;
  validationStatus: string | null;
  qimenEvidence?: string | null;
};

function parseDate(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== value) return null;
  return parsed;
}

function addDays(value: string, days: number): string {
  const parsed = parseDate(value);
  if (parsed == null) throw new Error(`Invalid focus Qimen date: ${value}`);
  return new Date(parsed + days * DAY_MS).toISOString().slice(0, 10);
}

function dateRange(start: string | null | undefined, end: string | null | undefined, maximum = MAX_DAILY_ROWS): string[] {
  if (!start || !end) return [];
  const first = parseDate(start);
  const last = parseDate(end);
  if (first == null || last == null || first > last) return [];
  const count = Math.min(maximum, Math.floor((last - first) / DAY_MS) + 1);
  return Array.from({ length: count }, (_, index) => new Date(first + index * DAY_MS).toISOString().slice(0, 10));
}

function firstWeekday(start: string, end: string): string | null {
  const first = parseDate(start);
  const last = parseDate(end);
  if (first == null || last == null || first > last) return null;
  for (let cursor = first; cursor <= last; cursor += DAY_MS) {
    const weekday = new Date(cursor).getUTCDay();
    if (weekday !== 0 && weekday !== 6) return new Date(cursor).toISOString().slice(0, 10);
  }
  return null;
}

function formalForecast(forecast: ConvictionPeriodForecast, nowMs: number): boolean {
  const publishedAt = Date.parse(forecast.publishedAt);
  const lockedAt = Date.parse(forecast.lockedAt);
  return forecast.status === "published" && Number.isFinite(publishedAt) && Number.isFinite(lockedAt) && publishedAt <= nowMs && lockedAt <= nowMs;
}

function latestFormalPeriods(forecasts: readonly ConvictionPeriodForecast[], nowMs: number): ConvictionPeriodForecast[] {
  const byPeriod = new Map<string, ConvictionPeriodForecast>();
  for (const forecast of forecasts) {
    if (!formalForecast(forecast, nowMs)) continue;
    if (forecast.forecastType === "TODAY" || forecast.forecastType === "TOMORROW") continue;
    const key = `${forecast.forecastType}|${forecast.periodStart}|${forecast.periodEnd}`;
    const current = byPeriod.get(key);
    if (!current || forecast.version > current.version || (forecast.version === current.version && forecast.publishedAt > current.publishedAt)) {
      byPeriod.set(key, forecast);
    }
  }
  return [...byPeriod.values()].sort((left, right) => {
    const typeOrder = PERIOD_ORDER[left.forecastType] - PERIOD_ORDER[right.forecastType];
    return typeOrder || left.periodStart.localeCompare(right.periodStart) || left.periodEnd.localeCompare(right.periodEnd) || right.version - left.version;
  });
}

const PERIOD_ORDER: Readonly<Record<ConvictionForecastType, number>> = Object.freeze({
  TODAY: 0,
  TOMORROW: 1,
  WEEK: 2,
  WEEK_2: 3,
  WEEK_3: 4,
  WEEK_4: 5,
  MONTH_1: 6,
  MONTH_3: 7,
  YEAR_1: 8,
  YEAR_3: 9,
  YEAR_5: 10,
  YEAR_10: 11,
});

export function focusQimenUseGodBasisLabel(basis: FocusQimenUseGodBasis): string {
  if (basis === "TEACHER_EXPLICIT") return "老师明确案例";
  if (basis === "TEACHER_CASE") return "老师案例推导";
  if (basis === "MOOX_INDUSTRY_OVERLAY") return "MOOX行业对象映射";
  return "通用日时干协议";
}

function relationCount<T extends { relation: FocusQimenRelation }>(rows: readonly T[], relation: FocusQimenRelation): number {
  return rows.filter((row) => row.relation === relation).length;
}

function statusCount<T extends { validationStatus: FocusQimenValidationStatus }>(rows: readonly T[], status: FocusQimenValidationStatus): number {
  return rows.filter((row) => row.validationStatus === status).length;
}

function normalizeVerificationStatus(value: string | null | undefined): "HIT" | "MISS" | "PARTIAL" | "VOID" | null {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (["HIT", "FULL_HIT"].includes(normalized)) return "HIT";
  if (["MISS"].includes(normalized)) return "MISS";
  if (["PARTIAL", "PARTIAL_HIT"].includes(normalized)) return "PARTIAL";
  if (["VOID", "UNVERIFIABLE", "NOT_ELIGIBLE"].includes(normalized)) return "VOID";
  return null;
}

function qimenResultFromEvidence(value: string | null | undefined): "HIT" | "MISS" | "PARTIAL" | "VOID" | null {
  const match = value?.match(/FOCUS_QIMEN_RESULT=(HIT|MISS|PARTIAL|PARTIAL_HIT|VOID|UNVERIFIABLE|NOT_ELIGIBLE)/i)?.[1];
  return normalizeVerificationStatus(match ?? null);
}

function methodTally(values: readonly ("HIT" | "MISS" | "PARTIAL" | "VOID" | null)[]) {
  const rows = values.filter((value): value is "HIT" | "MISS" | "PARTIAL" | "VOID" => value != null);
  return {
    samples: rows.filter((value) => value !== "VOID").length,
    hits: rows.filter((value) => value === "HIT").length,
    misses: rows.filter((value) => value === "MISS").length,
    partial: rows.filter((value) => value === "PARTIAL").length,
    void: rows.filter((value) => value === "VOID").length,
  };
}

function periodValidation(forecast: ConvictionPeriodForecast, anchorDate: string | null): { status: FocusQimenValidationStatus; eligible: boolean; castDate: string } {
  if (!anchorDate) return { status: "NOT_ELIGIBLE", eligible: false, castDate: MOOX_FOCUS_QIMEN_ACCURACY_BASELINE };
  if (forecast.periodStart <= MOOX_FOCUS_QIMEN_ACCURACY_BASELINE) {
    return { status: "RETROACTIVE_BASELINE", eligible: false, castDate: MOOX_FOCUS_QIMEN_ACCURACY_BASELINE };
  }
  return { status: "PENDING", eligible: true, castDate: anchorDate };
}

export function buildFocusQimenHorizonReading(input: {
  assetId: string;
  symbol?: string | null;
  forecast: ConvictionPeriodForecast;
}): FocusQimenHorizonReading {
  const definition = getFocusQimenUseGodDefinition(input.assetId, input.symbol);
  const anchorDate = definition.assetClass === "EQUITY"
    ? firstWeekday(input.forecast.periodStart, input.forecast.periodEnd)
    : input.forecast.periodStart;
  const validation = periodValidation(input.forecast, anchorDate);
  const periodLabel = `${input.forecast.periodStart}至${input.forecast.periodEnd}`;
  const verificationKey = `focus-qimen-period:${MOOX_FOCUS_QIMEN_MULTI_HORIZON_VERSION}:${input.assetId}:${input.forecast.id}:v${input.forecast.version}`;
  const reading = buildFocusQimenParallelReadingWithOptions({
    assetId: input.assetId,
    symbol: input.symbol,
    forecastDate: validation.castDate,
    liuyaoDirection: input.forecast.direction,
  }, {
    castSalt: `PERIOD|${input.assetId}|${input.forecast.forecastType}|${input.forecast.periodStart}|${input.forecast.periodEnd}|${input.forecast.id}|V${input.forecast.version}`,
    forceComparable: true,
    validationStatus: validation.status,
    verificationEligible: validation.eligible,
    verificationKey,
    contextLabel: `时家奇门·周期起局：${periodLabel}`,
  });
  return {
    policyVersion: MOOX_FOCUS_QIMEN_MULTI_HORIZON_VERSION,
    protocol: "PARALLEL_METHOD_NO_OVERRIDE",
    forecastId: input.forecast.id,
    forecastType: input.forecast.forecastType,
    periodLabel,
    periodStart: input.forecast.periodStart,
    periodEnd: input.forecast.periodEnd,
    methodLabel: reading.available ? "时家奇门·周期起局" : "奇门证据不足",
    liuyaoDirection: input.forecast.direction,
    liuyaoSummary: input.forecast.summary,
    qimenDirection: reading.direction,
    qimenDirectionCode: reading.directionCode,
    qimenConfidence: reading.confidence,
    qimenScore: reading.score,
    qimenSummary: reading.summary,
    qimenMysticNote: reading.mysticNote,
    relation: reading.relation,
    relationLabel: reading.relationLabel,
    castAt: reading.castAt,
    chartSummary: reading.chartSummary,
    useGod: reading.useGod,
    useGodBasis: reading.useGodBasis,
    useGodBasisLabel: focusQimenUseGodBasisLabel(reading.useGodBasis),
    useGodNote: reading.useGodNote,
    validationStatus: reading.validationStatus,
    verificationEligible: reading.verificationEligible,
    verificationKey,
    retroactiveNotice: validation.status === "RETROACTIVE_BASELINE"
      ? `该六爻周期已在${MOOX_FOCUS_QIMEN_ACCURACY_BASELINE}前开始；本条是历史补盘基线，不计奇门命中率。`
      : null,
    evidence: reading.available
      ? `${reading.evidence}；周期方法=时家奇门周期起局，不冒充月家/年家奇门`
      : reading.evidence,
  };
}

function buildDailyRows(input: {
  assetId: string;
  symbol?: string | null;
  dailyPath: readonly FocusQimenDailyPathInput[];
  periodStart?: string | null;
  periodEnd?: string | null;
}): FocusDualMethodDailyRow[] {
  const definition = getFocusQimenUseGodDefinition(input.assetId, input.symbol);
  const byDate = new Map(input.dailyPath.map((day) => [day.date, day]));
  const periodDates = dateRange(input.periodStart, input.periodEnd);
  const sourceDates = [...new Set(input.dailyPath.map((day) => day.date))].sort().slice(0, MAX_DAILY_ROWS);
  const dates = periodDates.length ? periodDates : sourceDates;
  return dates.map((date) => {
    const equityWeekend = definition.assetClass === "EQUITY" && [0, 6].includes(new Date(`${date}T00:00:00.000Z`).getUTCDay());
    const source = byDate.get(date) ?? {
      date,
      state: "MISSING" as const,
      direction: null,
      summary: equityWeekend
        ? "交易所休市：六爻不生成正式日走势；奇门只保留气机观察且不计验证。"
        : "日分析生成异常，请查看研究完整性自检。",
    };
    const qimen = buildFocusQimenParallelReading({
      assetId: input.assetId,
      symbol: input.symbol,
      forecastDate: date,
      liuyaoDirection: source.direction,
    });
    return {
      date,
      state: source.state,
      liuyaoDirection: source.direction,
      liuyaoSummary: source.summary,
      rhythmDirection: source.rhythmDirection ?? source.direction,
      rhythmSummary: source.rhythmSummary ?? source.summary,
      qimen,
      relation: qimen.relation,
      relationLabel: qimen.relationLabel,
    };
  });
}

function buildStats(input: {
  dailyRows: readonly FocusDualMethodDailyRow[];
  horizonRows: readonly FocusQimenHorizonReading[];
  auditRows: readonly FocusQimenAuditInput[];
}): FocusMethodVerificationStats {
  const dailyReadings = input.dailyRows.map((row) => row.qimen);
  return {
    daily: {
      total: input.dailyRows.length,
      resonance: relationCount(input.dailyRows, "RESONANCE"),
      divergence: relationCount(input.dailyRows, "DIVERGENCE"),
      liuyaoMissing: relationCount(input.dailyRows, "LIUYAO_MISSING"),
      forwardPending: statusCount(dailyReadings, "PENDING"),
      retroactiveExcluded: statusCount(dailyReadings, "RETROACTIVE_BASELINE"),
      notEligible: statusCount(dailyReadings, "NOT_ELIGIBLE") + statusCount(dailyReadings, "UNAVAILABLE"),
    },
    horizons: {
      total: input.horizonRows.length,
      resonance: relationCount(input.horizonRows, "RESONANCE"),
      divergence: relationCount(input.horizonRows, "DIVERGENCE"),
      liuyaoMissing: relationCount(input.horizonRows, "LIUYAO_MISSING"),
      forwardPending: statusCount(input.horizonRows, "PENDING"),
      retroactiveExcluded: statusCount(input.horizonRows, "RETROACTIVE_BASELINE"),
      notEligible: statusCount(input.horizonRows, "NOT_ELIGIBLE") + statusCount(input.horizonRows, "UNAVAILABLE"),
    },
    liuyaoVerified: methodTally(input.auditRows.map((row) => normalizeVerificationStatus(row.validationStatus))),
    qimenVerified: methodTally(input.auditRows.map((row) => qimenResultFromEvidence(row.qimenEvidence))),
    note: `准确率从${MOOX_FOCUS_QIMEN_ACCURACY_BASELINE}后的前置发布样本开始。历史补盘、休市、不可验证样本均排除；六爻与奇门分别计分。`,
  };
}

export function buildFocusQimenParallelView(input: {
  assetId: string;
  symbol?: string | null;
  asOfDate: string;
  nowMs: number;
  dailyPath: readonly FocusQimenDailyPathInput[];
  periodStart?: string | null;
  periodEnd?: string | null;
  forecasts: readonly ConvictionPeriodForecast[];
  auditRows?: readonly FocusQimenAuditInput[];
}): FocusQimenParallelView {
  const definition = getFocusQimenUseGodDefinition(input.assetId, input.symbol);
  const dailyRows = buildDailyRows({
    assetId: input.assetId,
    symbol: input.symbol,
    dailyPath: input.dailyPath,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
  });
  const horizonRows = latestFormalPeriods(input.forecasts, input.nowMs).map((forecast) =>
    buildFocusQimenHorizonReading({ assetId: input.assetId, symbol: input.symbol, forecast })
  );
  const stats = buildStats({ dailyRows, horizonRows, auditRows: input.auditRows ?? [] });
  return {
    policyVersion: MOOX_FOCUS_QIMEN_MULTI_HORIZON_VERSION,
    protocol: "PARALLEL_METHOD_NO_OVERRIDE",
    title: "六爻 × 奇门",
    notice: definition.basis === "GENERIC_TIME_STEM"
      ? "六爻为原始周期卦；奇门因固定用神依据不足暂不生成方向。"
      : "每日并列两个观点；当前节奏随最新行情更新。",
    sourceBoundary: definition.basis === "GENERIC_TIME_STEM"
      ? "没有固定用神依据或可追溯案例时，奇门失败关闭，不起局、不判断同向或分歧。"
      : `老师资料支持按目标日/周/月等明确周期起局并复盘，但未提供可直接编程复现的通用月家或年家金融断法；因此周、月、年等均标注为“时家奇门·周期起局”。${definition.basis === "MOOX_INDUSTRY_OVERLAY" ? "当前产品用神属于透明行业对象映射，不冒充老师固定口诀。" : ""}`,
    useGod: {
      displayName: definition.displayName,
      label: definition.label,
      primary: [...definition.primary],
      secondary: [...definition.secondary],
      basis: definition.basis,
      basisLabel: focusQimenUseGodBasisLabel(definition.basis),
      note: definition.note,
    },
    dailyRows,
    horizonRows,
    stats,
  };
}

export function nextFocusQimenDate(asOfDate: string, offset: number): string {
  return addDays(asOfDate, offset);
}
