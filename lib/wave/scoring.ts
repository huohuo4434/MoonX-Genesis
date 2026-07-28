const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const WAVE_BASE_WEIGHT = 0.05;
export const WAVE_MAX_WEIGHT = 0.22;
export const WAVE_FLOOR_WEIGHT = 0.03;

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
};

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
  } = input;
  if (total <= 0) return baseWeight;
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
  const proposed = baseWeight + (maxWeight - baseWeight) * quality * sampleConfidence * freshnessScore;
  return Number(clamp(proposed, WAVE_FLOOR_WEIGHT, maxWeight).toFixed(4));
}
