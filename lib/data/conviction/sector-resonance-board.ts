import type { ConvictionPeriodForecast } from "@/lib/data/conviction/asteroid-forecasts";
import type { StaticFocusAssetId } from "@/lib/data/conviction/focus-registry-core";
import { listStaticFocusForecasts } from "@/lib/data/conviction/focus-static-forecast-registry";
import { US_INDEX_WEEKLY_REVISIONS_20260825 } from "@/lib/data/conviction/focus-weekly-revisions-20260825";
import { WEEKLY_RESEARCH_REVISIONS_20260823 } from "@/lib/data/published-weekly-research-20260823";
import { getAnnualForecastRoadmap2026 } from "@/lib/research/annual-forecast-roadmap-2026";

export type SectorResonanceGroup =
  | "半导体 / AI基础设施"
  | "太空与高波动成长"
  | "大型科技"
  | "加密资产"
  | "美股指数"
  | "贵金属与能源";

export type SectorResonanceCell = {
  direction: string;
  sourceKind: "WEEKLY" | "MONTHLY_CONTEXT" | "MISSING";
  sourceLabel: string;
  summary: string;
  forecastId: string | null;
};

export type SectorResonanceRow = {
  assetId: string;
  name: string;
  symbol: string;
  group: SectorResonanceGroup;
  annualDirection: string | null;
  annualMonthPath: string;
  longCycle: string;
  cells: SectorResonanceCell[];
};

export type SectorResonanceWeek = {
  start: string;
  end: string;
  label: string;
  badge: "本周" | "下周" | null;
};

export type SectorWeekSummary = {
  group: SectorResonanceGroup;
  weekStart: string;
  status: "HIGH" | "MEDIUM" | "DIVERGENT" | "INSUFFICIENT";
  label: string;
  bull: number;
  neutral: number;
  bear: number;
  exact: number;
};

export const SECTOR_RESONANCE_WEEKS_20260825: SectorResonanceWeek[] = [
  { start: "2026-08-24", end: "2026-08-30", label: "8/24–8/30", badge: "本周" },
  { start: "2026-08-31", end: "2026-09-06", label: "8/31–9/6", badge: "下周" },
  { start: "2026-09-07", end: "2026-09-13", label: "9/7–9/13", badge: null },
  { start: "2026-09-14", end: "2026-09-20", label: "9/14–9/20", badge: null },
  { start: "2026-09-21", end: "2026-09-27", label: "9/21–9/27", badge: null },
  { start: "2026-09-28", end: "2026-10-04", label: "9/28–10/4", badge: null },
];

type AssetDefinition = {
  assetId: string;
  focusId?: StaticFocusAssetId;
  name: string;
  symbol: string;
  group: SectorResonanceGroup;
  longCycle: string;
};

