/**
 * Pure learning helpers — no I/O.
 */
import type { BiasCode, LearningAdjustment, LearningCase } from "@/types/automation";

export function buildSimilarCaseKey(input: {
  assetClass: string;
  horizon?: string;
  direction?: string;
  marketRegime?: string;
  structures?: string[];
}): string {
  const parts = [
    input.assetClass,
    input.horizon ?? "daily",
    input.direction ?? "unknown",
    input.marketRegime ?? "unknown",
    ...(input.structures ?? []).slice(0, 4),
  ];
  return parts
    .map((p) => p.toLowerCase().replace(/\s+/g, "_"))
    .join("|");
}

export function scoreCaseSimilarity(a: string, b: string): number {
  const as = new Set(a.split("|"));
  const bs = new Set(b.split("|"));
  let hit = 0;
  for (const x of as) if (bs.has(x)) hit += 1;
  const den = Math.max(as.size, bs.size, 1);
  return hit / den;
}

export function findSimilarCases(
  cases: LearningCase[],
  key: string,
  limit = 10
): LearningCase[] {
  return [...cases]
    .map((c) => ({ c, score: scoreCaseSimilarity(key, c.similarCaseKey) }))
    .filter((x) => x.score >= 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.c);
}

export function computeLearningAdjustment(similar: LearningCase[]): LearningAdjustment {
  const count = similar.length;
  const hits = similar.filter((c) => c.verdict === "HIT").length;
  const misses = similar.filter((c) => c.verdict === "MISS").length;
  const den = hits + misses;
  const historicalHitRate = den ? hits / den : null;

  const biasCount = new Map<BiasCode, number>();
  for (const c of similar) {
    for (const b of c.interpretationBiases) {
      biasCount.set(b.code, (biasCount.get(b.code) ?? 0) + 1);
    }
  }
  const commonBiases = [...biasCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([code]) => code);

  const topCaution = similar.find((c) => c.futureCaution)?.futureCaution ?? null;

  let confidenceDelta = 0;
  const notes: string[] = [];
  if (count < 3) {
    notes.push("相似案例少于3个：只提醒，不调整置信度。");
  } else if (count < 10) {
    if (historicalHitRate != null && historicalHitRate < 0.4) confidenceDelta = -5;
    else if (historicalHitRate != null && historicalHitRate > 0.7) confidenceDelta = 5;
    notes.push("相似案例3至9个：最多调整置信度5个百分点。");
  } else {
    if (historicalHitRate != null && historicalHitRate < 0.4) confidenceDelta = -10;
    else if (historicalHitRate != null && historicalHitRate > 0.7) confidenceDelta = 10;
    notes.push("相似案例10个以上：最多调整置信度10个百分点。");
  }

  if (count >= 3 && commonBiases.includes("overprecise_daily_timing")) {
    notes.push("历史失败主要来自逐日时间拆解：降低单日时间判断置信度。");
    confidenceDelta = Math.max(confidenceDelta - 3, count >= 10 ? -10 : -5);
  }
  if (
    commonBiases.includes("ignored_progress_regress") ||
    commonBiases.includes("ignored_void_break_tomb")
  ) {
    notes.push("遇到化退/旬空/月破同类结构时显示红色提醒。");
  }
  if (commonBiases.includes("macro_override")) {
    notes.push("历史存在宏观事件覆盖：增加事件风险权重，但不自动反向预测。");
  }

  return {
    similarCaseCount: count,
    historicalHitRate,
    commonBiases,
    topCaution,
    confidenceDelta,
    notes,
  };
}

export function inferBiasesFromMiss(input: {
  predicted: string;
  actual: string;
  sourceType?: string;
  confidence?: number;
}): { code: BiasCode; severity: 1 | 2 | 3; evidence: string }[] {
  const biases: { code: BiasCode; severity: 1 | 2 | 3; evidence: string }[] = [];
  if ((input.confidence ?? 50) >= 70) {
    biases.push({
      code: "insufficient_evidence",
      severity: 2,
      evidence: "高置信度给出强结论但方向未命中，需检查原始依据是否充分。",
    });
  }
  if (input.sourceType === "cycle_derivation") {
    biases.push({
      code: "overprecise_daily_timing",
      severity: 2,
      evidence: "综合判断可能把单日节奏拆得过细。",
    });
  }
  biases.push({
    code: "market_regime_mismatch",
    severity: 1,
    evidence: `预测${input.predicted}与实际${input.actual}不一致，需对照当时趋势/震荡环境。`,
  });
  return biases.slice(0, 3);
}
