import assert from "node:assert/strict";
import test from "node:test";
import { validateGeneratedDailyPublication } from "../lib/content/publication-quality-gate.ts";
import type { GeneratedDailyForecastRecord } from "../lib/weekly-source/types.ts";

function sample(): GeneratedDailyForecastRecord {
  return {
    id: "test", marketCode: "BTC", forecastDate: "2026-08-10", sourceWeeklyForecastId: "w1",
    direction: "上涨", upProbability: 40, sidewaysProbability: 35, downProbability: 25,
    expectedPath: "周内方向看涨，节奏允许震荡，但正式方向不改变。",
    supportLevels: [], resistanceLevels: [], confirmationLevel: null, invalidationLevel: null,
    riskLevel: "中", catalysts: ["周卦与月卦同向"], risks: ["高波动"],
    liuyaoEvidence: "六爻方向看涨", qimenEvidence: null, calendarEvidence: null,
    technicalEvidence: "技术价位数据暂不可用；方向与路径照常发布，点位栏暂不展示。",
    newsEvidence: null, marketProgressStatus: "NOT_STARTED", revisionReason: null,
    previousVersionId: null, version: 1, status: "DRAFT", generatedAt: new Date().toISOString(),
    publishedAt: null, lockedAt: null, validatedAt: null, validationStatus: null,
  };
}

test("scenario weights may differ from official direction but must sum to 100", () => {
  const row = sample();
  row.upProbability = 28;
  row.sidewaysProbability = 39;
  row.downProbability = 33;
  assert.equal(validateGeneratedDailyPublication(row).ok, true);
  row.downProbability = 32;
  assert.equal(validateGeneratedDailyPublication(row).ok, false);
});

test("missing technical levels are allowed only with an explicit waiting message", () => {
  const row = sample();
  assert.equal(validateGeneratedDailyPublication(row).ok, true);
  row.technicalEvidence = "";
  const result = validateGeneratedDailyPublication(row);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.code === "TECHNICAL_LEVEL_STATE_UNCLEAR"));
});

test("broken template text is blocked", () => {
  const row = sample();
  row.expectedPath = "OVERHEATED。。";
  const result = validateGeneratedDailyPublication(row);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.code === "INTERNAL_ENUM"));
  assert.ok(result.issues.some((issue) => issue.code === "BAD_PUNCTUATION"));
});

test("normal Chinese sentence endings pass while consecutive mixed punctuation remains blocked", () => {
  const normal = sample();
  normal.expectedPath = "先观察支撑是否有效，再确认日内节奏。";
  normal.liuyaoEvidence = "周度方向保持不变。";
  normal.technicalEvidence = "技术行情暂不可用，等待真实K线更新。";
  const normalResult = validateGeneratedDailyPublication(normal);
  assert.equal(normalResult.ok, true, JSON.stringify(normalResult.issues));

  for (const punctuation of ["。。", "。！", "。；", "。.", "！？", "？！", "..", ";;", ",,"]) {
    const invalid = sample();
    invalid.expectedPath = `先观察支撑是否有效${punctuation}再确认日内节奏。`;
    const invalidResult = validateGeneratedDailyPublication(invalid);
    assert.equal(invalidResult.ok, false, punctuation);
    assert.ok(invalidResult.issues.some((issue) => issue.code === "BAD_PUNCTUATION"), punctuation);
  }
});
