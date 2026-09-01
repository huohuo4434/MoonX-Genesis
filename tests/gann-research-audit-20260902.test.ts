import assert from "node:assert/strict";
import test from "node:test";
import { GANN_AUDIT_SAMPLES, GANN_RESEARCH_AUDIT, summarizeGannAudit } from "../lib/data/gann-research-audit-20260902";

test("Gann audit preserves the full, partial and failed samples", () => {
  assert.deepEqual(summarizeGannAudit(), {
    sampleSize: 14,
    full: 9,
    partial: 3,
    miss: 2,
    weightedAccuracyPct: 75,
  });
  assert.equal(GANN_RESEARCH_AUDIT.recommendedResearchWeightPct, 3);
});

test("every scored sample remains source locked", () => {
  assert.equal(new Set(GANN_AUDIT_SAMPLES.map((sample) => sample.id)).size, GANN_AUDIT_SAMPLES.length);
  for (const sample of GANN_AUDIT_SAMPLES) {
    assert.match(sample.sourceUrl, /^https:\/\/x\.com\/BTCTW0\/status\/\d+$/);
    assert.ok(sample.forecast.length > 10);
    assert.ok(sample.outcome.length > 10);
  }
});

test("the research weight cannot own direction or execution", () => {
  assert.equal(GANN_RESEARCH_AUDIT.authority, "TIMING_AND_LEVELS_ONLY");
  assert.ok(GANN_RESEARCH_AUDIT.recommendedResearchWeightPct <= 3);
});
