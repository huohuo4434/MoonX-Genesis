import type { WeeklyForecastSourceRecord } from "@/lib/weekly-source/types";

export type PredictionSourceAuthority =
  | "TEACHER_ORIGINAL"
  | "USER_HEXAGRAM_TEACHER_METHOD"
  | "PERIOD_PATH_DERIVATION";

export const PREDICTION_SOURCE_PRIORITY: Readonly<Record<PredictionSourceAuthority, number>> = Object.freeze({
  TEACHER_ORIGINAL: 1,
  USER_HEXAGRAM_TEACHER_METHOD: 2,
  PERIOD_PATH_DERIVATION: 3,
});

export const LIUYAO_QIMEN_PARALLEL_POLICY = Object.freeze({
  methods: ["LIUYAO", "QIMEN"] as const,
  agreement: "RAISE_CONFIDENCE",
  disagreement: "SHOW_BOTH_AND_LOWER_CONFIDENCE",
  missingEvidence: "DO_NOT_FABRICATE",
});

export { CONDITIONAL_LIUYAO_AUTHORITY_POLICY } from "@/lib/forecasts/conditional-liuyao-authority";

export const TEACHER_COURSE_COVERAGE_20260821 = Object.freeze([
  { code: "BINGWU-BTC-SHEN-2026", asset: "BTC", horizon: "2026-08-07/2026-09-06", siteUse: "OFFICIAL_STAGE_DIRECTION" },
  { code: "BINGWU-MULTI-HALF-MONTH-20260819", asset: "BTC/GLD/NDX/WTI", horizon: "2026-08-19/2026-09-02", siteUse: "ASSET_SPECIFIC_ONLY_WHEN_DIRECTION_WAS_EXPLICIT" },
  { code: "BINGWU-BTC-12Y", asset: "BTC", horizon: "2026/2037", siteUse: "LONG_HORIZON_CONTEXT" },
  { code: "BINGWU-GOOGL-6M", asset: "GOOGL", horizon: "6M", siteUse: "FOCUS_ASSET_CONTEXT" },
  { code: "BINGWU-WTI-SHEN", asset: "WTI", horizon: "2026-08-07/2026-09-06", siteUse: "SOURCE_ARCHIVE_NO_DIRECTION_INVENTION" },
  { code: "BINGWU-SHCOMP-4500-6M", asset: "SHCOMP", horizon: "2026-08-07/2026-10-06", siteUse: "OFFICIAL_STAGE_DIRECTION" },
  { code: "BINGWU-NDX-HISTORIC-DROP", asset: "NDX", horizon: "2026/2035", siteUse: "LONG_HORIZON_RISK_CONTEXT" },
  { code: "BINGWU-SPCX-6M", asset: "SPCX", horizon: "6M", siteUse: "FOCUS_ASSET_CONTEXT" },
] as const);

const LOCKED_AT = "2026-08-21T12:44:00.000Z";

const TEACHER_STAGE_SOURCES: readonly WeeklyForecastSourceRecord[] = [
  {
    id: "TL-BINGWU-BTC-SHEN-20260807-V1",
    marketCode: "BTC",
    periodStart: "2026-08-07",
    periodEnd: "2026-09-06",
    primaryHexagram: null,
    changedHexagram: null,
    movingLines: [],
    specialPatterns: ["SOURCE_AUTHORITY_TEACHER_ORIGINAL", "MONTHLY_STAGE_NOT_DAILY_HEXAGRAM"],
    weeklyDirection: "震荡上涨",
    weeklyPath: "申月整体缓慢恢复、震荡上行，力度受三合火局制约，不按单边爆发行情处理。日度内容只能从该阶段路径与目标日干支拆分。",
    interpretation: "老师原始申月课程结论：子孙申金生财子水，但寅午戌三合火局克申金，故有恢复而力度受限。",
    riskSummary: "老师原卦优先；不把课程月度结论伪装成每日重新起卦，也不补造老师未给出的单日顺序。",
    sourceType: "LIUYAO_WEEKLY",
    version: 1,
    status: "LOCKED",
    publishedAt: LOCKED_AT,
    lockedAt: LOCKED_AT,
    createdAt: LOCKED_AT,
    updatedAt: LOCKED_AT,
  },
  {
    id: "TL-BINGWU-NDX-HALFMONTH-20260819-V1",
    marketCode: "NDX",
    periodStart: "2026-08-19",
    periodEnd: "2026-09-02",
    primaryHexagram: null,
    changedHexagram: null,
    movingLines: [],
    specialPatterns: ["SOURCE_AUTHORITY_TEACHER_ORIGINAL", "HALF_MONTH_STAGE_NOT_DAILY_HEXAGRAM"],
    weeklyDirection: "震荡上涨",
    weeklyPath: "半月内仍有上行空间，但30500附近难度高；即使触及也未必站稳。",
    interpretation: "仅采用老师在多市场半月课程中明确给出的纳指阶段结论；不把长期2028—2029风险提前改写成当前日方向。",
    riskSummary: "30500为该期老师条件点位，不固化成永久压力；长期风险与当前半月方向分栏保存。",
    sourceType: "LIUYAO_WEEKLY",
    version: 1,
    status: "LOCKED",
    publishedAt: LOCKED_AT,
    lockedAt: LOCKED_AT,
    createdAt: LOCKED_AT,
    updatedAt: LOCKED_AT,
  },
  {
    id: "TL-BINGWU-SHCOMP-STAGE-20260807-V1",
    marketCode: "SHCOMP",
    periodStart: "2026-08-07",
    periodEnd: "2026-10-06",
    primaryHexagram: null,
    changedHexagram: null,
    movingLines: [],
    specialPatterns: ["SOURCE_AUTHORITY_TEACHER_ORIGINAL", "STAGE_NOT_DAILY_HEXAGRAM"],
    weeklyDirection: "震荡上涨",
    weeklyPath: "老师判断半年内直接突破4500难度较高，但8月7日至10月6日存在较明显上行阶段，目标区间以3900—4300为条件参考。",
    interpretation: "区分方向与点位：阶段偏上不等于承诺4500；老师给出的80%难破4500属于目标达成概率。",
    riskSummary: "4500结论是半年目标判断，不得被技术层或日度波动改写成当前看空。",
    sourceType: "LIUYAO_WEEKLY",
    version: 1,
    status: "LOCKED",
    publishedAt: LOCKED_AT,
    lockedAt: LOCKED_AT,
    createdAt: LOCKED_AT,
    updatedAt: LOCKED_AT,
  },
];

export function findTeacherPriorityLiuyaoSource(
  marketCode: string,
  forecastDate: string,
): WeeklyForecastSourceRecord | null {
  const normalized = marketCode.toUpperCase() === "GLD" ? "GOLD" : marketCode.toUpperCase();
  return TEACHER_STAGE_SOURCES
    .filter((row) => row.marketCode === normalized || (normalized === "SSEC" && row.marketCode === "SHCOMP"))
    .filter((row) => row.periodStart <= forecastDate && forecastDate <= row.periodEnd)
    .sort((left, right) => right.version - left.version || right.lockedAt!.localeCompare(left.lockedAt!))[0] ?? null;
}

export function listTeacherPriorityLiuyaoSources20260821(): readonly WeeklyForecastSourceRecord[] {
  return TEACHER_STAGE_SOURCES;
}
