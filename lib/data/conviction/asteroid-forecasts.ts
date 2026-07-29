/**
 * Asteroid (太空狗) member forecast periods.
 * TODAY / TOMORROW intentionally empty until admin publishes formal sessions.
 * WEEK / MONTH_1 / MONTH_3 / YEAR_1 / YEAR_5 imported from 2026-07-29 ICHING research.
 */
import type { FormalDirection } from "@/lib/forecasts/formal-direction";

export type ConvictionForecastType =
  | "TODAY"
  | "TOMORROW"
  | "WEEK"
  | "MONTH_1"
  | "MONTH_3"
  | "YEAR_1"
  | "YEAR_5";

export type ConvictionPeriodForecast = {
  id: string;
  assetId: "asteroid";
  forecastType: ConvictionForecastType;
  targetDate?: string | null;
  periodStart: string;
  periodEnd: string;
  direction: FormalDirection;
  upProbability: number;
  sidewaysProbability: number;
  downProbability: number;
  summary: string;
  expectedPath: string;
  supportLevels: string[];
  resistanceLevels: string[];
  confirmationLevel?: string | null;
  invalidationLevel?: string | null;
  riskLevel: string;
  catalysts: string[];
  risks: string[];
  aiEvidence?: string | null;
  ichingEvidence: {
    primaryHexagram: string;
    changingHexagram?: string | null;
    notes: string;
  };
  waveEvidence?: string | null;
  version: number;
  status: "published" | "draft";
  sourceType: "ICHING_RESEARCH" | "ADMIN";
  publishedAt: string;
  lockedAt: string;
  validatedAt?: string | null;
  validationStatus: "UNVERIFIED" | "HIT" | "MISS" | "VOID";
};

