import { scoreWeeklyVerification } from "@/lib/verification/weekly-verification-core";
import type { WeeklyAccuracyPublicItem } from "@/lib/accuracy/get-weekly-history";
import type { WeeklyAnalysisRecord, WeeklySourceOpinionKey } from "@/types/weekly-analysis";

export type WeeklySourcePerformanceRow = {
  sourceKey: WeeklySourceOpinionKey;
  publicLabel: string;
  roleLabel: string;
  attributableSamples: number;
  linkedOnlySamples: number;
  full: number;
  partial: number;
  miss: number;
  weightedAccuracyPct: number | null;
  adjustedReliabilityPct: number | null;
  minimumSamples: number;
  state: "TIMING_ONLY" | "LEARNING" | "ELIGIBLE";
  confidenceAdjustmentPct: number;
  authorityBoundary: string;
};

const MINIMUM_SAMPLES = 10;

const SOURCE_META: Readonly<Record<WeeklySourceOpinionKey, Pick<WeeklySourcePerformanceRow, "publicLabel" | "roleLabel" | "authorityBoundary">>> = Object.freeze({
  BINGWU_LIUYAO: {
    publicLabel: "核心六爻研究源",
    roleLabel: "周方向／路径",
    authorityBoundary: "唯一第一优先级不因单周输赢改变；成绩用于调整置信度和识别需要复核的资产或结构。",
  },
  WOLF_LIUYAO: {
    publicLabel: "六爻研究源A",
    roleLabel: "周方向／路径",
    authorityBoundary: "与站内自研六爻同级；成绩只能形成发布前的资产专项先验，冲突仍按严格交叉验证裁决。",
  },
  USER_LIUYAO: {
    publicLabel: "站内自研六爻",
    roleLabel: "周方向／路径",
    authorityBoundary: "与六爻研究源A同级；成绩只能形成发布前的资产专项先验，不能倒改已锁定预测。",
  },
  QIMEN_TIMING: {
    publicLabel: "奇门择时研究源",
    roleLabel: "关键日／节奏",
    authorityBoundary: "只验证关键日和节奏，不参与周方向胜率，也不能独立翻转六爻正式方向。",
  },
});

function sourceKeyFromId(sourceId: string): WeeklySourceOpinionKey | null {
  const id = sourceId.trim().toUpperCase();
  if (/WU[-_:]?QIMEN|QIMEN/.test(id)) return "QIMEN_TIMING";
  if (/^(T01|BINGWU)|[-_:]T01[-_:]/.test(id)) return "BINGWU_LIUYAO";
  if (/^(T02|TEACHER02|WOLF)|[-_:](T02|TEACHER02|WOLF)[-_:]/.test(id)) return "WOLF_LIUYAO";
  if (/MOOX[-_:]?USER|USER[-_:]?CAST|^ORACLE[-_:]/.test(id)) return "USER_LIUYAO";
  return null;
}

function newestMatchingAnalysis(item: WeeklyAccuracyPublicItem, analyses: WeeklyAnalysisRecord[]): WeeklyAnalysisRecord | null {
  return analyses
    .filter((analysis) => analysis.assetId === item.assetId && analysis.weekStart === item.weekStart && analysis.weekEnd === item.weekEnd)
    .sort((a, b) => b.version - a.version || b.publishedAt.localeCompare(a.publishedAt))[0] ?? null;
}

function validForwardSnapshot(input: {
  sourceKey: WeeklySourceOpinionKey;
  sourceRecordId: string;
  role: "DIRECTION" | "TIMING";
  direction?: string;
  lockedAt: string;
}, weekStart: string, sourceIds: readonly string[]): boolean {
  const lockedAt = new Date(input.lockedAt);
  const startsAt = new Date(`${weekStart}T00:00:00.000Z`);
  if (!input.sourceRecordId.trim() || !sourceIds.includes(input.sourceRecordId)) return false;
  if (!Number.isFinite(lockedAt.getTime()) || lockedAt.getTime() >= startsAt.getTime()) return false;
  if (input.sourceKey === "QIMEN_TIMING") return input.role === "TIMING" && !input.direction;
  return input.role === "DIRECTION" && Boolean(input.direction?.trim());
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function buildWeeklySourcePerformance(input: {
  history: WeeklyAccuracyPublicItem[];
  analyses: WeeklyAnalysisRecord[];
}): WeeklySourcePerformanceRow[] {
  const counters = new Map<WeeklySourceOpinionKey, { full: number; partial: number; miss: number; linked: Set<string>; scored: Set<string> }>();
  for (const key of Object.keys(SOURCE_META) as WeeklySourceOpinionKey[]) {
    counters.set(key, { full: 0, partial: 0, miss: 0, linked: new Set(), scored: new Set() });
  }

  for (const item of input.history) {
    if (!item.actualPattern || ["PENDING", "UNVERIFIABLE"].includes(item.result)) continue;
    const analysis = newestMatchingAnalysis(item, input.analyses);
    if (!analysis) continue;
    const sourceIds = analysis.sourceIds ?? [];
    const sampleKey = `${item.id}:${item.weekStart}:${item.weekEnd}`;
    for (const sourceId of sourceIds) {
      const key = sourceKeyFromId(sourceId);
      if (key) counters.get(key)!.linked.add(sampleKey);
    }
    for (const opinion of analysis.sourceOpinions ?? []) {
      if (!validForwardSnapshot(opinion, item.weekStart, sourceIds)) continue;
      const counter = counters.get(opinion.sourceKey)!;
      counter.linked.add(sampleKey);
      if (opinion.sourceKey === "QIMEN_TIMING") continue;
      const independentPattern = opinion.path?.trim() || opinion.direction!;
      const result = scoreWeeklyVerification(independentPattern, item.actualPattern).result;
      const scoreKey = `${sampleKey}:${opinion.sourceKey}`;
      if (counter.scored.has(scoreKey)) continue;
      counter.scored.add(scoreKey);
      if (result === "FULL_HIT") counter.full += 1;
      else if (result === "PARTIAL_HIT") counter.partial += 1;
      else counter.miss += 1;
    }
  }

  return (Object.keys(SOURCE_META) as WeeklySourceOpinionKey[]).map((sourceKey) => {
    const meta = SOURCE_META[sourceKey];
    const counter = counters.get(sourceKey)!;
    const attributableSamples = counter.full + counter.partial + counter.miss;
    const points = counter.full + counter.partial * 0.5;
    const weightedAccuracyPct = attributableSamples ? round1(points / attributableSamples * 100) : null;
    // Beta(2,2) shrinkage prevents a tiny winning streak from becoming a large weight.
    const adjustedReliabilityPct = attributableSamples ? round1((points + 2) / (attributableSamples + 4) * 100) : null;
    const eligible = sourceKey !== "QIMEN_TIMING" && attributableSamples >= MINIMUM_SAMPLES;
    const confidenceAdjustmentPct = eligible && adjustedReliabilityPct != null
      ? Math.max(-5, Math.min(5, Math.round((adjustedReliabilityPct - 50) / 5)))
      : 0;
    return {
      sourceKey,
      ...meta,
      attributableSamples,
      linkedOnlySamples: Math.max(0, counter.linked.size - attributableSamples),
      full: counter.full,
      partial: counter.partial,
      miss: counter.miss,
      weightedAccuracyPct,
      adjustedReliabilityPct,
      minimumSamples: MINIMUM_SAMPLES,
      state: sourceKey === "QIMEN_TIMING" ? "TIMING_ONLY" : eligible ? "ELIGIBLE" : "LEARNING",
      confidenceAdjustmentPct,
    };
  });
}
