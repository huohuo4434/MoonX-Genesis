/**
 * Asteroid（太空狗）多周期六爻研究。
 * 重点关注页只展示本周与1个月；更长周期进入总趋势资料库。
 * 来源包含2026-07-24与2026-07-29两次3个月卦，复测结果分别保留。
 */
import type { FormalDirection } from "@/lib/forecasts/formal-direction";

export type ConvictionForecastType =
  | "TODAY"
  | "TOMORROW"
  | "WEEK"
  | "WEEK_2"
  | "WEEK_3"
  | "WEEK_4"
  | "MONTH_1"
  | "MONTH_3"
  | "YEAR_1"
  | "YEAR_3"
  | "YEAR_5"
  | "YEAR_10";

export type ConvictionPeriodForecast = {
  id: string;
  assetId: string;
  forecastType: ConvictionForecastType;
  targetDate?: string | null;
  periodStart: string;
  periodEnd: string;
  direction: FormalDirection | "待复核";
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
  /** Optional cross-method consensus, shown only when grounded sources exist. */
  consensusStars?: 1 | 2 | 3 | 4 | 5 | null;
  consensusLabel?: string | null;
  methodViews?: Array<{
    id: string;
    label: string;
    direction: string;
    weight: number;
    summary: string;
  }>;
  /** Compact text for the long-horizon archive. */
  archiveSummary?: string | null;
};

/** Published long-horizon snapshots only — never fabricate TODAY/TOMORROW from these. */
export const ASTEROID_PERIOD_FORECASTS: ConvictionPeriodForecast[] = [
  {
    id: "ASTEROID-WEEK-20260729-V2",
    assetId: "asteroid",
    forecastType: "WEEK",
    periodStart: "2026-07-29",
    periodEnd: "2026-08-04",
    direction: "冲高回落",
    upProbability: 24,
    sidewaysProbability: 34,
    downProbability: 42,
    summary:
      "未来7天偏弱。兄弟酉金持世，在未月得土生而偏旺，对财爻卯木形成直接压制；子孙子水伏于父母未土之下，同时受飞神克制，生财动力不足。静卦游魂意味着偶发拉升难形成稳定趋势。",
    expectedPath: "短线可能出现情绪拉升，但持续性不足，更容易冲高回落并回到高波动整理。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "极高",
    catalysts: ["社区热点", "流动性突增"],
    risks: ["兄弟持世克财", "子孙伏藏受克", "小市值流动性和操纵风险"],
    consensusStars: 4,
    consensusLabel: "财爻、子孙与世爻信号共同偏弱",
    methodViews: [
      {
        id: "liuyiao-week",
        label: "六爻·未来7天",
        direction: "冲高回落",
        weight: 100,
        summary: "兄弟酉金持世且旺，财卯木受克，子孙子水伏藏受制。",
      },
    ],
    ichingEvidence: {
      primaryHexagram: "火地晋",
      changingHexagram: null,
      notes: "静卦游魂。世爻兄弟酉金受未月生扶，妻财卯木受克；子孙子水伏于父母未土之下。",
    },
    version: 2,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: "2026-07-31T21:20:00+08:00",
    lockedAt: "2026-07-31T21:20:00+08:00",
    validatedAt: null,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "ASTEROID-M1-20260729-V2",
    assetId: "asteroid",
    forecastType: "MONTH_1",
    periodStart: "2026-07-29",
    periodEnd: "2026-08-28",
    direction: "先跌后涨",
    upProbability: 35,
    sidewaysProbability: 36,
    downProbability: 29,
    summary:
      "一个月先弱后修复。财爻子水临应但在未月受克、辰日入墓，前段资金面偏弱；世爻官鬼卯木发动化子孙申金，风险释放后有转为修复动力的条件。变卦水山蹇说明反弹仍会受阻。",
    expectedPath: "前段下探或缩量整理，中后段出现反弹修复，但上行过程阻力较多，难按持续单边行情理解。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "极高",
    catalysts: ["官鬼动化子孙", "社区与流动性改善"],
    risks: ["财爻月克日墓", "兄弟土旺", "反弹受阻", "极高波动"],
    consensusStars: 3,
    consensusLabel: "前弱信号明确，后段修复仍需流动性配合",
    methodViews: [
      {
        id: "liuyiao-month",
        label: "六爻·1个月",
        direction: "先跌后涨",
        weight: 100,
        summary: "财子水先弱，世官鬼动化子孙，风险释放后具备修复条件。",
      },
    ],
    ichingEvidence: {
      primaryHexagram: "水地比",
      changingHexagram: "水山蹇",
      notes: "妻财子水临应但受未月克、辰日墓；世爻官鬼卯木发动化子孙申金。",
    },
    version: 2,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: "2026-07-31T21:20:00+08:00",
    lockedAt: "2026-07-31T21:20:00+08:00",
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
      "两次三个月卦都不支持短期直线上涨。7月24日卦为艮为山化风山渐，强调先停滞、后缓慢改善；7月29日复测为地火明夷化雷火丰，强调先受压、后出现情绪和流动性扩张。综合为先弱后修复。",
    archiveSummary: "三个月：两次卦均指向先弱后修复；后段反弹依赖项目进展和市场流动性。",
    expectedPath: "前段停滞或回撤，中段磨底，后段若项目和市场条件改善，再观察较强修复。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "极高",
    catalysts: ["生态功能", "新增交易平台"],
    risks: ["前段承压", "项目执行风险"],
    ichingEvidence: {
      primaryHexagram: "地火明夷（7月29日复测）",
      changingHexagram: "雷火丰",
      notes:
        "7月24日首次三个月卦为艮为山（六冲）化风山渐（归魂）；7月29日复测为地火明夷（游魂）化雷火丰。两次均支持前段承压、后段逐步修复。",
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
    archiveSummary: "一年：缓慢抬升与多次回撤并存。",
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
    archiveSummary: "五年：高波动扩张情景，但大涨与深度回撤会反复出现。",
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
  WEEK_2: { zh: "第2阶段", en: "Stage 2", emptyZh: "该周期预测尚未发布" },
  WEEK_3: { zh: "第3阶段", en: "Stage 3", emptyZh: "该周期预测尚未发布" },
  WEEK_4: { zh: "第4阶段", en: "Stage 4", emptyZh: "该周期预测尚未发布" },
  MONTH_1: { zh: "1个月", en: "1M", emptyZh: "该周期预测尚未发布" },
  MONTH_3: { zh: "3个月", en: "3M", emptyZh: "该周期预测尚未发布" },
  YEAR_1: { zh: "1年", en: "1Y", emptyZh: "该周期预测尚未发布" },
  YEAR_3: { zh: "3年", en: "3Y", emptyZh: "该周期预测尚未发布" },
  YEAR_5: { zh: "5年", en: "5Y", emptyZh: "该周期预测尚未发布" },
  YEAR_10: { zh: "10年", en: "10Y", emptyZh: "该周期预测尚未发布" },
};

export function listAsteroidPeriodForecasts(): ConvictionPeriodForecast[] {
  return ASTEROID_PERIOD_FORECASTS.filter((f) => f.status === "published");
}

export function getAsteroidForecastByType(
  type: ConvictionForecastType
): ConvictionPeriodForecast | null {
  return listAsteroidPeriodForecasts().find((f) => f.forecastType === type) ?? null;
}
