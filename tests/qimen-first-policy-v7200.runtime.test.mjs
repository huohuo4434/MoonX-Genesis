import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

const root = process.cwd();
const require = createRequire(path.join(root, "package.json"));
const esbuild = require("esbuild");
const policyPath = path.join(root, "lib", "forecasts", "qimen-first-policy.ts");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "moox-qimen-runtime-"));
const compiledPath = path.join(tempDir, "qimen-first-policy.cjs");
esbuild.buildSync({
  entryPoints: [policyPath],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  outfile: compiledPath,
  tsconfig: path.join(root, "tsconfig.json"),
  logLevel: "silent",
});
const qimen = require(compiledPath);

function sampleRecord(input = {}) {
  const generatedAt = input.generatedAt ?? "2026-08-18T05:40:00.000Z";
  const marketCode = input.marketCode ?? "BTC";
  return {
    id: `GDF-${marketCode}-20260819-V1`,
    marketCode,
    forecastDate: "2026-08-19",
    sourceWeeklyForecastId: "TEST-WEEKLY",
    direction: input.direction ?? "上涨",
    upProbability: 52,
    sidewaysProbability: 28,
    downProbability: 20,
    expectedPath: "先震荡后观察",
    supportLevels: ["112000"],
    resistanceLevels: ["118000"],
    confirmationLevel: "114000",
    invalidationLevel: "110000",
    riskLevel: "中高",
    confidence: input.confidence ?? 60,
    consensusStars: 3,
    consensusScore: 60,
    consensusLabel: "待核",
    catalysts: [],
    risks: ["高波动风险"],
    liuyaoEvidence: "本周主方向上涨",
    qimenEvidence: null,
    calendarEvidence: null,
    technicalEvidence: "测试技术证据",
    newsEvidence: null,
    marketProgressStatus: "NOT_STARTED",
    revisionReason: null,
    previousVersionId: null,
    version: 1,
    status: "LOCKED",
    generatedAt,
    publishedAt: generatedAt,
    lockedAt: generatedAt,
    validatedAt: null,
    validationStatus: null,
  };
}

test("GeneratedDailyForecast preserves Liuyao direction and persists parallel Qimen evidence", () => {
  const sourceRecord = sampleRecord();
  const result = qimen.applyQimenFirstToGeneratedDaily(sourceRecord, { liuyaoDirection: "上涨" });
  assert.equal(result.direction, sourceRecord.direction);
  assert.deepEqual(
    [result.upProbability, result.sidewaysProbability, result.downProbability],
    [sourceRecord.upProbability, sourceRecord.sidewaysProbability, sourceRecord.downProbability],
  );
  assert.ok(result.qimenEvidence?.includes("奇门独立观点="));
  assert.ok(result.qimenEvidence?.includes("九宫="));
  assert.ok(result.qimenEvidence?.includes("起局="));
  assert.deepEqual(result.supportLevels, sourceRecord.supportLevels);
  assert.deepEqual(result.resistanceLevels, sourceRecord.resistanceLevels);
});

test("Qimen and Liuyao remain separate while their relationship adjusts confidence", () => {
  const sourceRecord = sampleRecord({ direction: "上涨" });
  const first = qimen.applyQimenFirstToGeneratedDaily(sourceRecord, { liuyaoDirection: "上涨" });
  const qimenDirection = first.qimenParallelDirection;
  const divergentLiuyao = qimenDirection === "UP" ? "下跌" : "上涨";
  const divergentRecord = sampleRecord({ direction: divergentLiuyao, confidence: 60 });
  const divergent = qimen.applyQimenFirstToGeneratedDaily(divergentRecord, { liuyaoDirection: divergentLiuyao });
  assert.equal(divergent.direction, divergentRecord.direction);
  assert.equal(divergent.confidence, 51);
  assert.equal(divergent.consensusStars, 2);
  assert.equal(divergent.directionConflict, true);
  assert.match(divergent.consensusLabel, /分歧.*信心降低/);
  assert.match(divergent.methodPriority, /CONDITIONAL_LIUYAO_SOURCE_AUTHORITY_QIMEN_PARALLEL_FORECAST_RESONANCE/);
});

test("same market/date does not recast when generatedAt changes", () => {
  const first = qimen.applyQimenFirstToGeneratedDaily(sampleRecord({ generatedAt: "2026-08-18T05:40:00.000Z" }), { liuyaoDirection: "上涨" });
  const retry = qimen.applyQimenFirstToGeneratedDaily(sampleRecord({ generatedAt: "2026-08-18T07:55:00.000Z" }), { liuyaoDirection: "上涨" });
  assert.equal(first.qimenEvidence, retry.qimenEvidence);
  assert.equal(first.direction, retry.direction);
});

test("persisted prior cast time is reused on revision", () => {
  const first = qimen.applyQimenFirstToGeneratedDaily(sampleRecord(), { liuyaoDirection: "上涨" });
  const revision = qimen.applyQimenFirstToGeneratedDaily(sampleRecord({ generatedAt: "2026-08-18T10:20:00.000Z" }), {
    liuyaoDirection: "下跌",
    previousQimenEvidence: first.qimenEvidence,
  });
  const firstCast = first.qimenEvidence?.match(/起局=([^；]+)/)?.[1];
  const revisionCast = revision.qimenEvidence?.match(/起局=([^；]+)/)?.[1];
  assert.ok(firstCast);
  assert.equal(revisionCast, firstCast);
});

test("core-nine commodity categories are mapped correctly", () => {
  const gold = qimen.applyQimenFirstToGeneratedDaily(sampleRecord({ marketCode: "GLD" }), { liuyaoDirection: "上涨" });
  const silver = qimen.applyQimenFirstToGeneratedDaily(sampleRecord({ marketCode: "SILVER" }), { liuyaoDirection: "上涨" });
  const oil = qimen.applyQimenFirstToGeneratedDaily(sampleRecord({ marketCode: "WTI" }), { liuyaoDirection: "上涨" });
  assert.equal(gold.qimen.assetCategory, "PRECIOUS_METAL");
  assert.equal(silver.qimen.assetCategory, "PRECIOUS_METAL");
  assert.equal(oil.qimen.assetCategory, "ENERGY");
});

test("chart structural invariants hold across representative seasonal dates", () => {
  const samples = [
    "2026-01-05T12:00:00.000Z",
    "2026-02-04T12:00:00.000Z",
    "2026-03-20T12:00:00.000Z",
    "2026-06-21T12:00:00.000Z",
    "2026-08-18T12:00:00.000Z",
    "2026-09-23T12:00:00.000Z",
    "2026-12-22T12:00:00.000Z",
  ];
  for (const sample of samples) {
    const chart = qimen.buildMooxQimenChartForAudit(sample);
    assert.equal(chart.palaces.length, 9);
    assert.equal(chart.invariants.valid, true, sample);
  }
});

test.after(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});
