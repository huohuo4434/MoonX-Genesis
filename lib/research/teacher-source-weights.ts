import { listAllWeeklyAnalyses } from "@/lib/data/weekly-analysis";
import { buildTeacher02Rev322PathCalibration, type Teacher02Rev322PathCalibration } from "@/lib/research/teacher02-rev322";
import { deriveForwardValidatedWeight, type ForwardMethodSample } from "@/lib/research/method-evidence-input-core";
import type { ResearchDirection, ResearchRecord } from "@/types/research";

export type TeacherBlendAssetId = "ethereum" | "nasdaq-100" | "sp500" | "gold" | "silver";
export type TeacherBlendLean = "UP" | "DOWN" | "FLAT";
export type TeacherBlendAlignment = "aligned" | "partial" | "conflict";

export type TeacherSourceWeightProfile = {
  assetId: TeacherBlendAssetId;
  symbol: string;
  label: string;
  teacher01WeightPct: number;
  teacher02WeightPct: number;
  moonxExtensionWeightPct: number;
  note: string;
};

export const TEACHER_SOURCE_WEIGHT_PROFILES: TeacherSourceWeightProfile[] = [
  {
    assetId: "gold",
    symbol: "GOLD",
    label: "黄金",
    teacher01WeightPct: 55,
    teacher02WeightPct: 35,
    moonxExtensionWeightPct: 10,
    note: "老师02在黄金上提高权重；累计至少10个正式样本后再按真实命中率调整。",
  },
  {
    assetId: "silver",
    symbol: "SILVER",
    label: "白银",
    teacher01WeightPct: 60,
    teacher02WeightPct: 30,
    moonxExtensionWeightPct: 10,
    note: "方向参考价值较高，但白银波动大于黄金。",
  },
  {
    assetId: "nasdaq-100",
    symbol: "NDX",
    label: "纳斯达克100",
    teacher01WeightPct: 65,
    teacher02WeightPct: 25,
    moonxExtensionWeightPct: 10,
    note: "用于补充周内下探、修复和回吐窗口。",
  },
  {
    assetId: "ethereum",
    symbol: "ETH",
    label: "以太坊",
    teacher01WeightPct: 75,
    teacher02WeightPct: 15,
    moonxExtensionWeightPct: 10,
    note: "仅作为高波动路径修订，不允许单独触发开仓。",
  },
  {
    assetId: "sp500",
    symbol: "SPX",
    label: "标普500",
    teacher01WeightPct: 80,
    teacher02WeightPct: 10,
    moonxExtensionWeightPct: 10,
    note: "当前与主路径顺序分歧明显，因此只保留低权重。",
  },
];

const DAILY_KEY_TO_ASSET: Record<string, TeacherBlendAssetId | undefined> = {
  ETH: "ethereum",
  NDX: "nasdaq-100",
  SPX: "sp500",
  GLD: "gold",
  SILVER: "silver",
};

const WEEKLY_ASSET_ALIASES: Record<TeacherBlendAssetId, string[]> = {
  ethereum: ["ethereum", "eth"],
  "nasdaq-100": ["nasdaq-100"],
  sp500: ["sp500"],
  gold: ["gold"],
  silver: ["silver"],
};

const RESEARCH_DIRECTION_VALUE: Record<ResearchDirection, number> = {
  "strong-bullish": 1,
  bullish: 0.75,
  "slightly-bullish": 0.35,
  neutral: 0,
  "slightly-bearish": -0.35,
  bearish: -0.75,
  "strong-bearish": -1,
  "insufficient-evidence": 0,
};

function pathDirectionValue(text: string): number {
  const value = text.trim();
  if (/先跌后涨|探底回升|震荡上涨|偏多|上涨|修复/.test(value) && !/先涨后跌|冲高回落/.test(value)) return 0.55;
  if (/先涨后跌|冲高回落|震荡下跌|偏空|下跌/.test(value)) return -0.55;
  return 0;
}

function leanFromScore(score: number): TeacherBlendLean {
  if (score >= 0.15) return "UP";
  if (score <= -0.15) return "DOWN";
  return "FLAT";
}

