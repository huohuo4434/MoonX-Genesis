import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  buildClosedMarketProgressSnapshot,
  dailyTechnicalInputPolicy,
  decideDailyPipelineEvidenceGate,
  persistDailyRevision,
  withAuthoritativeDailyLatest,
} from "../lib/forecasts/daily-rolling-core";
import { assessMarketProgress, type MarketSnapshot } from "../lib/forecasts/market-progress";
import { generateDailyFromWeekly } from "../lib/forecasts/weekly-to-daily";
import { applyXIntelligenceToGeneratedDaily } from "../lib/trading-signals/x-intelligence-overlay";
import type { GeneratedDailyForecastRecord, WeeklyForecastSourceRecord } from "../lib/weekly-source/types";

const weekly = (direction = "震荡上涨"): WeeklyForecastSourceRecord => ({
  id: "WEEK-SPX-LOCKED-V1", marketCode: "SPX", periodStart: "2026-08-10", periodEnd: "2026-08-14",
  primaryHexagram: "测试卦", changedHexagram: null, movingLines: [], specialPatterns: [], weeklyDirection: direction,
  weeklyPath: direction.includes("上涨") ? "周初上涨，周中整理，后段防回吐" : "周初下跌，周中整理，后段防反弹",
  interpretation: "locked weekly evidence", riskSummary: "保持风险观察", sourceType: "LIUYAO_WEEKLY",
  version: 1, status: "LOCKED", publishedAt: "2026-08-09T00:00:00.000Z", lockedAt: "2026-08-09T00:01:00.000Z",
  createdAt: "2026-08-09T00:00:00.000Z", updatedAt: "2026-08-09T00:01:00.000Z",
});

const earlyRally: MarketSnapshot = {
  lastPrice: 110, previousClose: 108, weekOpen: 100, weekHigh: 111, weekLow: 99,
  nearestSupport: 99, nearestResistance: 110, atr: 2, weekReturnPct: 10,
};

test("market progress uses only valid bars closed before the forecast date", () => {
  const snapshot = buildClosedMarketProgressSnapshot({
    forecastDate: "2026-08-12",
    weeklyPeriodStart: "2026-08-10",
    bars: [
      { date: "2026-08-10", open: 100, high: 105, low: 99, close: 104 },
      { date: "2026-08-11", open: 104, high: 111, low: 103, close: 110 },
      { date: "2026-08-12", open: 110, high: 999, low: 1, close: 900 },
      { date: "2026-08-13", open: 900, high: 999, low: 800, close: 950 },
      { date: "2026-08-09", open: 100, high: 99, low: 90, close: 95 },
    ],
  });
  assert.equal(snapshot?.lastPrice, 110);
  assert.equal(snapshot?.weekHigh, 111);
  assert.equal(snapshot?.weekReturnPct, 10);
});

test("one real bar plus a Yahoo metadata synthetic previous close cannot form a progress snapshot", () => {
  const snapshot = buildClosedMarketProgressSnapshot({
    forecastDate: "2026-08-12",
    weeklyPeriodStart: "2026-08-10",
    bars: [
      {
        date: "2026-08-10", open: 99, high: 99, low: 99, close: 99,
        synthetic: true, provenance: "YAHOO_META_PREVIOUS_CLOSE",
      },
      { date: "2026-08-11", open: 100, high: 105, low: 99, close: 104 },
    ],
  });
  assert.equal(snapshot, null);
});

test("pipeline evidence gate skips continuity and preserves a complete latest version on provider failures", () => {
  assert.deepEqual(decideDailyPipelineEvidenceGate({
    hasLatest: false,
    weeklySpecialPatterns: ["CONTINUITY_LOW_CONFIDENCE_RESEARCH_ONLY"],
  }), { action: "SKIP_RESEARCH_ONLY", reason: "continuity-research-only" });
  for (const input of [
    { hasLatest: true, technicalReadFailed: true },
  ]) {
    assert.equal(decideDailyPipelineEvidenceGate(input).action, "PRESERVE_LATEST");
  }
  assert.equal(decideDailyPipelineEvidenceGate({ hasLatest: true, marketProgressAvailable: false }).action, "CONTINUE", "optional progress outage does not freeze fresh technical levels");
  assert.deepEqual(decideDailyPipelineEvidenceGate({
    hasLatest: false,
    marketProgressAvailable: false,
    xSnapshotAvailable: false,
    technicalReadFailed: true,
  }), { action: "CONTINUE", reason: null }, "initial publication may explicitly disclose missing auxiliary data");
});

