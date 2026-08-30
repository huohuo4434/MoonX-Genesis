import assert from "node:assert/strict";
import test from "node:test";

import {
  buildQimenShadowTrials,
  QIMEN_SHADOW_LEDGER_SCHEMA,
  summarizeQimenShadowTrials,
  type QimenShadowCandle,
  type QimenShadowSetup,
} from "@/lib/research/qimen-shadow-ab-core";

function setup(overrides: Partial<QimenShadowSetup> = {}): QimenShadowSetup {
  return {
    experimentId: "exp-1",
    symbol: "BTCUSDT",
    horizon: "SWING",
    officialDirection: "LONG",
    formalForecastId: "week-1",
    formalForecastVersion: "V1",
    forecastPublishedAt: "2026-08-29T00:00:00.000Z",
    forecastLockedAt: "2026-08-29T00:01:00.000Z",
    forecastValidFrom: "2026-08-29T00:00:00.000Z",
    forecastValidUntil: "2026-09-05T00:00:00.000Z",
    decisionAt: "2026-08-30T00:00:00.000Z",
    evaluationDueAt: "2026-08-30T03:00:00.000Z",
    evaluatedAt: "2026-08-30T04:00:00.000Z",
    candleIntervalMinutes: 60,
    technicalSourceId: "chan-btc-4h-20260829",
    technicalRecordedAt: "2026-08-29T23:30:00.000Z",
    baseTriggered: true,
    entryPrice: 100,
    stopPrice: 95,
    target1: 105,
    target2: 110,
    target3: 115,
    methodReadings: [
      { schoolId: "OBJECT_YONGSHEN", direction: "UP", confidence: 66, readiness: "FORWARD_READY", sourceId: "wu", chartId: "c1", recordedAt: "2026-08-29T23:00:00.000Z", evidenceSha256: "a".repeat(64) },
      { schoolId: "DIRECTIONAL_PALACE", direction: "UP", confidence: 58, readiness: "RESEARCH_ONLY", sourceId: "rabbit", chartId: "c1", recordedAt: "2026-08-29T23:10:00.000Z", evidenceSha256: "b".repeat(64) },
    ],
    ...overrides,
  };
}

const winningCandles: QimenShadowCandle[] = [
  { openTime: "2026-08-30T00:00:00.000Z", closeTime: "2026-08-30T01:00:00.000Z", open: 99, high: 106, low: 98, close: 104, closed: true },
  { openTime: "2026-08-30T01:00:00.000Z", closeTime: "2026-08-30T02:00:00.000Z", open: 104, high: 111, low: 103, close: 109, closed: true },
  { openTime: "2026-08-30T02:00:00.000Z", closeTime: "2026-08-30T03:00:00.000Z", open: 109, high: 116, low: 108, close: 115, closed: true },
];

test("all variants remain research-only and can never enable live trading", () => {
  const trials = buildQimenShadowTrials({ setup: setup(), candles: winningCandles });
  assert.equal(trials.length, 5);
  assert.ok(trials.every((item) => item.schema === QIMEN_SHADOW_LEDGER_SCHEMA));
  assert.ok(trials.every((item) => item.researchOnly && !item.tradingEligible));
  assert.ok(trials.every((item) => item.officialDirection === "LONG"));
});

test("aligned methods enter only in the locked direction and record targets, MFE, MAE and R", () => {
  const trials = buildQimenShadowTrials({ setup: setup(), candles: winningCandles });
  assert.ok(trials.every((item) => item.action === "ENTER"));
  const resonance = trials.find((item) => item.variantId === "QIMEN_RESONANCE_FILTER");
  assert.equal(resonance?.outcome, "TARGET3");
  assert.equal(resonance?.targetHits, 3);
  assert.ok((resonance?.realizedR ?? 0) > 0);
  assert.ok((resonance?.mfeR ?? 0) >= 3);
  assert.ok((resonance?.maeR ?? 0) < 0);
});

test("Qimen disagreement waits and never creates the opposite order", () => {
  const divergent = setup({
    methodReadings: [
      { schoolId: "OBJECT_YONGSHEN", direction: "UP", confidence: 66, readiness: "FORWARD_READY", sourceId: "wu", chartId: "c1", recordedAt: "2026-08-29T23:00:00.000Z", evidenceSha256: "a".repeat(64) },
      { schoolId: "DIRECTIONAL_PALACE", direction: "DOWN", confidence: 62, readiness: "RESEARCH_ONLY", sourceId: "rabbit", chartId: "c1", recordedAt: "2026-08-29T23:10:00.000Z", evidenceSha256: "b".repeat(64) },
    ],
  });
  const trials = buildQimenShadowTrials({ setup: divergent, candles: winningCandles });
  const guard = trials.find((item) => item.variantId === "QIMEN_DIVERGENCE_GUARD");
  const resonance = trials.find((item) => item.variantId === "QIMEN_RESONANCE_FILTER");
  assert.equal(guard?.action, "WAIT");
  assert.equal(resonance?.action, "WAIT");
  assert.ok(trials.every((item) => item.officialDirection === "LONG"));
});

