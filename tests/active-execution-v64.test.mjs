import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const engine = read("lib/trading-signals/three-horizon-strategy.ts");
const plans = read("lib/trading-signals/ai-trade-plans.ts");
const client = read("lib/bitget/demo-client.ts");
const types = read("types/three-horizon-strategy.ts");
const priors = read("lib/trading-signals/hexagram-direction-priors.ts");

test("active Demo is still isolated from real trading", () => {
  assert.match(client, /if \(env\.mode === "DEMO"\) headers\.paptrading = "1"/);
  assert.match(client, /BITGET_LIVE_CONFIRMATION/);
  assert.match(engine, /environment\.mode === "DEMO"/);
  assert.match(engine, /profile\.mode !== "DEMO"/);
});

test("two-stage entry and wider ATR stops are present", () => {
  assert.match(engine, /atrMultiple: 1\.8, minPct: 0\.9, maxPct: 4\.5/);
  assert.match(engine, /atrMultiple: 2\.1, minPct: 1\.5, maxPct: 7/);
  assert.match(engine, /atrMultiple: 2\.5, minPct: 2\.5, maxPct: 12/);
  assert.match(engine, /executionTier === "PROBE" \? 2 : 1/);
  assert.match(engine, /scale-in-2/);
  assert.match(types, /entryStage: number/);
  assert.match(types, /scaleInOrderId: string \| null/);
});

test("activity target is a target, but unlimited trading is rejected by hard caps", () => {
  assert.match(engine, /MOOX_DEMO_ACTIVITY_TARGET_V64", 2/);
  assert.match(engine, /MOOX_DEMO_GLOBAL_TRADE_CAP_V64", 8/);
  assert.match(engine, /MOOX_DEMO_SYMBOL_TRADE_CAP_V64", 2/);
  assert.match(engine, /GLOBAL_DAILY_TRADE_CAP/);
  assert.match(engine, /SYMBOL_DAILY_TRADE_CAP/);
});

test("plan lead time no longer leaves intraday entries stale", () => {
  assert.match(plans, /INTRADAY: 2/);
  assert.match(plans, /SWING: 15/);
  assert.match(plans, /POSITION: 60/);
  assert.match(plans, /acceleratedProbe/);
  assert.match(plans, /executionConfidenceFloor/);
  assert.match(plans, /profile\.minConfidence - 8/);
  assert.match(plans, /decision\.confidence >= executionThreshold/);
});

test("all uploaded forecast groups are represented as internal soft priors", () => {
  for (const symbol of ["BTCUSDT", "ETHUSDT", "HYPEUSDT", "MUUSDT", "QQQUSDT", "SPYUSDT", "XAUTUSDT", "XAGUSDT", "CLUSDT"]) {
    assert.match(priors, new RegExp(`symbol: "${symbol}"`));
  }
  assert.match(engine, /getHexagramDirectionPrior/);
  assert.match(engine, /fresh technical evidence is indecisive/);
  assert.match(engine, /riskMet/);
});
