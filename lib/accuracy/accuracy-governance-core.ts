export const ACCURACY_GOVERNANCE_VERSION = "ACCURACY_GOVERNANCE_V1";
export const DAILY_STABLE_SAMPLE_SIZE = 30;
export const WEEKLY_STABLE_SAMPLE_SIZE = 12;
export const ASSET_RANK_MIN_SAMPLE_SIZE = 5;
export const STAR_BUCKET_MIN_SAMPLE_SIZE = 10;
export const PARTIAL_HIT_WEIGHT = 0.5;

export type AccuracySampleMaturity = {
  state: "BUILDING" | "STABLE";
  sampleSize: number;
  stableAt: number;
  remaining: number;
};

export function accuracySampleMaturity(sampleSize: number, stableAt: number): AccuracySampleMaturity {
  const safeSample = Math.max(0, Math.trunc(sampleSize));
  const safeStableAt = Math.max(1, Math.trunc(stableAt));
  return {
    state: safeSample >= safeStableAt ? "STABLE" : "BUILDING",
    sampleSize: safeSample,
    stableAt: safeStableAt,
    remaining: Math.max(0, safeStableAt - safeSample),
  };
}

export function weightedAccuracy(input: { full: number; partial: number; miss: number }): number | null {
  const denominator = input.full + input.partial + input.miss;
  return denominator > 0 ? (input.full + input.partial * PARTIAL_HIT_WEIGHT) / denominator : null;
}

export function exactAccuracy(input: { full: number; partial: number; miss: number }): number | null {
  const denominator = input.full + input.partial + input.miss;
  return denominator > 0 ? input.full / denominator : null;
}

export function isLockedBeforeCutoff(input: {
  publishedAt: string;
  cutoffAt: string;
  status: string;
  isSystemTest?: boolean;
}): boolean {
  if (input.isSystemTest || input.status === "draft" || input.status === "invalid") return false;
  const publishedAt = Date.parse(input.publishedAt);
  const cutoffAt = Date.parse(input.cutoffAt);
  return Number.isFinite(publishedAt) && Number.isFinite(cutoffAt) && publishedAt <= cutoffAt;
}
