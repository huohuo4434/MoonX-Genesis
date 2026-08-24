import { MONTHLY_MARKET_OUTLOOKS_202609 } from "@/lib/data/monthly-market-outlook-202609";
import { PUBLISHED_WEEKLY_ANALYSES_20260824 } from "@/lib/data/published-weekly-analysis-20260824";
import { WEEKLY_METALS_ENERGY_20260824 } from "@/lib/data/published-weekly-metals-energy-20260824";
import { WEEKLY_WOLF_REVISIONS_20260823 } from "@/lib/data/published-weekly-wolf-20260823";
import { normalizeOfficialDirection } from "@/lib/forecasts/formal-direction";
import type { WeeklyAnalysisRecord, WeeklyKeyDate } from "@/types/weekly-analysis";
import type { ConvictionForecastType, ConvictionPeriodForecast } from "@/lib/data/conviction/asteroid-forecasts";

export type MetalsEnergyFocusAssetId = "gold" | "silver" | "wti-crude";

export const METALS_ENERGY_PERIOD_ORDER: ConvictionForecastType[] = [
  "WEEK",
  "WEEK_2",
  "WEEK_3",
  "WEEK_4",
  "WEEK_5",
  "WEEK_6",
  "MONTH_1",
];

export const METALS_ENERGY_VISIBLE_PERIOD_ORDER = METALS_ENERGY_PERIOD_ORDER;

const PERIOD_BY_START: Readonly<Record<string, ConvictionForecastType>> = Object.freeze({
  "2026-08-24": "WEEK",
  "2026-08-31": "WEEK_2",
  "2026-09-07": "WEEK_3",
  "2026-09-14": "WEEK_4",
  "2026-09-21": "WEEK_5",
  "2026-09-28": "WEEK_6",
});

const LABELS: Readonly<Record<ConvictionForecastType, { zh: string; en: string; emptyZh: string }>> = Object.freeze({
  TODAY: { zh: "今日", en: "Today", emptyZh: "今日研究尚未发布" },
  TOMORROW: { zh: "明日", en: "Tomorrow", emptyZh: "明日研究尚未发布" },
  WEEK: { zh: "8/24–30", en: "Aug 24–30", emptyZh: "8/24–30研究尚未发布" },
  WEEK_2: { zh: "8/31–9/6", en: "Aug 31–Sep 6", emptyZh: "8/31–9/6研究尚未发布" },
  WEEK_3: { zh: "9/7–13", en: "Sep 7–13", emptyZh: "9/7–13研究尚未发布" },
  WEEK_4: { zh: "9/14–20", en: "Sep 14–20", emptyZh: "9/14–20研究尚未发布" },
  WEEK_5: { zh: "9/21–27", en: "Sep 21–27", emptyZh: "9/21–27研究尚未发布" },
  WEEK_6: { zh: "9/28–10/4", en: "Sep 28–Oct 4", emptyZh: "9/28–10/4研究尚未发布" },
  WEEK_7: { zh: "第7周", en: "Week 7", emptyZh: "该周研究尚未发布" },
  WEEK_8: { zh: "第8周", en: "Week 8", emptyZh: "该周研究尚未发布" },
  WEEK_9: { zh: "第9周", en: "Week 9", emptyZh: "该周研究尚未发布" },
  MONTH_1: { zh: "2026年9月", en: "September 2026", emptyZh: "9月研究尚未发布" },
  MONTH_3: { zh: "3个月", en: "3M", emptyZh: "3个月研究尚未发布" },
  YEAR_1: { zh: "1年", en: "1Y", emptyZh: "1年研究尚未发布" },
  YEAR_3: { zh: "3年", en: "3Y", emptyZh: "3年研究尚未发布" },
  YEAR_5: { zh: "5年", en: "5Y", emptyZh: "5年研究尚未发布" },
  YEAR_10: { zh: "10年", en: "10Y", emptyZh: "10年研究尚未发布" },
});

export function metalsEnergyPeriodLabel(type: ConvictionForecastType) {
  return LABELS[type];
}

function keyDateType(effect: WeeklyKeyDate["expectedEffect"]): NonNullable<ConvictionPeriodForecast["keyDates"]>[number]["type"] {
  if (effect === "上涨") return "上涨候选";
  if (effect === "下跌") return "下跌风险";
  if (effect === "波动放大") return "波动放大";
  if (effect === "企稳" || effect === "探底回升") return "阶段低点";
  if (effect === "冲高回落") return "阶段高点";
  return "转折";
}

function keyDateSource(sources: WeeklyKeyDate["sources"]): NonNullable<ConvictionPeriodForecast["keyDates"]>[number]["source"] {
  if (sources.includes("LIUYAO")) return "LIUYAO";
  if (sources.includes("QIMEN")) return "QIMEN";
  if (sources.includes("BAZI")) return "BAZI";
  if (sources.includes("TECHNICAL")) return "TECHNICAL";
  return "ADMIN";
}

