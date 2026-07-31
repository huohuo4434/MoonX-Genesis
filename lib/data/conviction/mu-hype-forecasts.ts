import {
  ASTEROID_PERIOD_LABELS,
  type ConvictionForecastType,
  type ConvictionPeriodForecast,
} from "@/lib/data/conviction/asteroid-forecasts";

type SourcePeriod = {
  id: string;
  assetId: "mu" | "hype";
  forecastType: ConvictionForecastType;
  periodStart: string;
  periodEnd: string;
  primary: string;
  changed?: string | null;
  question: string;
};

const SOURCE_PERIODS: SourcePeriod[] = [
  {
    id: "MU-WEEK-20260731-A-V1",
    assetId: "mu",
    forecastType: "WEEK",
    periodStart: "2026-07-31",
    periodEnd: "2026-08-09",
    primary: "山泽损",
    changed: "地水师",
    question: "美光MU从今天到8月9日走势",
  },
  {
    id: "MU-WEEK-20260731-B-V1",
    assetId: "mu",
    forecastType: "WEEK",
    periodStart: "2026-07-31",
    periodEnd: "2026-08-09",
    primary: "水泽节",
    changed: "地泽临",
    question: "美光MU从今天到8月9日走势（补充卦）",
  },
  {
    id: "MU-WEEK2-20260810-V1",
    assetId: "mu",
    forecastType: "WEEK",
    periodStart: "2026-08-10",
    periodEnd: "2026-08-16",
    primary: "地泽临",
    changed: "坤为地",
    question: "美光MU 8月10日至16日走势",
  },
  {
    id: "MU-M1-20260731-V1",
    assetId: "mu",
    forecastType: "MONTH_1",
    periodStart: "2026-07-31",
    periodEnd: "2026-09-07",
    primary: "水雷屯",
    changed: null,
    question: "美光MU从今天到9月7日走势",
  },
  {
    id: "MU-M3-20260731-V1",
    assetId: "mu",
    forecastType: "MONTH_3",
    periodStart: "2026-07-31",
    periodEnd: "2026-10-31",
    primary: "风雷益",
    changed: "风泽中孚",
    question: "美光MU近3个月走势",
  },
  {
    id: "MU-Y1-20260731-V1",
    assetId: "mu",
    forecastType: "YEAR_1",
    periodStart: "2026-07-31",
    periodEnd: "2027-07-31",
    primary: "天火同人",
    changed: "离为火",
    question: "美光MU未来一年走势",
  },
  {
    id: "MU-Y5-20260731-V1",
    assetId: "mu",
    forecastType: "YEAR_5",
    periodStart: "2026-07-31",
    periodEnd: "2031-07-31",
    primary: "雷地豫",
    changed: "雷山小过",
    question: "美光MU未来五年走势",
  },
  {
    id: "HYPE-WEEK1-20260731-V1",
    assetId: "hype",
    forecastType: "WEEK",
    periodStart: "2026-07-31",
    periodEnd: "2026-08-09",
    primary: "火天大有",
    changed: "火风鼎",
    question: "HYPE在8月9日前走势",
  },
  {
    id: "HYPE-WEEK2-20260809-V1",
    assetId: "hype",
    forecastType: "WEEK",
    periodStart: "2026-08-09",
    periodEnd: "2026-08-16",
    primary: "山泽损",
    changed: null,
    question: "HYPE 8月9日至16日走势",
  },
  {
    id: "HYPE-WEEK3-20260817-V1",
    assetId: "hype",
    forecastType: "WEEK",
    periodStart: "2026-08-17",
    periodEnd: "2026-08-23",
    primary: "风地观",
    changed: "地雷复",
    question: "HYPE 8月17日至23日走势",
  },
  {
    id: "HYPE-WEEK4-20260823-V1",
    assetId: "hype",
    forecastType: "WEEK",
    periodStart: "2026-08-23",
    periodEnd: "2026-08-31",
    primary: "离为火",
    changed: "天火同人",
    question: "HYPE 8月23日至31日走势",
  },
  {
    id: "HYPE-M1-20260731-V1",
    assetId: "hype",
    forecastType: "MONTH_1",
    periodStart: "2026-07-31",
    periodEnd: "2026-08-31",
    primary: "兑为泽",
    changed: "天雷无妄",
    question: "HYPE从今天到8月31日一个月走势",
  },
  {
    id: "HYPE-M3-20260731-V1",
    assetId: "hype",
    forecastType: "MONTH_3",
    periodStart: "2026-07-31",
    periodEnd: "2026-10-31",
    primary: "山地剥",
    changed: "地风升",
    question: "HYPE从今天到10月31日三个月走势",
  },
  {
    id: "HYPE-Y1-20260731-V1",
    assetId: "hype",
    forecastType: "YEAR_1",
    periodStart: "2026-07-31",
    periodEnd: "2027-07-31",
    primary: "风山渐",
    changed: "火山旅",
    question: "HYPE未来一年走势",
  },
  {
    id: "HYPE-Y10-20260731-V1",
    assetId: "hype",
    forecastType: "YEAR_10",
    periodStart: "2026-07-31",
    periodEnd: "2036-07-31",
    primary: "天雷无妄",
    changed: "坎为水",
    question: "HYPE未来十年走势",
  },
];

function toForecast(source: SourcePeriod): ConvictionPeriodForecast {
  return {
    id: source.id,
    assetId: source.assetId,
    forecastType: source.forecastType,
    periodStart: source.periodStart,
    periodEnd: source.periodEnd,
    direction: "待复核",
    upProbability: 0,
    sidewaysProbability: 0,
    downProbability: 0,
    summary: `${source.question}的原始六爻卦图已录入。正式方向、概率和运行路径需按老师规则完成复核后发布。`,
    expectedPath: "原始资料已归档，尚未形成正式预测路径。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: source.assetId === "hype" ? "极高" : "高",
    catalysts: [],
    risks: ["原始卦图尚未完成正式复核，不参与准确率统计。"],
    ichingEvidence: {
      primaryHexagram: source.primary,
      changingHexagram: source.changed ?? null,
      notes: `来源问题：${source.question}。只保存原始卦象，不在未复核前补写方向。`,
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: "2026-07-31T20:00:00+08:00",
    lockedAt: "2026-07-31T20:00:00+08:00",
    validatedAt: null,
    validationStatus: "UNVERIFIED",
  };
}

export const MU_HYPE_PERIOD_FORECASTS = SOURCE_PERIODS.map(toForecast);

export const PERIOD_ORDER_BY_ASSET: Record<"mu" | "hype", ConvictionForecastType[]> = {
  mu: ["WEEK", "MONTH_1", "MONTH_3", "YEAR_1", "YEAR_5"],
  hype: ["WEEK", "MONTH_1", "MONTH_3", "YEAR_1", "YEAR_10"],
};

export function listMuHypePeriodForecasts(assetId: "mu" | "hype") {
  return MU_HYPE_PERIOD_FORECASTS.filter(
    (item) => item.assetId === assetId && item.status === "published"
  );
}

export function periodMetaForAsset(assetId: "mu" | "hype") {
  const periods = listMuHypePeriodForecasts(assetId);
  return PERIOD_ORDER_BY_ASSET[assetId].map((type) => ({
    type,
    labelZh: ASTEROID_PERIOD_LABELS[type].zh,
    emptyZh: ASTEROID_PERIOD_LABELS[type].emptyZh,
    hasResearch: periods.some((item) => item.forecastType === type),
  }));
}