export const SECTOR_RESONANCE_ASSETS_20260825: AssetDefinition[] = [
  { assetId: "cxmt", focusId: "cxmt", name: "长鑫科技", symbol: "CXMT", group: "半导体 / AI基础设施", longCycle: "三个月先跌后涨" },
  { assetId: "intel", focusId: "intel", name: "英特尔", symbol: "INTC", group: "半导体 / AI基础设施", longCycle: "9月先强后弱" },
  { assetId: "sandisk", focusId: "sandisk", name: "闪迪", symbol: "SNDK", group: "半导体 / AI基础设施", longCycle: "双峰后整理，月底再观察修复" },
  { assetId: "lite", focusId: "lite", name: "Lumentum", symbol: "LITE", group: "半导体 / AI基础设施", longCycle: "到年底震荡偏上" },
  { assetId: "mu", focusId: "mu", name: "美光", symbol: "MU", group: "半导体 / AI基础设施", longCycle: "中期先整理后修复" },
  { assetId: "nbis", focusId: "nbis", name: "Nebius", symbol: "NBIS", group: "半导体 / AI基础设施", longCycle: "三个月先压后强" },
  { assetId: "spcx", focusId: "spcx", name: "SpaceX / SPCX", symbol: "SPCX", group: "太空与高波动成长", longCycle: "酉月高点窗口后防回吐" },
  { assetId: "asteroid", focusId: "asteroid", name: "太空狗", symbol: "ASTS", group: "太空与高波动成长", longCycle: "三个月先跌后涨" },
  { assetId: "msft", focusId: "msft", name: "微软", symbol: "MSFT", group: "大型科技", longCycle: "9月至10月高位压力增加" },
  { assetId: "googl", focusId: "googl", name: "谷歌", symbol: "GOOGL", group: "大型科技", longCycle: "9月至11月区间轮动" },
  { assetId: "tsla", focusId: "tsla", name: "特斯拉", symbol: "TSLA", group: "大型科技", longCycle: "前段洗盘、9月下旬偏强" },
  { assetId: "tencent", focusId: "tencent", name: "腾讯", symbol: "0700.HK", group: "大型科技", longCycle: "中期震荡修复" },
  { assetId: "btc", focusId: "btc", name: "比特币", symbol: "BTC", group: "加密资产", longCycle: "9月高点候选后转弱" },
  { assetId: "eth", focusId: "eth", name: "以太坊", symbol: "ETH", group: "加密资产", longCycle: "上旬见高后转弱" },
  { assetId: "sol", focusId: "sol", name: "Solana", symbol: "SOL", group: "加密资产", longCycle: "9月及秋冬偏弱" },
  { assetId: "hype", focusId: "hype", name: "HYPE", symbol: "HYPE", group: "加密资产", longCycle: "上旬推进后转弱" },
  { assetId: "sp500", name: "标普500", symbol: "SPX", group: "美股指数", longCycle: "9月资金修复，但路径不稳" },
  { assetId: "nasdaq-100", name: "纳斯达克100", symbol: "NDX", group: "美股指数", longCycle: "9月相对标普更弱" },
  { assetId: "gold", focusId: "gold", name: "黄金", symbol: "GOLD", group: "贵金属与能源", longCycle: "9月高位震荡、分段修复" },
  { assetId: "silver", focusId: "silver", name: "白银", symbol: "SILVER", group: "贵金属与能源", longCycle: "9月前强后弱" },
  { assetId: "wti-crude", focusId: "wti-crude", name: "WTI原油", symbol: "WTI", group: "贵金属与能源", longCycle: "高波动先强后弱" },
];

export const SECTOR_RESONANCE_GROUP_ORDER: SectorResonanceGroup[] = [
  "半导体 / AI基础设施",
  "太空与高波动成长",
  "大型科技",
  "加密资产",
  "美股指数",
  "贵金属与能源",
];

function utcDay(value: string): number {
  return Date.parse(`${value}T12:00:00Z`) / 86_400_000;
}

function daysInclusive(start: string, end: string): number {
  return Math.round(utcDay(end) - utcDay(start)) + 1;
}

function overlapDays(aStart: string, aEnd: string, bStart: string, bEnd: string): number {
  return Math.max(0, Math.min(utcDay(aEnd), utcDay(bEnd)) - Math.max(utcDay(aStart), utcDay(bStart)) + 1);
}

function normalizeDirection(value: string): string {
  if (/探底回升|先弱后稳|风险释放后修复/u.test(value)) return "先跌后涨";
  if (/冲高回落|先修复后回吐/u.test(value)) return "先涨后跌";
  if (/剧震偏强|偏多/u.test(value)) return "震荡上涨";
  if (/偏空/u.test(value)) return "震荡下跌";
  if (/^上涨|^震荡上涨|^先跌后涨|^震荡$|^先涨后跌|^震荡下跌|^下跌$/u.test(value)) return value;
  return "震荡";
}

