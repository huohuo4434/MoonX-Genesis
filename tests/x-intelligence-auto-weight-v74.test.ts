import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregateXIntelligence,
  type XIntelligenceAggregateInput,
  type XIntelligenceSymbolSummary,
} from "../lib/trading-signals/x-intelligence-core.ts";
import {
  applyXIntelligenceToGeneratedDaily,
  buildXIntelligenceAutoWeight,
  findXIntelligenceSummaryForMarket,
} from "../lib/trading-signals/x-intelligence-overlay.ts";
import type { GeneratedDailyForecastRecord } from "../lib/weekly-source/types.ts";
import { validateGeneratedDailyPublication } from "../lib/content/publication-quality-gate.ts";

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
    uniqueAccounts24h: 5,
    methodFamilies24h: 3,
    agreementRatio24h: 5 / 6,
    ...overrides,
  };
}

function signal(sourceKey: string, sourceFamily = "OTHER"): XIntelligenceAggregateInput {
  return {
    postedAt: "2026-08-07T12:00:00.000Z",
    sourceKey,
    sourceFamily,
    symbols: ["BTC"],
    direction: "LONG",
    confidence: 70,
    stage: "EARLY_WATCH",
    risk: "MEDIUM",
    levels: [],
    timeWindows: [],
  };
}

test("same-method accounts do not count one-for-one as independent methods", () => {
  const rows = ["Deltaking888", "ximihoo1", "Cycle_King1913", "formnoshape", "mat78704"].map((handle) => signal(handle, "CYCLE_TIMING"));
  const aggregate = aggregateXIntelligence(rows, new Date("2026-08-07T13:00:00.000Z"));
  const btc = aggregate.summaries.find((item) => item.symbol === "BTC");
  assert.ok(btc);
  assert.equal(btc.uniqueAccounts24h, 5);
  assert.equal(btc.methodFamilies24h, 1);
  assert.equal(btc.uniqueSources24h, 2);
});

test("cross-method confirmation increases effective source diversity", () => {
  const rows = [
    signal("Deltaking888", "CYCLE_TIMING"),
    signal("big_hunter11", "FLOW_LIQUIDITY"),
    signal("btcpiggy", "METAPHYSICAL_TIMING"),
    signal("ArtofSpecuycky", "FUNDAMENTAL_EVENT"),
    signal("btckik", "ALTCOIN_RADAR"),
  ];
  const aggregate = aggregateXIntelligence(rows, new Date("2026-08-07T13:00:00.000Z"));
  const btc = aggregate.summaries.find((item) => item.symbol === "BTC");
  assert.ok(btc);
  assert.equal(btc.methodFamilies24h, 5);
  assert.equal(btc.uniqueSources24h, 5);
});

test("three effective independent sources can reach 10% but never exceed source cap", () => {
  const overlay = buildXIntelligenceAutoWeight(summary());
  assert.ok(overlay);
  assert.equal(overlay.weightPct, 10);
  assert.equal(overlay.canTriggerTradeAlone, false);
});

test("one effective source is capped at five percent", () => {
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

test("every X stage and momentum is localized before publication quality validation", () => {
  const stages = ["EARLY_WATCH", "CONFIRMATION", "OVERHEATED", "OBSERVE"] as const;
  const momentums = ["NEW", "ACCELERATING", "STABLE", "COOLING"] as const;
  for (const dominantStage of stages) {
    for (const momentum of momentums) {
      const record: GeneratedDailyForecastRecord = {
        id: `publish-${dominantStage}-${momentum}`,
        marketCode: "ETH",
        forecastDate: "2026-08-12",
        sourceWeeklyForecastId: "weekly-eth",
        direction: "震荡偏强",
        upProbability: 42,
        sidewaysProbability: 36,
        downProbability: 22,
        expectedPath: "日内先观察支撑有效性，随后根据真实行情确认震荡修复节奏。",
        supportLevels: [],
        resistanceLevels: [],
        confirmationLevel: null,
        invalidationLevel: null,
        riskLevel: "中等",
        catalysts: ["多来源信息出现交叉确认"],
        risks: ["短线波动仍可能放大"],
        liuyaoEvidence: "六爻锁定方向保持不变，外部信息不参与方向投票。",
        qimenEvidence: null,
        calendarEvidence: null,
        technicalEvidence: "真实技术行情暂不可用，等待K线更新后再展示技术价位。",
        newsEvidence: null,
        marketProgressStatus: "NOT_STARTED",
        revisionReason: null,
        previousVersionId: null,
        version: 1,
        status: "DRAFT",
        generatedAt: "2026-08-12T00:00:00.000Z",
        publishedAt: null,
        lockedAt: null,
        validatedAt: null,
        validationStatus: null,
      };
      const overlay = buildXIntelligenceAutoWeight(summary({
        symbol: "ETH",
        dominantStage,
        momentum,
      }));
      const output = applyXIntelligenceToGeneratedDaily(record, overlay);
      const quality = validateGeneratedDailyPublication(output);
      assert.equal(quality.ok, true, `${dominantStage}/${momentum}: ${JSON.stringify(quality.issues)}`);
      assert.doesNotMatch(output.newsEvidence ?? "", /\b(?:EARLY_WATCH|CONFIRMATION|OVERHEATED|OBSERVE|NEW|ACCELERATING|STABLE|COOLING)\b/);
      assert.equal(output.direction, record.direction);
      assert.equal(overlay?.canTriggerTradeAlone, false);
    }
  }
});
