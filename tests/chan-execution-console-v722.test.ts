import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { decideChanExecution } from "../lib/trading-signals/chan-execution-decision-core";
import { analyzeChanStructure, buildChanSegments, buildDivergenceEvidence, classifyChanBuySellPoints, classifyChanTrendState, deriveDirectionalRiskLevels, detectChanZones, normalizeChanInclusions } from "../lib/trading-signals/chan-structure-core";
import { filterClosedCandles, intervalMs, isValidChanCandle } from "../lib/market-data/chan-market-data-core";
import type { ChanCandle, ChanStructure, ChanStroke } from "../types/chan-execution";

const emptyStructure = (overrides: Partial<ChanStructure> = {}): ChanStructure => ({ sufficient: true, normalizedCandles: [], fractals: [], strokes: [], segments: [{ startStroke: 0, endStroke: 4, direction: "UP", complete: true }], zones: [{ startStroke: 0, endStroke: 2, low: 95, high: 105 }], trendState: "COMPLETE", divergence: false, divergenceEvidence: { priceExtended: false, momentumContracted: false, zoneConfirmed: true, segmentComplete: true }, buyPoint: "NONE", sellPoint: "NONE", riskLevels: { long: { invalidation: 95, tp1: 115, tp2: 125, breakevenTrigger: 115 }, short: { invalidation: 105, tp1: 85, tp2: 75, breakevenTrigger: 85 } }, ...overrides });
const base = (structure: ChanStructure) => ({ authoritativeDirection: "BULL" as const, directionConflict: false, structure, chanScore: 100, qiaoqiaoScore: 80, marketFlowScore: 80, nanaScore: 80, liquidityEventScore: 80, atTopZone: false, standardPullback: true });

test("bull authority plus completed top-zone divergence takes profit without flipping short", () => {
  const result = decideChanExecution({ ...base(emptyStructure({ divergence: true })), atTopZone: true, standardPullback: false });
  assert.equal(result.action, "TAKE_PROFIT");
  assert.equal(result.direction, "BULL");
  assert.equal(result.tradingEligible, false);
});

test("bull authority plus valid second or third buy becomes a candidate only", () => {
  for (const buyPoint of ["SECOND", "THIRD"] as const) assert.equal(decideChanExecution(base(emptyStructure({ buyPoint }))).action, "BUY_CANDIDATE");
});

test("direction conflict neutral direction and insufficient bars all hard WAIT", () => {
  assert.equal(decideChanExecution({ ...base(emptyStructure()), directionConflict: true }).action, "WAIT");
  assert.equal(decideChanExecution({ ...base(emptyStructure()), authoritativeDirection: "NEUTRAL" }).action, "WAIT");
  assert.equal(decideChanExecution(base(emptyStructure({ sufficient: false }))).action, "WAIT");
});

test("35-point Chan weight cannot override a hard wait or missing inputs", () => {
  const result = decideChanExecution({ ...base(emptyStructure()), directionConflict: true, chanScore: 100, qiaoqiaoScore: null });
  assert.equal(result.action, "WAIT");
  assert.equal(result.feasibilityScore, null);
  assert.equal(result.weights.chan, 35);
});

test("NEAR_COMPLETE structure hard-waits even with a bullish second buy and full scores", () => {
  const result = decideChanExecution(base(emptyStructure({ trendState: "NEAR_COMPLETE", buyPoint: "SECOND" })));
  assert.equal(result.action, "WAIT");
  assert.equal(result.feasibilityScore, 87);
  assert.deepEqual(result.hardWaitReasons, ["STRUCTURE_INCOMPLETE"]);
  assert.equal(result.weights.chan, 35);
});

test("three strokes alone never form a completed segment", () => {
  const strokes: ChanStroke[] = [
    { startIndex: 0, endIndex: 3, startPrice: 90, endPrice: 110, direction: "UP", complete: true },
    { startIndex: 3, endIndex: 6, startPrice: 110, endPrice: 95, direction: "DOWN", complete: true },
    { startIndex: 6, endIndex: 9, startPrice: 95, endPrice: 115, direction: "UP", complete: true },
  ];
  assert.deepEqual(buildChanSegments(strokes), []);
});

test("zone requires the auditable overlap of at least three strokes", () => {
  const strokes: ChanStroke[] = [
    { startIndex: 0, endIndex: 3, startPrice: 90, endPrice: 110, direction: "UP", complete: true },
    { startIndex: 3, endIndex: 6, startPrice: 110, endPrice: 95, direction: "DOWN", complete: true },
    { startIndex: 6, endIndex: 9, startPrice: 95, endPrice: 108, direction: "UP", complete: true },
  ];
  assert.deepEqual(detectChanZones(strokes), [{ startStroke: 0, endStroke: 2, low: 95, high: 108 }]);
  assert.deepEqual(detectChanZones(strokes.slice(0, 2)), []);
});