function sign(value: number): -1 | 0 | 1 {
  if (value > 0.08) return 1;
  if (value < -0.08) return -1;
  return 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function teacherBlendAssetIdForDailyKey(assetKey: string): TeacherBlendAssetId | null {
  return DAILY_KEY_TO_ASSET[assetKey.toUpperCase()] ?? null;
}

export function getTeacherSourceWeightProfile(assetId: string): TeacherSourceWeightProfile | null {
  return TEACHER_SOURCE_WEIGHT_PROFILES.find((item) => item.assetId === assetId) ?? null;
}

export type TeacherSourceBlendResult = {
  assetId: TeacherBlendAssetId;
  profile: TeacherSourceWeightProfile;
  lean: TeacherBlendLean;
  weightedDirection: number;
  confidence: number;
  alignment: TeacherBlendAlignment;
  teacher01Direction: string;
  teacher01Score: number;
  teacher01RecordId: string;
  teacher01EffectiveWeightPct: number;
  teacher02Direction: ResearchDirection;
  teacher02Score: number;
  teacher02RecordId: string;
  teacher02EffectiveWeightPct: number;
  teacher02ForwardSamples: number;
  directionalWeightPct: number;
  moonxPathWeightPct: number;
  publicSummary: string;
  adminSummary: string;
  sourceIds: string[];
  canTriggerTradeAlone: false;
  rev322Calibration: Teacher02Rev322PathCalibration | null;
};

export function buildTeacherSourceBlend(input: {
  assetId: TeacherBlendAssetId;
  asOfDate: string;
  records: ResearchRecord[];
}): TeacherSourceBlendResult | null {
  const profile = getTeacherSourceWeightProfile(input.assetId);
  if (!profile) return null;

  const aliases = WEEKLY_ASSET_ALIASES[input.assetId];
  const weekly = listAllWeeklyAnalyses()
    .filter(
      (item) =>
        aliases.includes(item.assetId) &&
        item.weekStart <= input.asOfDate &&
        item.weekEnd >= input.asOfDate &&
        item.status === "published"
    )
    .sort((a, b) => (b.version ?? 1) - (a.version ?? 1))[0];
  if (!weekly) return null;

  const teacher02 = input.records.find(
    (record) =>
      record.assetId === input.assetId &&
      record.tags.includes("source:teacher02") &&
      record.status === "active" &&
      (!record.forecastStart || record.forecastStart <= input.asOfDate) &&
      (!record.forecastEnd || record.forecastEnd >= input.asOfDate) &&
      (!record.expiresAt || new Date(`${input.asOfDate}T12:00:00+08:00`).getTime() < new Date(record.expiresAt).getTime())
  );
  if (!teacher02) return null;

  const rev322Calibration = buildTeacher02Rev322PathCalibration({
    assetId: input.assetId,
    forecastStart: teacher02.forecastStart,
    forecastEnd: teacher02.forecastEnd,
  });

  const teacher01Score = pathDirectionValue(`${weekly.overallDirection} ${weekly.weeklyPath}`);
  const teacher02Score = RESEARCH_DIRECTION_VALUE[teacher02.direction];
  const forwardSamplesBySource = new Map<string, ForwardMethodSample>();
  for (const record of input.records
    .filter((record) =>
      record.assetId === input.assetId &&
      record.tags.includes("source:teacher02") &&
      record.sourcePublishedAtVerified === true
    )
    .map((record) => {
      const conclusion = record.verificationResult?.conclusion?.zhCN ?? "";
      const result: ForwardMethodSample["result"] = !record.verificationResult?.scoreEligible
        ? "UNVERIFIABLE"
        : /部分命中/.test(conclusion)
          ? "PARTIAL_HIT"
          : /未命中/.test(conclusion)
            ? "MISS"
            : /完全命中|方向命中|命中/.test(conclusion)
              ? "FULL_HIT"
              : "UNVERIFIABLE";
      return {
        sourceId: record.id,
        market: record.market,
        horizon: record.tags.find((tag) => tag.startsWith("horizon:"))?.slice(8).toUpperCase() ?? "UNCLASSIFIED",
        regime: record.tags.find((tag) => tag.startsWith("regime:"))?.slice(7) ?? "UNCLASSIFIED",
        sourcePublishedAt: record.sourcePublishedAt ?? "",
        lockedAt: record.ingestedAt ?? record.publishedAt,
        forecastStart: record.forecastStart ?? "",
        scoreEligible: record.verificationEligibility === "formal" && record.verificationResult?.scoreEligible === true,
        result,
      };
    })) {
    if (!forwardSamplesBySource.has(record.sourceId)) forwardSamplesBySource.set(record.sourceId, record);
  }
  const forwardSamples = Array.from(forwardSamplesBySource.values());
  const dynamicWeight = deriveForwardValidatedWeight({
    baseWeightPct: profile.teacher02WeightPct,
    maxWeightPct: 100 - profile.moonxExtensionWeightPct,
    samples: forwardSamples,
    scope: { market: teacher02.market, horizon: "WEEK", regime: teacher02.tags.find((tag) => tag.startsWith("regime:"))?.slice(7) ?? "UNCLASSIFIED" },
  });
  const teacher02EffectiveWeightPct = dynamicWeight.effectiveWeightPct;
  const teacher01EffectiveWeightPct = 100 - profile.moonxExtensionWeightPct - teacher02EffectiveWeightPct;
  const directionalWeightPct = teacher01EffectiveWeightPct + teacher02EffectiveWeightPct;
  const blendedWeightedDirection =
    directionalWeightPct > 0
      ? (teacher01Score * teacher01EffectiveWeightPct + teacher02Score * teacher02EffectiveWeightPct) /
        directionalWeightPct
      : 0;
  const teacher01Sign = sign(teacher01Score);
  const teacher02Sign = sign(teacher02Score);
  const alignment: TeacherBlendAlignment =
    teacher01Sign !== 0 && teacher01Sign === teacher02Sign
      ? "aligned"
      : teacher01Sign !== 0 && teacher02Sign !== 0 && teacher01Sign !== teacher02Sign
        ? "conflict"
        : "partial";
  const weightedDirection = alignment === "conflict" ? 0 : blendedWeightedDirection;
  const confidence = clamp(
    Math.round(52 + Math.abs(weightedDirection) * 24 + (alignment === "aligned" ? 8 : alignment === "conflict" ? -8 : 0)),
    40,
    78
  );
  const publicSummary =
    alignment === "aligned"
      ? "主六爻与辅助六爻在当前区间方向大体一致，关键窗口仍需价格结构确认。"
      : alignment === "conflict"
        ? "主六爻与辅助六爻的周内路径存在分歧，维持主体系方向并降低追涨杀跌力度。"
        : "辅助六爻主要用于补充时间窗口，暂不单独改变主方向。";
  const adminSummary = `${profile.label}：主方法有效权重 ${teacher01EffectiveWeightPct}%／辅助方法有效权重 ${teacher02EffectiveWeightPct}%（同市场、周周期、同环境正式前瞻样本 ${dynamicWeight.eligibleSamples}/${dynamicWeight.minimumSamples}）／路径校准 ${profile.moonxExtensionWeightPct}%；当前${alignment === "aligned" ? "方向一致" : alignment === "conflict" ? "方向冲突，默认观望" : "部分一致"}。${rev322Calibration ? ` ${rev322Calibration.summary}` : ""}`;

  return {
    assetId: input.assetId,
    profile,
    lean: alignment === "conflict" ? "FLAT" : leanFromScore(weightedDirection),
    weightedDirection,
    confidence,
    alignment,
    teacher01Direction: weekly.overallDirection,
    teacher01Score,
    teacher01RecordId: weekly.id,
    teacher01EffectiveWeightPct,
    teacher02Direction: teacher02.direction,
    teacher02Score,
    teacher02RecordId: teacher02.id,
    teacher02EffectiveWeightPct,
    teacher02ForwardSamples: dynamicWeight.eligibleSamples,
    directionalWeightPct,
    moonxPathWeightPct: profile.moonxExtensionWeightPct,
    publicSummary,
    adminSummary,
    sourceIds: [weekly.id, teacher02.id],
    canTriggerTradeAlone: false,
    rev322Calibration,
  };
}

export function summarizeTeacher02Verification(records: ResearchRecord[]) {
  const teacher02 = records.filter((record) => record.tags.includes("source:teacher02"));
  const completed = Array.from(new Map(teacher02.filter((record) =>
    record.verificationEligibility === "formal" &&
    record.sourcePublishedAtVerified === true &&
    record.verificationResult?.scoreEligible === true &&
    Boolean(record.forecastStart) &&
    Boolean(record.sourcePublishedAt) &&
    Boolean(record.ingestedAt) &&
    new Date(record.sourcePublishedAt!).getTime() < new Date(`${record.forecastStart}T00:00:00.000Z`).getTime() &&
    new Date(record.ingestedAt!).getTime() < new Date(`${record.forecastStart}T00:00:00.000Z`).getTime()
  ).map((record) => [record.id, record])).values());
  const directionHits = completed.filter((record) => {
    const conclusion = record.verificationResult?.conclusion?.zhCN ?? "";
    return /方向命中|完全命中|命中/.test(conclusion) && !/未命中/.test(conclusion);
  }).length;
  return {
    totalForwardSamples: teacher02.length,
    completedSamples: completed.length,
    pendingSamples: teacher02.length - completed.length,
    directionHitRate: completed.length ? Math.round((directionHits / completed.length) * 1000) / 10 : null,
    goldCompletedSamples: completed.filter((record) => record.assetId === "gold").length,
  };
}
