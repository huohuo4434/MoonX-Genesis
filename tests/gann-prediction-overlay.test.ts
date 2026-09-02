import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import type { KeyDateRadarItem } from "../lib/data/key-date-radar-core.ts";
import { applyVerifiedGannKeyDateOverlay, gannWindowContainsDate, inferGannTurnIntent, VERIFIED_GANN_RESEARCH_WEIGHT_PCT, type VerifiedGannSignal } from "../lib/research/gann-prediction-overlay-core.ts";

const item: KeyDateRadarItem = {
  id: "btc-month-2026-09-10", assetId: "btc", assetName: "比特币", symbol: "BTC", startDate: "2026-09-10", endDate: "2026-09-10", focusDate: "2026-09-10", ganzhi: "", level: "MONTH", action: "TOP_EXIT_WATCH", title: "高点观察", primaryView: "月卦正式方向：先涨后跌", weeklyAssist: "", confirmation: "等待K线确认", invalidation: "继续放量上涨则失效", confidence: 68, evidence: "EXPLICIT", derivation: "锁定记录明确点名", sourceIds: ["BTC-M1"],
};

function signal(turnIntent: VerifiedGannSignal["turnIntent"], timeWindows = ["9月9日—9月11日"]): VerifiedGannSignal {
  return { postId: `gann-${turnIntent}`, postUrl: `https://x.com/example/${turnIntent}`, postedAt: "2026-09-02T02:00:00.000Z", symbol: "BTCUSDT", direction: "LONG", turnIntent, timeWindows, supportLevels: [78000], resistanceLevels: [82000], targetLevels: [83000], invalidationLevels: [84000], summary: "前瞻测试" };
}

test("Gann date parser matches exact and ranged future windows", () => {
  assert.equal(gannWindowContainsDate("9月9日—9月11日", "2026-09-10", "2026-09-02T02:00:00.000Z"), true);
  assert.equal(gannWindowContainsDate("2026-09-10", "2026-09-10", "2026-09-02T02:00:00.000Z"), true);
  assert.equal(gannWindowContainsDate("下周", "2026-09-10", "2026-09-02T02:00:00.000Z"), true);
  assert.equal(gannWindowContainsDate("9月12日", "2026-09-10", "2026-09-02T02:00:00.000Z"), false);
  assert.equal(gannWindowContainsDate("9月10日", "2026-09-10", "2026-09-10T02:00:00.000Z"), false);
});

test("turn intent distinguishes a bullish move into a top window from a bullish continuation", () => {
  assert.equal(inferGannTurnIntent("9月10日阶段高点，关注上方压力与冲高回落"), "TOP");
  assert.equal(inferGannTurnIntent("9月10日阶段低点，支撑确认后止跌"), "BOTTOM");
  assert.equal(inferGannTurnIntent("9月10日时间窗口，等待闭合K线"), "NEUTRAL");
});

test("verified aligned Gann adds only three confidence points and never changes the locked action", () => {
  const [result] = applyVerifiedGannKeyDateOverlay([item], [signal("TOP")]);
  assert.equal(VERIFIED_GANN_RESEARCH_WEIGHT_PCT, 3);
  assert.equal(result?.confidence, 71);
  assert.equal(result?.action, "TOP_EXIT_WATCH");
  assert.equal(result?.primaryView, item.primaryView);
  assert.equal(result?.gann?.status, "ALIGNED");
  assert.equal(result?.gann?.turnIntent, "TOP");
  assert.equal(result?.gann?.appliedWeightPct, 3);
  assert.deepEqual(result?.gann?.supportLevels, [78000]);
});

test("conflicting Gann reduces confidence but cannot reverse direction or create an action", () => {
  const [result] = applyVerifiedGannKeyDateOverlay([item], [signal("BOTTOM")]);
  assert.equal(result?.confidence, 65);
  assert.equal(result?.action, item.action);
  assert.equal(result?.primaryView, item.primaryView);
  assert.equal(result?.gann?.status, "CONFLICTED");
});

test("non-overlapping or wrong-symbol Gann remains zero weight", () => {
  const wrongSymbol = { ...signal("TOP"), symbol: "ETHUSDT" };
  assert.deepEqual(applyVerifiedGannKeyDateOverlay([item], [signal("TOP", ["9月12日"])]), [item]);
  assert.deepEqual(applyVerifiedGannKeyDateOverlay([item], [wrongSymbol]), [item]);
});

test("member wiring is read-only and trading execution remains untouched", () => {
  const page = fs.readFileSync("app/member/key-dates/page.tsx", "utf8");
  const loader = fs.readFileSync("lib/research/gann-prediction-signals.server.ts", "utf8");
  assert.match(page, /applyVerifiedGannKeyDateOverlay/);
  assert.match(page, /江恩验证权重/);
  assert.match(loader, /SELECT username, post_id, post_url, posted_at, text/);
  assert.doesNotMatch(loader, /INSERT|UPDATE|DELETE|CREATE TABLE/i);
  assert.doesNotMatch(page + loader, /newEntriesEnabled|submitOrder|placeOrder|LIVE/);
});
