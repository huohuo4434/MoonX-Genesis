/**
 * Wave evidence weight — not a standalone forecast.
 * Default 5%; ≤5%→8, ≤3%→12, ≤1.5%→15, ≤0.5%→20. Cap 20%. Never advertise 22%.
 */
export const WAVE_BASE_WEIGHT = 0.05;
export const WAVE_MAX_WEIGHT = 0.2;
export const WAVE_FLOOR_WEIGHT = 0.05;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export type WaveScoreInput = {
  total: number;
  wins: number;
  partials: number;
  recentWins: number;
  recentPartials: number;
  recentTotal: number;
  averageRewardRisk?: number | null;
  daysSinceLastPrediction?: number;
  baseWeight?: number;
  maxWeight?: number;
  proximityDistancePct?: number | null;
};

export function waveWeightFromProximity(distancePct: number | null | undefined): number {
  if (distancePct == null || !Number.isFinite(distancePct)) return WAVE_BASE_WEIGHT;
  if (distancePct <= 0.5) return 0.2;
  if (distancePct <= 1.5) return 0.15;
  if (distancePct <= 3) return 0.12;
  if (distancePct <= 5) return 0.08;
  return WAVE_BASE_WEIGHT;
}

export function nearestLevelDistancePct(
  price: number | null | undefined,
  levels: Array<number | null | undefined>
): number | null {
  if (price == null || !Number.isFinite(price) || price <= 0) return null;
  const nums = levels.filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  if (!nums.length) return null;
  return Math.min(...nums.map((lvl) => (Math.abs(lvl - price) / price) * 100));
}

export function calculateWaveWeight(input: WaveScoreInput): number {
  const {
    total,
    wins,
    partials,
    recentWins,
    recentPartials,
    recentTotal,
    averageRewardRisk = 1,
    daysSinceLastPrediction = 0,
    baseWeight = WAVE_BASE_WEIGHT,
    maxWeight = WAVE_MAX_WEIGHT,
    proximityDistancePct = null,
  } = input;

  const proximityWeight = waveWeightFromProximity(proximityDistancePct);

  if (total <= 0) {
    return Number(clamp(proximityWeight, WAVE_FLOOR_WEIGHT, maxWeight).toFixed(4));
  }

  const overallRate = (wins + partials * 0.5) / total;
  const recentRate =
    recentTotal > 0 ? (recentWins + recentPartials * 0.5) / recentTotal : overallRate;
  const sampleConfidence = clamp((total - 5) / 55, 0, 1);
  const accuracyScore = clamp((overallRate - 0.5) / 0.35, 0, 1);
  const recentScore = clamp((recentRate - 0.5) / 0.35, 0, 1);
  const rrScore = clamp(((averageRewardRisk ?? 1) - 0.8) / 2.2, 0, 1);
  const freshnessScore =
    daysSinceLastPrediction <= 14
      ? 1
      : clamp(1 - (daysSinceLastPrediction - 14) / 31, 0.25, 1);
  const quality =
    accuracyScore * 0.45 + recentScore * 0.25 + rrScore * 0.15 + sampleConfidence * 0.15;

  // Historical quality may nudge within 5–8% band; proximity unlocks up to 20%.
  const accuracyWeight = baseWeight + (0.08 - baseWeight) * quality * sampleConfidence * freshnessScore;
  const proposed = Math.max(accuracyWeight, proximityWeight);
  return Number(clamp(proposed, WAVE_FLOOR_WEIGHT, maxWeight).toFixed(4));
}