test("second and third buy or sell require complete auditable stroke sequences", () => {
  const stroke = (startPrice: number, endPrice: number, index: number): ChanStroke => ({ startIndex: index * 3, endIndex: index * 3 + 3, startPrice, endPrice, direction: endPrice > startPrice ? "UP" : "DOWN", complete: true });
  assert.equal(classifyChanBuySellPoints([stroke(120,90,0), stroke(90,110,1), stroke(110,95,2), stroke(95,112,3)], []).buyPoint, "SECOND");
  assert.equal(classifyChanBuySellPoints([stroke(90,120,0), stroke(120,100,1), stroke(100,115,2), stroke(115,98,3)], []).sellPoint, "SECOND");
});

test("detected historical zone plus breakout pullback confirmation yields THIRD, while reentry is NONE", () => {
  const stroke = (startPrice: number, endPrice: number, index: number): ChanStroke => ({ startIndex: index * 3, endIndex: index * 3 + 3, startPrice, endPrice, direction: endPrice > startPrice ? "UP" : "DOWN", complete: true });
  const bullish = [stroke(90,110,0), stroke(110,95,1), stroke(95,108,2), stroke(108,100,3), stroke(100,115,4), stroke(115,109,5), stroke(109,116,6)];
  assert.equal(classifyChanBuySellPoints(bullish, detectChanZones(bullish)).buyPoint, "THIRD");
  const bullishReentry = [...bullish.slice(0, 5), stroke(115,107,5), stroke(107,116,6)];
  assert.equal(classifyChanBuySellPoints(bullishReentry, detectChanZones(bullishReentry)).buyPoint, "NONE");

  const bearish = [stroke(110,90,0), stroke(90,105,1), stroke(105,92,2), stroke(92,100,3), stroke(100,85,4), stroke(85,91,5), stroke(91,84,6)];
  assert.equal(classifyChanBuySellPoints(bearish, detectChanZones(bearish)).sellPoint, "THIRD");
  const bearishReentry = [...bearish.slice(0, 5), stroke(85,93,5), stroke(93,84,6)];
  assert.equal(classifyChanBuySellPoints(bearishReentry, detectChanZones(bearishReentry)).sellPoint, "NONE");
});

test("divergence requires price extension momentum contraction completed segment and zone", () => {
  const lines: ChanStroke[] = [
    { startIndex: 0, endIndex: 3, startPrice: 90, endPrice: 120, direction: "UP", complete: true },
    { startIndex: 3, endIndex: 6, startPrice: 120, endPrice: 100, direction: "DOWN", complete: true },
    { startIndex: 6, endIndex: 9, startPrice: 100, endPrice: 124, direction: "UP", complete: true },
    { startIndex: 9, endIndex: 12, startPrice: 124, endPrice: 112, direction: "DOWN", complete: true },
    { startIndex: 12, endIndex: 15, startPrice: 112, endPrice: 126, direction: "UP", complete: true },
  ];
  const segments = buildChanSegments(lines);
  const zones = detectChanZones(lines);
  assert.deepEqual(buildDivergenceEvidence(lines, segments, zones), { priceExtended: true, momentumContracted: true, zoneConfirmed: true, segmentComplete: true });
  assert.equal(buildDivergenceEvidence(lines, segments, [{ startStroke: 0, endStroke: 1, low: 100, high: 110 }]).zoneConfirmed, false);
  assert.equal(buildDivergenceEvidence(lines, [{ startStroke: 0, endStroke: 2, direction: "UP", complete: true }], zones).segmentComplete, false);
});

test("trend COMPLETE requires the latest completed segment to cover the current last stroke", () => {
  const stroke = (startPrice: number, endPrice: number, index: number): ChanStroke => ({ startIndex: index * 3, endIndex: index * 3 + 3, startPrice, endPrice, direction: endPrice > startPrice ? "UP" : "DOWN", complete: true });
  const covered = [stroke(90,110,0), stroke(110,95,1), stroke(95,115,2), stroke(115,100,3), stroke(100,120,4)];
  const segments = buildChanSegments(covered);
  assert.equal(classifyChanTrendState(covered, segments), "COMPLETE");
  assert.equal(classifyChanTrendState([...covered, stroke(120,108,5)], segments), "NEAR_COMPLETE");
  assert.equal(classifyChanTrendState(covered.slice(0, 3), segments), "INCOMPLETE");
});

