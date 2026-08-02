import type {
  VibeEvidenceDimension,
  VibeEvidenceDimensionKey,
  VibeEvidenceSnapshot,
  VibeEvidenceStance,
} from "@/types/vibe-evidence";

const DIMENSION_META: Record<VibeEvidenceDimensionKey, { labelZh: string; weight: number }> = {
  financialQuality: { labelZh: "财务质量", weight: 30 },
  valuation: { labelZh: "估值位置", weight: 20 },
  capitalPositioning: { labelZh: "资金与筹码", weight: 20 },
  industryStrength: { labelZh: "行业相对强弱", weight: 15 },
  events: { labelZh: "公告与事件", weight: 15 },
};

function clamp(value: number, min = -100, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function stanceFromScore(score: number): VibeEvidenceStance {
  if (score >= 55) return "强烈偏多";
  if (score >= 18) return "偏多";
  if (score <= -55) return "强烈偏空";
  if (score <= -18) return "偏空";
  return "中性";
}

export function makeDimension(input: {
  key: VibeEvidenceDimensionKey;
  score: number;
  available: boolean;
  summary: string;
}): VibeEvidenceDimension {
  const meta = DIMENSION_META[input.key];
  return {
    key: input.key,
    labelZh: meta.labelZh,
    weight: meta.weight,
    score: clamp(Math.round(input.score)),
    available: input.available,
    summary: input.summary,
  };
}

export function calculateVibeScore(input: {
  dimensions: VibeEvidenceDimension[];
  freshness: number;
}): Pick<VibeEvidenceSnapshot, "rawScore" | "effectiveScore" | "completeness" | "freshness" | "stance"> {
  const available = input.dimensions.filter((item) => item.available);
  const availableWeight = available.reduce((sum, item) => sum + item.weight, 0);
  const weighted = available.reduce((sum, item) => sum + item.score * item.weight, 0);
  const rawScore = availableWeight > 0 ? clamp(weighted / availableWeight) : 0;
  const completeness = Math.round((availableWeight / 100) * 100);
  const freshness = clamp(Math.round(input.freshness), 0, 100);
  const effectiveScore = clamp(rawScore * (completeness / 100) * (freshness / 100));
  return {
    rawScore: Math.round(rawScore),
    effectiveScore: Math.round(effectiveScore),
    completeness,
    freshness,
    stance: stanceFromScore(effectiveScore),
  };
}

export function freshnessFromIso(updatedAt: string, now = new Date()): number {
  const parsed = new Date(updatedAt);
  if (Number.isNaN(parsed.getTime())) return 40;
  const ageHours = Math.max(0, (now.getTime() - parsed.getTime()) / 3_600_000);
  if (ageHours <= 24) return 100;
  if (ageHours <= 72) return 90;
  if (ageHours <= 168) return 75;
  if (ageHours <= 720) return 55;
  return 35;
}
