import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import type { KeyDateRadarItem } from "../lib/data/key-date-radar-core.ts";
import { buildGannForwardCandidates, evaluateGannForwardSample, mergeGannForwardSamples, summarizeGannForwardSnapshot } from "../lib/research/gann-forward-verification-core.ts";

const item: KeyDateRadarItem = {
  id: "btc-2026-09-10", assetId: "btc", assetName: "比特币", symbol: "BTC", startDate: "2026-09-10", endDate: "2026-09-10", focusDate: "2026-09-10", ganzhi: "", level: "MONTH", action: "TOP_EXIT_WATCH", title: "高点", primaryView: "先涨后跌", weeklyAssist: "", confirmation: "K线", invalidation: "失效", confidence: 70, evidence: "EXPLICIT", derivation: "原记录", sourceIds: ["BTC-M1", "GANN:2090"],
  gann: { status: "ALIGNED", turnIntent: "TOP", appliedWeightPct: 3, note: "同向", matchedWindows: ["9月10日"], supportLevels: [], resistanceLevels: [], targetLevels: [], invalidationLevels: [], sourceUrls: ["https://x.com/BTCTW0/status/2090"], newestPostedAt: "2026-09-01T00:00:00.000Z" },
};

const bars = [
  ["2026-09-07", 98, 100, 97, 99], ["2026-09-08", 99, 102, 98, 101], ["2026-09-09", 101, 105, 100, 104],
  ["2026-09-10", 104, 110, 103, 108], ["2026-09-11", 108, 109, 104, 105], ["2026-09-14", 105, 106, 102, 103], ["2026-09-15", 103, 104, 100, 101],
].map(([date, open, high, low, close]) => ({ date: String(date), open: Number(open), high: Number(high), low: Number(low), close: Number(close) }));

test("only explicit future top or bottom signals become forward samples", () => {
  const [sample] = buildGannForwardCandidates([item], "2026-09-02", "2026-09-02T02:00:00.000Z");
  assert.equal(sample?.expectedIntent, "TOP");
  assert.equal(buildGannForwardCandidates([{ ...item, focusDate: "2026-09-01" }], "2026-09-02", "2026-09-02T02:00:00.000Z").length, 0);
  assert.equal(buildGannForwardCandidates([{ ...item, gann: { ...item.gann!, turnIntent: "NEUTRAL" } }], "2026-09-02", "2026-09-02T02:00:00.000Z").length, 0);
});

test("locked snapshot stays immutable when a later candidate changes", () => {
  const [locked] = buildGannForwardCandidates([item], "2026-09-02", "2026-09-02T02:00:00.000Z");
  const changed = { ...locked!, expectedIntent: "BOTTOM" as const, lockedAt: "2026-09-03T02:00:00.000Z" };
  const [merged] = mergeGannForwardSamples([locked!], [changed], "2026-09-03");
  assert.equal(merged?.expectedIntent, "TOP");
  assert.equal(merged?.lockedAt, "2026-09-02T02:00:00.000Z");
});

test("closed daily bars score the locked turn without deleting failures", () => {
  const [sample] = buildGannForwardCandidates([item], "2026-09-02", "2026-09-02T02:00:00.000Z");
  const result = evaluateGannForwardSample(sample!, bars, "2026-09-16T00:00:00.000Z");
  assert.equal(result.verdict, "FULL");
  assert.match(result.result ?? "", /高点窗口覆盖/);
  assert.deepEqual(summarizeGannForwardSnapshot([result]), { watching: 0, pending: 0, scored: 1, full: 1, partial: 0, miss: 0, weightedAccuracyPct: 100 });

  const missedBars = bars.map((bar, index) => index === 6 ? { ...bar, high: 115, close: 114 } : bar);
  const miss = evaluateGannForwardSample(sample!, missedBars, "2026-09-16T00:00:00.000Z");
  assert.equal(miss.verdict, "MISS");
  assert.equal(summarizeGannForwardSnapshot([result, miss]).miss, 1);
});

test("automation wiring stores research state only and never touches orders", () => {
  const server = fs.readFileSync("lib/research/gann-forward-verification.server.ts", "utf8");
  const freshness = fs.readFileSync("lib/automation/content-freshness.ts", "utf8");
  assert.match(server, /trade_external_analyst_state/);
  assert.match(freshness, /runGannForwardVerificationCycle/);
  assert.ok(freshness.indexOf("runGannForwardVerificationCycle(now)") < freshness.indexOf("runDailyVerification({ now })"));
  assert.doesNotMatch(server + freshness, /submitOrder|placeOrder|newEntriesEnabled|trade_execution_outbox/);
});
