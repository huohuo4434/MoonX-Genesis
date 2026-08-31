import test from "node:test";
import assert from "node:assert/strict";
import {
  buildWeeklyConfidenceCalibration,
  weeklyConfidenceBand,
} from "@/lib/accuracy/weekly-confidence-calibration";

test("weekly confidence bands use the published score and keep unrated samples separate", () => {
  assert.equal(weeklyConfidenceBand(75), "HIGH");
  assert.equal(weeklyConfidenceBand(60), "STANDARD");
  assert.equal(weeklyConfidenceBand(59), "LOW");
  assert.equal(weeklyConfidenceBand(null), "UNRATED");

  const result = buildWeeklyConfidenceCalibration([
    { result: "FULL_HIT", confidence: 80, directionMatched: true },
    { result: "PARTIAL_HIT", confidence: 78, directionMatched: true },
    { result: "MISS", confidence: 76, directionMatched: false },
    { result: "FULL_HIT", confidence: 70, directionMatched: true },
    { result: "MISS", confidence: 66, directionMatched: false },
    { result: "PARTIAL_HIT", confidence: 55, directionMatched: true },
    { result: "MISS", confidence: null, directionMatched: false },
    { result: "PENDING", confidence: 82, directionMatched: false },
  ]);

  const high = result.bands.find((band) => band.band === "HIGH")!;
  const unrated = result.bands.find((band) => band.band === "UNRATED")!;
  assert.deepEqual(
    { sampleSize: high.sampleSize, exact: high.exactAccuracyPct, weighted: high.weightedAccuracyPct, direction: high.directionAccuracyPct },
    { sampleSize: 3, exact: 33.3, weighted: 50, direction: 66.7 },
  );
  assert.equal(unrated.sampleSize, 1);
  assert.equal(result.ratedSampleSize, 6);
  assert.equal(result.highConfidenceCoveragePct, 50);
  assert.equal(result.state, "INSUFFICIENT_SAMPLE");
});

test("calibration only claims an advantage after both groups have five completed samples", () => {
  const result = buildWeeklyConfidenceCalibration([
    ...Array.from({ length: 5 }, () => ({ result: "FULL_HIT", confidence: 80, directionMatched: true })),
    ...Array.from({ length: 5 }, () => ({ result: "MISS", confidence: 65, directionMatched: false })),
  ]);
  assert.equal(result.state, "OUTPERFORMS");
  assert.equal(result.highConfidenceLiftPct, 100);
});