function latestFirst(a: ConvictionPeriodForecast, b: ConvictionPeriodForecast): number {
  const dateCompare = (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");
  if (dateCompare !== 0) return dateCompare;
  const versionCompare = (b.version ?? 0) - (a.version ?? 0);
  if (versionCompare !== 0) return versionCompare;
  return daysInclusive(a.periodStart, a.periodEnd) - daysInclusive(b.periodStart, b.periodEnd);
}

function weeklyCell(forecasts: ConvictionPeriodForecast[], week: SectorResonanceWeek): SectorResonanceCell | null {
  const candidates = forecasts
    .filter((item) => item.status === "published")
    .filter((item) => daysInclusive(item.periodStart, item.periodEnd) <= 10)
    .filter((item) => overlapDays(item.periodStart, item.periodEnd, week.start, week.end) >= 5)
    .sort(latestFirst);
  const selected = candidates[0];
  if (!selected) return null;
  return {
    direction: normalizeDirection(selected.direction),
    sourceKind: "WEEKLY",
    sourceLabel: "完整周卦",
    summary: selected.expectedPath || selected.summary,
    forecastId: selected.id,
  };
}

function calendarPathCell(forecasts: ConvictionPeriodForecast[], week: SectorResonanceWeek): SectorResonanceCell | null {
  const ordered = [...forecasts].sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  for (const forecast of ordered) {
    const path = forecast.calendarMonthPath?.find((item) => {
      const [start, end] = item.period.split("/");
      return start === week.start && end === week.end;
    });
    if (!path) continue;
    return {
      direction: normalizeDirection(path.direction),
      sourceKind: "WEEKLY",
      sourceLabel: path.sourceNote || "月内周路径",
      summary: path.summary,
      forecastId: forecast.id,
    };
  }
  return null;
}

function monthlyContextCell(forecasts: ConvictionPeriodForecast[], week: SectorResonanceWeek): SectorResonanceCell | null {
  const middle = utcDay(week.start) + 3;
  const selected = forecasts
    .filter((item) => item.status === "published")
    .filter((item) => {
      const duration = daysInclusive(item.periodStart, item.periodEnd);
      return duration >= 20 && duration <= 180 && utcDay(item.periodStart) <= middle && utcDay(item.periodEnd) >= middle;
    })
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "") || (b.version ?? 0) - (a.version ?? 0))[0];
  if (!selected) return null;
  return {
    direction: normalizeDirection(selected.direction),
    sourceKind: "MONTHLY_CONTEXT",
    sourceLabel: daysInclusive(selected.periodStart, selected.periodEnd) <= 45 ? "月度背景" : "上级周期背景",
    summary: `缺少该周完整周卦；这里只显示上级周期背景，不把它冒充周方向：${selected.summary}`,
    forecastId: selected.id,
  };
}

function indexForecasts(assetId: "sp500" | "nasdaq-100"): ConvictionPeriodForecast[] {
  const current = WEEKLY_RESEARCH_REVISIONS_20260823
    .filter((item) => item.assetId === assetId && item.weekStart === "2026-08-24" && item.weekEnd === "2026-08-30")
    .sort((a, b) => b.version - a.version)[0];
  const adapted: ConvictionPeriodForecast[] = current ? [{
    id: current.id,
    assetId,
    forecastType: "WEEK",
    periodStart: current.weekStart,
    periodEnd: current.weekEnd,
    direction: normalizeDirection(current.overallDirection) as ConvictionPeriodForecast["direction"],
    upProbability: current.probabilities.up,
    sidewaysProbability: current.probabilities.flat,
    downProbability: current.probabilities.down,
    summary: current.headline,
    expectedPath: current.weeklyPath,
    supportLevels: current.keySupport ?? [],
    resistanceLevels: current.keyResistance ?? [],
    riskLevel: current.riskLevel ?? "高",
    catalysts: current.catalysts ?? [],
    risks: current.risks ?? [],
    ichingEvidence: { primaryHexagram: "已锁定周卦", notes: current.basisWeights?.note ?? "本周已锁定正式记录。" },
    version: current.version,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: current.publishedAt,
    lockedAt: current.publishedAt,
    validationStatus: "UNVERIFIED",
  }] : [];
  return [
    ...adapted,
    ...US_INDEX_WEEKLY_REVISIONS_20260825.filter((item) => item.assetId === assetId),
  ];
}

