/**
 * Transparent MoonX Weighted Research Score engine.
 *
 * weightedContribution = directionScore × (weight/100) × (confidence/100)
 * Final score = clamp(sum(contributions) / sum(weight×confidence) × 100, -100, 100)
 *             when factors exist; otherwise falls back to editorial rawScore / direction.
 *
 * This is an editorial research synthesis — not a statistically proven probability.
 */
import type { MoonXFrameworkFactor } from "./types";

export function clampScore(value: number, min = -100, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

export function directionToFallbackScore(
  direction: "strong-bullish" | "bullish" | "neutral" | "bearish" | "strong-bearish" | "watch"
): number {
  switch (direction) {
    case "strong-bullish":
      return 75;
    case "bullish":
      return 45;
    case "neutral":
    case "watch":
      return 0;
    case "bearish":
      return -45;
    case "strong-bearish":
      return -75;
  }
}

/**
 * Calculate MoonX Weighted Research Score from framework factors.
 * Returns a value in [-100, 100].
 */
export function calculateWeightedResearchScore(
  factors: MoonXFrameworkFactor[],
  fallback: { rawScore?: number; direction: Parameters<typeof directionToFallbackScore>[0] }
): number {
  const active = factors.filter((f) => f.status !== "Failed" && f.weight > 0);

  if (active.length === 0) {
    if (typeof fallback.rawScore === "number") return clampScore(fallback.rawScore);
    return directionToFallbackScore(fallback.direction);
  }

  let weightedSum = 0;
  let weightSum = 0;

  for (const factor of active) {
    const weightAdj = factor.weight / 100;
    const confidenceAdj = factor.confidence / 100;
    const contribution = factor.directionScore * weightAdj * confidenceAdj;
    weightedSum += contribution;
    weightSum += weightAdj * confidenceAdj;
  }

  if (weightSum <= 0) {
    if (typeof fallback.rawScore === "number") return clampScore(fallback.rawScore);
    return directionToFallbackScore(fallback.direction);
  }

  // Normalize so a full-weight, full-confidence +100 factor → +100.
  return clampScore(weightedSum / weightSum);
}

/** Normalize base/bull/bear weights so they always total exactly 100. */
export function normalizeScenarioWeights(weights: { base: number; bull: number; bear: number }): {
  base: number;
  bull: number;
  bear: number;
} {
  const total = weights.base + weights.bull + weights.bear;
  if (total <= 0) {
    return { base: 50, bull: 25, bear: 25 };
  }
  const base = Math.round((weights.base / total) * 100);
  const bull = Math.round((weights.bull / total) * 100);
  const bear = 100 - base - bull;
  return { base, bull, bear };
}
