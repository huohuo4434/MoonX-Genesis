import assert from "node:assert/strict";
import test from "node:test";
import {
  applyXIntelligenceToGeneratedDaily,
  buildXIntelligenceAutoWeight,
  findXIntelligenceSummaryForMarket,
} from "../lib/trading-signals/x-intelligence-overlay.ts";
import type { XIntelligenceSymbolSummary } from "../lib/trading-signals/x-intelligence-core.ts";
import type { GeneratedDailyForecastRecord } from "../lib/weekly-source/types.ts";

function summary(overrides: Partial<XIntelligenceSymbolSummary> = {}): XIntelligenceSymbolSummary {
  return {
    symbol: "BTC",
    mentions6h: 3,
    mentions24h: 6,
    mentions7d: 12,
    longCount24h: 5,
    shortCount24h: 1,
    neutralCount24h: 0,
    direction: "LONG",
    directionScore: 62,
    averageConfidence: 68,
    dominantStage: "EARLY_WATCH",
    risk: "MEDIUM",
    momentum: "ACCELERATING",
    newestPostedAt: "2026-08-07T12:00:00.000Z",
    keyLevels: [],
    timeWindows: [],
    sampleSize: 6,
    uniqueSources24h: 3,
    agreementRatio24h: 5 / 6,
    ...overrides,
  };
}

test("three independent aligned sources can reach 10% but never exceed source cap", () => {
  const overlay = buildXIntelligenceAutoWeight(summary());
  assert.ok(overlay);
  assert.equal(overlay.weightPct, 10);
  assert.equal(overlay.canTriggerTradeAlone, false);
});

test("one source is capped at five percent", () => {
  const overlay = buildXIntelligenceAutoWeight(summary({ uniqueSources24h: 1, mentions24h: 20 }));
  assert.ok(overlay);
  assert.ok(overlay.weightPct <= 5);
});

test("conflict reduces X influence", () => {
  const overlay = buildXIntelligenceAutoWeight(summary({ direction: "NEUTRAL", directionScore: 0, agreementRatio24h: 0.5 }));
  assert.ok(overlay);
  assert.ok(overlay.weightPct <= 3);
  assert.equal(overlay.probabilityShiftPct, 0);
});

test("overheated signals trigger guard instead of chase boost", () => {
  const overlay = buildXIntelligenceAutoWeight(summary({ dominantStage: "OVERHEATED", risk: "HIGH" }));
  assert.ok(overlay);
  assert.equal(overlay.forecastAction, "OVERHEAT_GUARD");
  assert.equal(overlay.probabilityShiftPct, 0);
});

test("market aliases map QQQ to NDX", () => {
  assert.equal(findXIntelligenceSummaryForMarket([summary({ symbol: "QQQ" })], "NDX")?.symbol, "QQQ");
});

test("X layer nudges probabilities but does not overwrite a directional locked thesis", () => {
  const record: GeneratedDailyForecastRecord = {
    id: "x", marketCode: "BTC", forecastDate: "2026-08-08", sourceWeeklyForecastId: "w",
    direction: "震荡上涨", upProbability: 52, sidewaysProbability: 28, downProbability: 20,
    expectedPath: "震荡上行", supportLevels: [], resistanceLevels: [], confirmationLevel: null,
    invalidationLevel: null, riskLevel: "中高", catalysts: [], risks: [], liuyaoEvidence: "x",
    qimenEvidence: null, calendarEvidence: null, technicalEvidence: null, newsEvidence: null,
    marketProgressStatus: "NOT_STARTED", revisionReason: null, previousVersionId: null, version: 1,
    status: "DRAFT", generatedAt: "2026-08-07T12:00:00.000Z", publishedAt: null, lockedAt: null,
    validatedAt: null, validationStatus: null,
  };
  const overlay = buildXIntelligenceAutoWeight(summary());
  const out = applyXIntelligenceToGeneratedDaily(record, overlay);
  assert.equal(out.direction, "震荡上涨");
  assert.ok(out.upProbability > record.upProbability);
  assert.match(out.newsEvidence ?? "", /不能单独触发实盘/);
});
