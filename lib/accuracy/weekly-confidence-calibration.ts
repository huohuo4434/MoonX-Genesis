export const HIGH_WEEKLY_CONFIDENCE_MIN = 75;
export const STANDARD_WEEKLY_CONFIDENCE_MIN = 60;

export type WeeklyConfidenceBand = "HIGH" | "STANDARD" | "LOW" | "UNRATED";
export type WeeklyConfidenceCalibrationState =
  | "INSUFFICIENT_SAMPLE"
  | "OUTPERFORMS"
  | "NO_CLEAR_EDGE"
  | "UNDERPERFORMS";

export type WeeklyConfidenceSample = {
  result: string;
  confidence: number | null;
  directionMatched: boolean;
};

export type WeeklyConfidenceBandStats = {
  band: WeeklyConfidenceBand;
  sampleSize: number;
  full: number;
  partial: number;
  miss: number;
  exactAccuracyPct: number | null;
  weightedAccuracyPct: number | null;
  directionAccuracyPct: number | null;
};

export type WeeklyConfidenceCalibration = {
  highConfidenceMin: number;
  standardConfidenceMin: number;
  ratedSampleSize: number;
  highConfidenceCoveragePct: number | null;
  comparisonSampleSize: number;
  highConfidenceLiftPct: number | null;
  state: WeeklyConfidenceCalibrationState;
  bands: WeeklyConfidenceBandStats[];
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function weeklyConfidenceBand(confidence: number | null): WeeklyConfidenceBand {
  if (confidence == null || !Number.isFinite(confidence)) return "UNRATED";
  if (confidence >= HIGH_WEEKLY_CONFIDENCE_MIN) return "HIGH";
  if (confidence >= STANDARD_WEEKLY_CONFIDENCE_MIN) return "STANDARD";
  return "LOW";
}

function summarizeBand(band: WeeklyConfidenceBand, samples: WeeklyConfidenceSample[]): WeeklyConfidenceBandStats {
  const eligible = samples.filter((sample) => weeklyConfidenceBand(sample.confidence) === band &&
    ["FULL_HIT", "PARTIAL_HIT", "MISS"].includes(sample.result));
  const full = eligible.filter((sample) => sample.result === "FULL_HIT").length;
  const partial = eligible.filter((sample) => sample.result === "PARTIAL_HIT").length;
  const miss = eligible.filter((sample) => sample.result === "MISS").length;
  return {
    band,
    sampleSize: eligible.length,
    full,
    partial,
    miss,
    exactAccuracyPct: eligible.length ? round1(full / eligible.length * 100) : null,
    weightedAccuracyPct: eligible.length ? round1((full + partial * 0.5) / eligible.length * 100) : null,
    directionAccuracyPct: eligible.length ? round1(eligible.filter((sample) => sample.directionMatched).length / eligible.length * 100) : null,
  };
}

export function buildWeeklyConfidenceCalibration(samples: WeeklyConfidenceSample[]): WeeklyConfidenceCalibration {
  const bands = (["HIGH", "STANDARD", "LOW", "UNRATED"] as const).map((band) => summarizeBand(band, samples));
  const high = bands[0]!;
  const comparison = bands.slice(1, 3);
  const ratedSampleSize = bands.slice(0, 3).reduce((sum, band) => sum + band.sampleSize, 0);
  const comparisonSampleSize = comparison.reduce((sum, band) => sum + band.sampleSize, 0);
  const comparisonPoints = comparison.reduce((sum, band) => sum + band.full + band.partial * 0.5, 0);
  const comparisonAccuracy = comparisonSampleSize ? comparisonPoints / comparisonSampleSize * 100 : null;
  const lift = high.weightedAccuracyPct != null && comparisonAccuracy != null
    ? round1(high.weightedAccuracyPct - comparisonAccuracy)
    : null;
  const enough = high.sampleSize >= 5 && comparisonSampleSize >= 5;
  const state: WeeklyConfidenceCalibrationState = !enough || lift == null
    ? "INSUFFICIENT_SAMPLE"
    : lift >= 5
      ? "OUTPERFORMS"
      : lift <= -5
        ? "UNDERPERFORMS"
        : "NO_CLEAR_EDGE";

  return {
    highConfidenceMin: HIGH_WEEKLY_CONFIDENCE_MIN,
    standardConfidenceMin: STANDARD_WEEKLY_CONFIDENCE_MIN,
    ratedSampleSize,
    highConfidenceCoveragePct: ratedSampleSize ? round1(high.sampleSize / ratedSampleSize * 100) : null,
    comparisonSampleSize,
    highConfidenceLiftPct: lift,
    state,
    bands,
  };
}