test("same-candle stop and target ambiguity is conservatively scored as stop first", () => {
  const ambiguous: QimenShadowCandle[] = [{
    openTime: "2026-08-30T00:00:00.000Z", closeTime: "2026-08-30T01:00:00.000Z",
    open: 100, high: 106, low: 94, close: 101, closed: true,
  }];
  const baseline = buildQimenShadowTrials({ setup: setup({ evaluationDueAt: "2026-08-30T01:00:00.000Z" }), candles: ambiguous })
    .find((item) => item.variantId === "BASE_FORMAL_CHAN");
  assert.equal(baseline?.outcome, "STOP_FIRST");
  assert.equal(baseline?.realizedR, -1);
  assert.equal(baseline?.targetHits, 0);
});

test("future method readings, invalid authority windows and invalid geometry fail closed", () => {
  assert.throws(() => buildQimenShadowTrials({
    setup: setup({ methodReadings: [{ schoolId: "OBJECT_YONGSHEN", direction: "UP", confidence: 60, readiness: "FORWARD_READY", sourceId: "wu", chartId: "c1", recordedAt: "2026-08-30T00:01:00.000Z", evidenceSha256: "a".repeat(64) }] }),
    candles: winningCandles,
  }), /决策后补录/);
  assert.throws(() => buildQimenShadowTrials({ setup: setup({ forecastLockedAt: "2026-08-30T01:00:00.000Z" }), candles: winningCandles }), /不存在有效/);
  assert.throws(() => buildQimenShadowTrials({ setup: setup({ stopPrice: 105 }), candles: winningCandles }), /LONG价格结构无效/);
});

test("open or future candles are rejected instead of leaking future information", () => {
  assert.throws(() => buildQimenShadowTrials({
    setup: setup(),
    candles: [{ ...winningCandles[0]!, closed: false }],
  }), /已闭合/);
  assert.throws(() => buildQimenShadowTrials({
    setup: setup(),
    candles: [{ ...winningCandles[0]!, closeTime: "2026-08-31T01:00:00.000Z" }],
  }), /评估时点前/);
  assert.throws(() => buildQimenShadowTrials({
    setup: setup({ baseTriggered: false }),
    candles: [{ ...winningCandles[0]!, closed: false }],
  }), /已闭合/);
});

test("unavailable readings cannot arm a school filter", () => {
  const trials = buildQimenShadowTrials({
    setup: setup({
      methodReadings: [{ schoolId: "OBJECT_YONGSHEN", direction: "UP", confidence: 60, readiness: "UNAVAILABLE", sourceId: "wu", chartId: "c1", recordedAt: "2026-08-29T23:00:00.000Z", evidenceSha256: "a".repeat(64) }],
    }),
    candles: winningCandles,
  });
  assert.equal(trials.find((item) => item.variantId === "OBJECT_YONGSHEN_FILTER")?.action, "WAIT");
});

test("summaries require 30 observations across 30 days and still cannot enable live", () => {
  const allTrials = Array.from({ length: 30 }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");
    const base = buildQimenShadowTrials({ setup: setup({ experimentId: `exp-${day}`, decisionAt: `2026-07-${day}T12:00:00.000Z`, evaluationDueAt: `2026-07-${day}T16:00:00.000Z`, evaluatedAt: `2026-07-${day}T12:00:00.000Z`, forecastPublishedAt: "2026-06-30T00:00:00.000Z", forecastLockedAt: "2026-06-30T00:01:00.000Z", forecastValidFrom: "2026-07-01T00:00:00.000Z", forecastValidUntil: "2026-08-01T00:00:00.000Z", technicalRecordedAt: "2026-06-30T23:00:00.000Z", methodReadings: [] }), candles: [] });
    return base.map((item) => ({ ...item, realizedR: item.action === "ENTER" ? 0.5 : null, outcome: item.action === "ENTER" ? "EXPIRED" as const : item.outcome }));
  }).flat();
  const summaries = summarizeQimenShadowTrials(allTrials);
  const baseline = summaries.find((item) => item.variantId === "BASE_FORMAL_CHAN");
  assert.equal(baseline?.sampleReady, true);
  assert.equal(baseline?.researchQualified, true);
  assert.equal(baseline?.mayEnableLive, false);
  assert.ok(summaries.every((item) => item.mayEnableLive === false));
  assert.throws(() => summarizeQimenShadowTrials([...allTrials, allTrials[0]!]), /重复计入/);
  const sparse = allTrials.map((item, index) => ({
    ...item,
    action: index < 9 && item.variantId === "BASE_FORMAL_CHAN" ? "ENTER" as const : "WAIT" as const,
    realizedR: index < 9 && item.variantId === "BASE_FORMAL_CHAN" ? 1 : null,
  }));
  assert.equal(summarizeQimenShadowTrials(sparse).find((item) => item.variantId === "BASE_FORMAL_CHAN")?.researchQualified, false);
  assert.throws(() => summarizeQimenShadowTrials([{ ...allTrials[0]!, tradingEligible: true } as never]), /纯研究样本/);
});