test("authoritative latest failure prevents candidate construction, persistence, and verification sync", async () => {
  let candidateCalls = 0;
  let persistCalls = 0;
  let syncCalls = 0;
  await assert.rejects(
    withAuthoritativeDailyLatest({
      loadLatest: async () => { throw new Error("schema unavailable"); },
      runAfterAuthority: async () => {
        candidateCalls += 1;
        persistCalls += 1;
        syncCalls += 1;
      },
    }),
    /schema unavailable/
  );
  assert.deepEqual({ candidateCalls, persistCalls, syncCalls }, {
    candidateCalls: 0, persistCalls: 0, syncCalls: 0,
  });
});

test("authoritative writer or schema failure propagates and cannot be accepted as a created-false candidate", async () => {
  const source = weekly();
  const initial = generateDailyFromWeekly({
    weekly: source,
    forecastDate: "2026-08-11",
    version: 1,
    status: "LOCKED",
  });
  let writerCalls = 0;
  await assert.rejects(
    persistDailyRevision({
      latest: null,
      candidate: initial,
      verifiedMarketProgress: false,
      persist: async () => {
        writerCalls += 1;
        throw new Error("generated-daily-authoritative-schema-unavailable");
      },
    }),
    /authoritative-schema-unavailable/
  );
  assert.equal(writerCalls, 1);
});

test("ETH no-BTC-level reuse is an explicit policy, not a technical provider failure", () => {
  assert.equal(dailyTechnicalInputPolicy("ETH"), "ETH_NO_BTC_LEVEL_REUSE");
  assert.equal(dailyTechnicalInputPolicy("BTC"), "READ_MARKET_TECHNICALS");
  const gate = decideDailyPipelineEvidenceGate({
    hasLatest: true,
    marketProgressAvailable: true,
    xSnapshotAvailable: true,
    technicalReadFailed: false,
  });
  assert.deepEqual(gate, { action: "CONTINUE", reason: null });
});

function candidate(source: WeeklyForecastSourceRecord, snapshot: MarketSnapshot): GeneratedDailyForecastRecord {
  return generateDailyFromWeekly({ weekly: source, forecastDate: "2026-08-11", status: "LOCKED", snapshot });
}

test("an early fulfilled bullish path lowers continuation confidence without reversing its source direction", () => {
  const source = weekly();
  const before = structuredClone(source);
  const row = candidate(source, earlyRally);
  assert.equal(row.direction, "震荡上涨");
  assert.equal(row.marketProgressStatus, "AHEAD");
  assert.deepEqual(source, before);
});

test("a delayed weekly path stays delayed instead of inventing realized movement", () => {
  const result = assessMarketProgress({
    weeklyDirection: "先涨后跌", weeklyPath: "先涨后跌", baseDirection: "上涨",
    baseUp: 52, baseFlat: 28, baseDown: 20, basePath: "等待上涨",
    snapshot: { ...earlyRally, lastPrice: 100.1, weekReturnPct: 0.1, nearestResistance: 120 },
  });
  assert.equal(result.status, "DELAYED");
  assert.equal(result.direction, "上涨");
});

test("support warns of rebound risk without reversing the bearish source direction", () => {
  const source = weekly("震荡下跌");
  const before = structuredClone(source);
  const result = candidate(source, {
    ...earlyRally, lastPrice: 89, previousClose: 91, weekOpen: 100, weekHigh: 101, weekLow: 88,
    nearestSupport: 89, nearestResistance: 101, weekReturnPct: -11,
  });
  assert.equal(result.direction, "震荡下跌");
  assert.equal(result.marketProgressStatus, "AHEAD");
  assert.deepEqual(source, before);
});

test("V1 to V2 is append-only, identical evidence is idempotent, and unavailable market evidence keeps V2", async () => {
  const source = weekly();
  const v1 = generateDailyFromWeekly({ weekly: source, forecastDate: "2026-08-11", version: 1, status: "LOCKED" });
  const originalV1 = structuredClone(v1);
  const writes: GeneratedDailyForecastRecord[] = [];
  const v2Result = await persistDailyRevision({
    latest: v1,
    candidate: candidate(source, earlyRally),
    verifiedMarketProgress: true,
    persist: async (record) => { writes.push(structuredClone(record)); return { created: true, record }; },
  });
  assert.equal(v2Result.created, true);
  assert.equal(v2Result.record.version, 2);
  assert.equal(v2Result.record.previousVersionId, v1.id);
  assert.deepEqual(v1, originalV1);

  const same = await persistDailyRevision({
    latest: v2Result.record,
    candidate: candidate(source, earlyRally),
    verifiedMarketProgress: true,
    persist: async () => { throw new Error("unchanged evidence must not write V3"); },
  });
  assert.equal(same.created, false);
  assert.equal(same.record.version, 2);

  const unavailable = await persistDailyRevision({
    latest: v2Result.record,
    candidate: candidate(source, earlyRally),
    verifiedMarketProgress: false,
    persist: async () => { throw new Error("missing market evidence must not write"); },
  });
  assert.equal(unavailable.record.id, v2Result.record.id);
  assert.equal(writes.length, 1);
});