function forecastsFor(definition: AssetDefinition): ConvictionPeriodForecast[] {
  if (definition.focusId) return listStaticFocusForecasts(definition.focusId);
  if (definition.assetId === "sp500" || definition.assetId === "nasdaq-100") return indexForecasts(definition.assetId);
  return [];
}

function cellFor(forecasts: ConvictionPeriodForecast[], week: SectorResonanceWeek): SectorResonanceCell {
  return weeklyCell(forecasts, week)
    ?? calendarPathCell(forecasts, week)
    ?? monthlyContextCell(forecasts, week)
    ?? { direction: "待补", sourceKind: "MISSING", sourceLabel: "待补完整周卦", summary: "该周尚无可追溯完整周卦，不从长周期硬拆方向。", forecastId: null };
}

function directionSide(direction: string): "BULL" | "NEUTRAL" | "BEAR" {
  if (/上涨|先跌后涨/u.test(direction)) return "BULL";
  if (/下跌|先涨后跌/u.test(direction)) return "BEAR";
  return "NEUTRAL";
}

export function buildSectorResonanceBoard(): {
  asOf: string;
  weeks: SectorResonanceWeek[];
  rows: SectorResonanceRow[];
  summaries: SectorWeekSummary[];
} {
  const rows = SECTOR_RESONANCE_ASSETS_20260825.map((definition) => {
    const forecasts = forecastsFor(definition);
    const annual = getAnnualForecastRoadmap2026(definition.assetId);
    return {
      assetId: definition.assetId,
      name: definition.name,
      symbol: definition.symbol,
      group: definition.group,
      annualDirection: annual?.annualDirection ?? null,
      annualMonthPath: annual?.months.map((item) => `${Number(item.month.slice(5))}月${item.direction}`).join(" → ") ?? "独立年卦待补",
      longCycle: annual?.remainingYearPath ?? definition.longCycle,
      cells: SECTOR_RESONANCE_WEEKS_20260825.map((week) => cellFor(forecasts, week)),
    } satisfies SectorResonanceRow;
  });

  const summaries = SECTOR_RESONANCE_GROUP_ORDER.flatMap((group) =>
    SECTOR_RESONANCE_WEEKS_20260825.map((week, weekIndex) => {
      const cells = rows.filter((row) => row.group === group).map((row) => row.cells[weekIndex]!);
      const exactCells = cells.filter((cell) => cell.sourceKind === "WEEKLY");
      const sides = exactCells.map((cell) => directionSide(cell.direction));
      const bull = sides.filter((side) => side === "BULL").length;
      const neutral = sides.filter((side) => side === "NEUTRAL").length;
      const bear = sides.filter((side) => side === "BEAR").length;
      const exact = exactCells.length;
      const dominant = Math.max(bull, neutral, bear);
      const share = exact ? dominant / exact : 0;
      const status: SectorWeekSummary["status"] = exact < 2 ? "INSUFFICIENT" : share >= 0.75 && exact >= 3 ? "HIGH" : share >= 0.6 ? "MEDIUM" : "DIVERGENT";
      const sideLabel = dominant === bull ? "偏多" : dominant === bear ? "偏空" : "震荡";
      const label = status === "HIGH" ? `强共振·${sideLabel}` : status === "MEDIUM" ? `中等共振·${sideLabel}` : status === "DIVERGENT" ? "明显分化" : "周卦待补";
      return { group, weekStart: week.start, status, label, bull, neutral, bear, exact } satisfies SectorWeekSummary;
    })
  );

  return { asOf: "2026-08-25", weeks: SECTOR_RESONANCE_WEEKS_20260825, rows, summaries };
}