/** Published long-horizon snapshots only — never fabricate TODAY/TOMORROW from these. */
export const ASTEROID_PERIOD_FORECASTS: ConvictionPeriodForecast[] = [
  {
    id: "ASTEROID-WEEK-20260729-V1",
    assetId: "asteroid",
    forecastType: "WEEK",
    periodStart: "2026-07-29",
    periodEnd: "2026-08-04",
    direction: "震荡上涨",
    upProbability: 48,
    sidewaysProbability: 30,
    downProbability: 22,
    summary:
      "本周／未来7天基准判断为震荡上涨。上涨过程中伴随较大波动，可能出现冲高回落，不能理解为单边上涨。",
    expectedPath: "上涨过程中伴随较大波动，可能出现冲高回落，不能理解为单边上涨。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "极高",
    catalysts: ["社区关注", "流动性改善"],
    risks: ["游魂结构，行情持续性和稳定性不足", "极高波动"],
    ichingEvidence: {
      primaryHexagram: "火地晋",
      changingHexagram: null,
      notes: "游魂结构，行情持续性和稳定性不足。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: "2026-07-29T10:00:00+08:00",
    lockedAt: "2026-07-29T10:00:00+08:00",
    validatedAt: null,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "ASTEROID-M1-20260729-V1",
    assetId: "asteroid",
    forecastType: "MONTH_1",
    periodStart: "2026-07-29",
    periodEnd: "2026-08-28",
    direction: "先涨后跌",
    upProbability: 42,
    sidewaysProbability: 28,
    downProbability: 30,
    summary:
      "一个月基准路径：前段可能出现资金聚集和价格抬升，随后进入阻力区并转为震荡（先涨后震荡）。",
    expectedPath: "前段可能出现资金聚集和价格抬升，随后进入阻力区并转为震荡。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "极高",
    catalysts: ["社区增长", "交易量增长"],
    risks: ["阻力区震荡", "流动性不足"],
    ichingEvidence: {
      primaryHexagram: "水地比",
      changingHexagram: "水山蹇",
      notes: "先涨后震荡。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: "2026-07-29T10:00:00+08:00",
    lockedAt: "2026-07-29T10:00:00+08:00",
    validatedAt: null,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "ASTEROID-M3-20260729-V1",
    assetId: "asteroid",
    forecastType: "MONTH_3",
    periodStart: "2026-07-29",
    periodEnd: "2026-10-28",
    direction: "先跌后涨",
    upProbability: 45,
    sidewaysProbability: 25,
    downProbability: 30,
    summary:
      "三个月基准路径：前段承压或处于低谷，后段若项目和市场条件改善，可能形成较强反弹。",
    expectedPath: "前段承压或处于低谷，后段若项目和市场条件改善，可能形成较强反弹。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "极高",
    catalysts: ["生态功能", "新增交易平台"],
    risks: ["前段承压", "项目执行风险"],
    ichingEvidence: {
      primaryHexagram: "地火明夷",
      changingHexagram: "雷火丰",
      notes: "先跌后涨。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: "2026-07-29T10:00:00+08:00",
    lockedAt: "2026-07-29T10:00:00+08:00",
    validatedAt: null,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "ASTEROID-Y1-20260729-V1",
    assetId: "asteroid",
    forecastType: "YEAR_1",
    periodStart: "2026-07-29",
    periodEnd: "2027-07-28",
    direction: "震荡上涨",
    upProbability: 50,
    sidewaysProbability: 28,
    downProbability: 22,
    summary: "一年基准判断为震荡上涨：以逐步抬升为主，不定义为短期暴涨；上涨过程中需要多次整理。",
    expectedPath: "以逐步抬升为主，不定义为短期暴涨；上涨过程中需要多次整理。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "极高",
    catalysts: ["项目路线图", "社区增长"],
    risks: ["多次整理回撤", "极高波动"],
    ichingEvidence: {
      primaryHexagram: "地风升",
      changingHexagram: "地山谦",
      notes: "震荡上涨，非短期暴涨。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: "2026-07-29T10:00:00+08:00",
    lockedAt: "2026-07-29T10:00:00+08:00",
    validatedAt: null,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "ASTEROID-Y5-20260729-V1",
    assetId: "asteroid",
    forecastType: "YEAR_5",
    periodStart: "2026-07-29",
    periodEnd: "2031-07-28",
    direction: "震荡上涨",
    upProbability: 52,
    sidewaysProbability: 20,
    downProbability: 28,
    summary:
      "五年基准判断为高波动上涨语境下的震荡抬升：长期存在积累和传播扩张的可能，但六冲结构意味着期间可能出现多次大幅上涨和大幅回撤。",
    expectedPath: "长期积累与传播扩张可能并存，期间或出现多次大幅上涨和大幅回撤。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "极高",
    catalysts: ["加密市场风险偏好", "生态扩张"],
    risks: ["六冲结构大幅回撤", "本金大幅损失风险"],
    ichingEvidence: {
      primaryHexagram: "山天大畜",
      changingHexagram: "离为火",
      notes: "高波动上涨；六冲结构意味着大幅上涨与大幅回撤可能交替出现。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: "2026-07-29T10:00:00+08:00",
    lockedAt: "2026-07-29T10:00:00+08:00",
    validatedAt: null,
    validationStatus: "UNVERIFIED",
  },
];

export const ASTEROID_PERIOD_ORDER: ConvictionForecastType[] = [
  "TODAY",
  "TOMORROW",
  "WEEK",
  "MONTH_1",
  "MONTH_3",
  "YEAR_1",
  "YEAR_5",
];

export const ASTEROID_PERIOD_LABELS: Record<
  ConvictionForecastType,
  { zh: string; en: string; emptyZh: string }
> = {
  TODAY: { zh: "今日", en: "Today", emptyZh: "今日分析尚未发布" },
  TOMORROW: { zh: "明日", en: "Tomorrow", emptyZh: "下一交易日分析尚未发布" },
  WEEK: { zh: "本周", en: "Week", emptyZh: "该周期预测尚未发布" },
  MONTH_1: { zh: "1个月", en: "1M", emptyZh: "该周期预测尚未发布" },
  MONTH_3: { zh: "3个月", en: "3M", emptyZh: "该周期预测尚未发布" },
  YEAR_1: { zh: "1年", en: "1Y", emptyZh: "该周期预测尚未发布" },
  YEAR_5: { zh: "5年", en: "5Y", emptyZh: "该周期预测尚未发布" },
};

export function listAsteroidPeriodForecasts(): ConvictionPeriodForecast[] {
  return ASTEROID_PERIOD_FORECASTS.filter((f) => f.status === "published");
}

export function getAsteroidForecastByType(
  type: ConvictionForecastType
): ConvictionPeriodForecast | null {
  return listAsteroidPeriodForecasts().find((f) => f.forecastType === type) ?? null;
}