test("X stage is auxiliary and may version evidence without owning the public direction", async () => {
  const source = weekly();
  const v1 = candidate(source, earlyRally);
  const xAdjusted = applyXIntelligenceToGeneratedDaily(v1, {
    symbol: "SPX", weightPct: 8, direction: "SHORT", directionScore: -100, probabilityShiftPct: -8,
    uniqueSources24h: 3, uniqueAccounts24h: 3, methodFamilies24h: 2, agreementPct: 90,
    stage: "CONFIRMATION", momentum: "ACCELERATING", risk: "MEDIUM", forecastAction: "REDUCE",
    explanation: "交叉确认，仅调整公开日预测情景权重", canTriggerTradeAlone: false,
  });
  assert.equal(xAdjusted.direction, v1.direction, "X/teacher aggregate cannot own or flip direction");
  const withX = { ...xAdjusted, newsEvidence: `${xAdjusted.newsEvidence ?? ""} 交叉确认` };
  const result = await persistDailyRevision({
    latest: { ...v1, newsEvidence: "匿名X情报阶段：早期观察" }, candidate: withX,
    verifiedMarketProgress: true, persist: async (record) => ({ created: true, record }),
  });
  assert.equal(result.created, true);
  assert.equal(result.record.direction, "震荡上涨");
  assert.ok(result.decision.reasons.includes("X_STAGE_CHANGED"));
});

test("a concurrent unique winner is returned authoritatively and is not reported as a new write", async () => {
  const source = weekly();
  const latest = generateDailyFromWeekly({ weekly: source, forecastDate: "2026-08-11", version: 1, status: "LOCKED" });
  const winner = { ...candidate(source, earlyRally), id: "db-winner", version: 2, previousVersionId: latest.id };
  const result = await persistDailyRevision({
    latest, candidate: candidate(source, earlyRally), verifiedMarketProgress: true,
    persist: async () => ({ created: false, record: winner }),
  });
  assert.equal(result.created, false);
  assert.equal(result.record.id, "db-winner");
});

test("production wiring reports only real creates and remains disconnected from live execution", () => {
  const pipeline = readFileSync(resolve("lib/forecasts/daily-pipeline.ts"), "utf8");
  const store = readFileSync(resolve("lib/weekly-source/store.ts"), "utf8");
  const dailyPrices = readFileSync(resolve("lib/market-data/daily-prices.ts"), "utf8");
  const rolling = readFileSync(resolve("lib/forecasts/daily-rolling-core.ts"), "utf8");
  assert.match(pipeline, /if \(saved\.created\) report\.upserted\.push/);
  assert.match(store, /P2002[\s\S]*findUnique/);
  assert.match(store, /console\.error\("\[weekly-source\] upsertGeneratedDaily failed"[\s\S]*throw err/);
  assert.match(pipeline, /CONTINUITY_LOW_CONFIDENCE_RESEARCH_ONLY/);
  assert.match(rolling, /continuity-research-only/);
  assert.doesNotMatch(pipeline, /^import .*daily-prices/m);
  assert.match(pipeline, /await import\("@\/lib\/market-data\/daily-prices"\)/);
  assert.match(store, /generated-daily-authoritative-store-unavailable/);
  assert.match(store, /upsertGeneratedDaily[\s\S]*throw new Error\("generated-daily-authoritative-store-unavailable"\)/);
  assert.doesNotMatch(store, /getLatestGeneratedDailyForMarketDate[\s\S]{0,900}catch \{[\s\S]{0,80}return null/);
  assert.match(dailyPrices, /synthetic: true/);
  assert.match(dailyPrices, /provenance: "YAHOO_META_PREVIOUS_CLOSE"/);
  assert.doesNotMatch(pipeline, /executeReadyDecision|submitMarketOrder|placeOrder|runThreeHorizonStrategyEngine/);
});