function weeklyToForecast(record: WeeklyAnalysisRecord): ConvictionPeriodForecast {
  const note = record.basisWeights?.note?.trim() || record.headline;
  const chart = note.match(/(?:周卦|六爻：)([^。；]+)/)?.[1]?.trim();
  const methodViews: NonNullable<ConvictionPeriodForecast["methodViews"]> = [];
  if ((record.basisWeights?.liuyao ?? 0) > 0) {
    methodViews.push({
      id: "LIUYAO",
      label: "六爻",
      direction: normalizeOfficialDirection(record.overallDirection),
      weight: record.basisWeights?.liuyao ?? 0,
      summary: record.weeklyPath,
    });
  }
  if ((record.basisWeights?.qimen ?? 0) > 0) {
    methodViews.push({
      id: "QIMEN",
      label: "奇门",
      direction: normalizeOfficialDirection(record.overallDirection),
      weight: record.basisWeights?.qimen ?? 0,
      summary: note,
    });
  }
  return {
    id: `FOCUS-${record.id}`,
    assetId: record.assetId,
    forecastType: PERIOD_BY_START[record.weekStart] ?? "WEEK",
    periodStart: record.weekStart,
    periodEnd: record.weekEnd,
    direction: normalizeOfficialDirection(record.overallDirection),
    upProbability: record.probabilities.up,
    sidewaysProbability: record.probabilities.flat,
    downProbability: record.probabilities.down,
    summary: record.headline,
    expectedPath: record.weeklyPath,
    supportLevels: record.keySupport ?? [],
    resistanceLevels: record.keyResistance ?? [],
    confirmationLevel: record.confirmation ?? null,
    invalidationLevel: record.invalidation,
    riskLevel: record.riskLevel,
    catalysts: record.catalysts ?? [],
    risks: record.risks ?? [],
    ichingEvidence: {
      primaryHexagram: chart || "已归档六爻周卦",
      changingHexagram: null,
      notes: note,
    },
    version: record.version,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: record.publishedAt,
    lockedAt: record.publishedAt,
    validationStatus: "UNVERIFIED",
    consensusStars: methodViews.length >= 2 ? 4 : null,
    consensusLabel: methodViews.length >= 2 ? "六爻与奇门同向" : "单一方法，未提高信心",
    methodViews,
    keyDates: record.keyDates?.map((item) => ({
      date: item.date,
      type: keyDateType(item.expectedEffect),
      label: item.label,
      source: keyDateSource(item.sources),
      confidence: item.confidence ?? null,
      note: item.note ?? null,
    })),
    archiveSummary: `${record.weekStart}至${record.weekEnd}｜${normalizeOfficialDirection(record.overallDirection)}｜${record.headline}`,
  };
}

function monthlyToForecast(assetId: MetalsEnergyFocusAssetId): ConvictionPeriodForecast | null {
  const row = MONTHLY_MARKET_OUTLOOKS_202609.find((item) => item.assetId === assetId);
  if (!row) return null;
  const publishedAt = row.revisedAt ?? "2026-08-24T12:30:00+08:00";
  return {
    id: `FOCUS-MONTHLY-${assetId.toUpperCase()}-202609-V${row.version ?? 1}`,
    assetId,
    forecastType: "MONTH_1",
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    direction: row.direction,
    upProbability: row.probabilities.up,
    sidewaysProbability: row.probabilities.flat,
    downProbability: row.probabilities.down,
    summary: row.keyWindow,
    expectedPath: row.path,
    supportLevels: [],
    resistanceLevels: [],
    confirmationLevel: row.keyWindow,
    invalidationLevel: row.risk,
    riskLevel: row.volatility === "HIGH" ? "高" : "中",
    catalysts: [row.keyWindow],
    risks: [row.risk],
    ichingEvidence: {
      primaryHexagram: "已归档九月六爻月卦",
      changingHexagram: null,
      notes: row.sourceNote,
    },
    version: row.version ?? 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt,
    lockedAt: publishedAt,
    validationStatus: "UNVERIFIED",
    consensusStars: null,
    consensusLabel: "月卦定背景，周卦定当周",
    methodViews: [{ id: "LIUYAO", label: "六爻", direction: row.direction, weight: 100, summary: row.path }],
    archiveSummary: `2026年9月｜${row.direction}｜${row.keyWindow}`,
  };
}

function currentWeekly(assetId: MetalsEnergyFocusAssetId): WeeklyAnalysisRecord | null {
  const revision = WEEKLY_WOLF_REVISIONS_20260823.find((item) => item.assetId === assetId);
  if (revision) return revision;
  return PUBLISHED_WEEKLY_ANALYSES_20260824.find((item) => item.assetId === assetId) ?? null;
}

export function listMetalsEnergyFocusForecasts(assetId: MetalsEnergyFocusAssetId): ConvictionPeriodForecast[] {
  const current = currentWeekly(assetId);
  const future = WEEKLY_METALS_ENERGY_20260824.filter((item) => item.assetId === assetId);
  const monthly = monthlyToForecast(assetId);
  return [
    ...(current ? [weeklyToForecast(current)] : []),
    ...future.map(weeklyToForecast),
    ...(monthly ? [monthly] : []),
  ];
}