test("inclusion normalization preserves legal synthetic OHLC", () => {
  const normalized = normalizeChanInclusions([
    { timestamp: 1, open: 100, high: 110, low: 90, close: 105, volume: 1 },
    { timestamp: 2, open: 108, high: 109, low: 95, close: 96, volume: 1 },
  ]);
  assert.equal(normalized.length, 1);
  assert.ok(normalized[0]!.high >= Math.max(normalized[0]!.open, normalized[0]!.close));
  assert.ok(normalized[0]!.low <= Math.min(normalized[0]!.open, normalized[0]!.close));
});

test("market input validation rejects OHLC that does not contain open and close", () => {
  assert.equal(isValidChanCandle({ timestamp: 1, open: 100, high: 99, low: 90, close: 95, volume: 1 }), false);
  assert.equal(isValidChanCandle({ timestamp: 1, open: 100, high: 110, low: 101, close: 105, volume: 1 }), false);
  assert.equal(isValidChanCandle({ timestamp: 1, open: 100, high: 110, low: 90, close: 105, volume: 1 }), true);
});

test("directional risk levels are symmetric and absent without a zone", () => {
  const levels = deriveDirectionalRiskLevels({ startStroke: 0, endStroke: 2, low: 95, high: 105 });
  assert.deepEqual(levels.long, { invalidation: 95, tp1: 115, tp2: 125, breakevenTrigger: 115 });
  assert.deepEqual(levels.short, { invalidation: 105, tp1: 85, tp2: 75, breakevenTrigger: 85 });
  assert.deepEqual(deriveDirectionalRiskLevels(undefined), { long: null, short: null });
});

test("all supported timeframe boundaries exclude current and future candles", () => {
  const nowMs = Date.parse("2026-08-14T12:00:00Z");
  for (const timeframe of ["30m", "1H", "4H", "1D"] as const) {
    const duration = intervalMs(timeframe);
    const candles: ChanCandle[] = [
      { timestamp: nowMs - duration, open: 1, high: 2, low: 1, close: 2, volume: 1 },
      { timestamp: nowMs - duration + 1, open: 1, high: 2, low: 1, close: 2, volume: 1 },
      { timestamp: nowMs + 1, open: 1, high: 2, low: 1, close: 2, volume: 1 },
    ];
    assert.deepEqual(filterClosedCandles(candles, timeframe, nowMs).map((row) => row.timestamp), [nowMs - duration]);
  }
});

test("insufficient real OHLC stays structurally insufficient", () => {
  const candles: ChanCandle[] = Array.from({ length: 8 }, (_, i) => ({ timestamp: i * 60_000, open: 100+i, high: 102+i, low: 99+i, close: 101+i, volume: 1 }));
  assert.equal(analyzeChanStructure(candles).sufficient, false);
});

test("source evidence is research-only and chart cannot draw future candles", () => {
  const evidence = readFileSync(resolve(process.cwd(), "lib/data/chan-execution-evidence-20260814.ts"), "utf8");
  const chart = readFileSync(resolve(process.cwd(), "components/member/ChanStructureChart.tsx"), "utf8");
  const market = readFileSync(resolve(process.cwd(), "lib/market-data/chan-market-data.ts"), "utf8");
  const page = readFileSync(resolve(process.cwd(), "app/member/technical-methods/page.tsx"), "utf8");
  assert.match(evidence, /id: "COURSE_ZIP", name: "缠论\+NANA\.zip", sourcePublishedAt: null/);
  assert.match(evidence, /id: "SPY_SCREENSHOT", name: "同消息上传的 SPY 8\/14 截图", sourcePublishedAt: null/);
  assert.match(evidence, /source: "WOLF", sourceArtifact: "SPY_SCREENSHOT"/);
  assert.match(evidence, /source: "GAOSHAN", sourceArtifact: "COURSE_ZIP"/);
  assert.doesNotMatch(evidence, /source: "GAOSHAN"[^\n]*玄学正式方向优先/);
  assert.match(evidence, /mooxPolicy: "玄学正式方向是唯一方向 authority/);
  assert.match(evidence, /transcribedLessons: 12/);
  assert.match(evidence, /untranscribedAudioClaimedLearned: false/);
  assert.match(evidence, /executionAuthority: "RESEARCH_ONLY"/);
  assert.match(evidence, /tradingEligible: false/);
  assert.match(chart, /structure\.normalizedCandles/);
  assert.match(chart, /结构合成 K/);
  assert.match(chart, /不冒充逐根原始 K/);
  assert.doesNotMatch(chart, /forecast|projection|future/i);
  assert.match(market, /AbortController/);
  assert.match(market, /filterClosedCandles\([^;]+timeframe, capturedNowMs\)/s);
  assert.match(market, /new Set\(\["BTCUSDT", "ETHUSDT"\]\)/);
  assert.doesNotMatch([evidence, chart, market, page].join("\n"), /submitOrder|executeReadyDecision|placeOrder|paptrading/);
});
