import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  ASSET_RANK_MIN_SAMPLE_SIZE,
  DAILY_STABLE_SAMPLE_SIZE,
  STAR_BUCKET_MIN_SAMPLE_SIZE,
  WEEKLY_STABLE_SAMPLE_SIZE,
  accuracySampleMaturity,
  exactAccuracy,
  isLockedBeforeCutoff,
  weightedAccuracy,
} from "../lib/accuracy/accuracy-governance-core";

test("accuracy governance centralizes sample thresholds and exact/weighted formulas", () => {
  assert.equal(DAILY_STABLE_SAMPLE_SIZE, 30);
  assert.equal(WEEKLY_STABLE_SAMPLE_SIZE, 12);
  assert.equal(ASSET_RANK_MIN_SAMPLE_SIZE, 5);
  assert.equal(STAR_BUCKET_MIN_SAMPLE_SIZE, 10);
  assert.deepEqual(accuracySampleMaturity(11, WEEKLY_STABLE_SAMPLE_SIZE), {
    state: "BUILDING",
    sampleSize: 11,
    stableAt: 12,
    remaining: 1,
  });
  assert.equal(exactAccuracy({ full: 2, partial: 1, miss: 1 }), 0.5);
  assert.equal(weightedAccuracy({ full: 2, partial: 1, miss: 1 }), 0.625);
  assert.equal(weightedAccuracy({ full: 0, partial: 0, miss: 0 }), null);
});

test("only a non-test forecast locked by its declared cutoff is eligible", () => {
  const base = {
    publishedAt: "2026-08-01T15:00:00.000Z",
    cutoffAt: "2026-08-01T16:00:00.000Z",
    status: "published",
  };
  assert.equal(isLockedBeforeCutoff(base), true);
  assert.equal(isLockedBeforeCutoff({ ...base, publishedAt: "2026-08-01T16:00:01.000Z" }), false);
  assert.equal(isLockedBeforeCutoff({ ...base, status: "draft" }), false);
  assert.equal(isLockedBeforeCutoff({ ...base, isSystemTest: true }), false);
});

test("weekly scoring upgrades are explicit, versioned and append-only", () => {
  const runner = readFileSync(resolve("lib/verification/run-weekly.ts"), "utf8");
  const schema = readFileSync(resolve("prisma/schema.prisma"), "utf8");
  const migration = readFileSync(resolve("prisma/migrations/20260827030000_accuracy_governance_v1/migration.sql"), "utf8");
  assert.match(runner, /existing\.scoreVersion === WEEKLY_SCORE_VERSION/);
  assert.match(runner, /existing\.scoreVersion !== WEEKLY_SCORE_VERSION && !options\.force/);
  assert.match(runner, /weeklyVerificationRecord\.updateMany/);
  assert.match(runner, /scoreVersion: existing\.scoreVersion/);
  assert.match(runner, /if \(changed\.count !== 1\) return null/);
  assert.match(runner, /isConcurrentInsertConflict/);
  assert.match(runner, /code === "P2002"/);
  assert.match(runner, /weeklyVerificationRevision\.upsert/);
  assert.match(schema, /model WeeklyVerificationRevision/);
  assert.match(schema, /@@unique\(\[weeklyAnalysisId, scoreVersion\]\)/);
  assert.match(migration, /ON CONFLICT \("weeklyAnalysisId", "scoreVersion"\) DO NOTHING/);
  assert.match(migration, /WHERE "result" <> 'PENDING'/);
});
