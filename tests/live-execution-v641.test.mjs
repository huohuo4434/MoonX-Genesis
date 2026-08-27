import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(resolve(root, file), "utf8");
const client = read("lib/bitget/demo-client.ts");
const engine = read("lib/trading-signals/three-horizon-strategy.ts");
const plans = read("lib/trading-signals/ai-trade-plans.ts");
const reliability = read("lib/trading-signals/trading-reliability.ts");
const reliabilityUi = read("components/admin/TradingReliabilityClient.tsx");
const liveMigration = read("prisma/migrations/20260807010000_trade_reliability_live_mode/migration.sql");

test("existing Vercel live variables are honored", () => {
  for (const token of [
    "BITGET_LIVE_MAX_DRAWDOWN_USDT",
    "BITGET_LIVE_DAILY_LOSS_USDT",
    "BITGET_LIVE_MAX_CONCURRENT_POSITIONS",
    "BITGET_LIVE_MAX_TRADES_PER_DAY",
  ]) assert.match(client, new RegExp(token));
  assert.match(client, /\["LIVE", "LIVE_EXPERIMENT", "REAL", "REAL_TRADING"\]/);
});

test("live execution keeps the qualified activity target without mechanical trade-count quotas", () => {
  for (const token of [
    "MOOX_TRADING_CONTROL_MODE",
    "const LIVE_ACTIVITY_CONTROL = readAuthoritativeTradingControlMode()",
    'LIVE_ACTIVITY_CONTROL.configured && LIVE_ACTIVITY_CONTROL.mode === "LIVE"',
    '"MOOX_LIVE_ACTIVITY_TARGET_V641", 1, 1, 5',
    "isActivityPromotionEligible(decision)",
    "LIVE_ACTIVITY_TARGET - intradayExecutedToday",
  ]) assert.ok(engine.includes(token), `missing ${token}`);
  for (const removedQuota of [
    "MOOX_LIVE_SYMBOL_TRADE_CAP_V641",
    "HORIZON_PERIOD_TRADE_CAP",
    "GLOBAL_DAILY_TRADE_CAP",
    "SYMBOL_DAILY_TRADE_CAP",
    "DAILY_TRADE_LIMIT",
  ]) assert.ok(!engine.includes(removedQuota), `obsolete quota remains: ${removedQuota}`);
});

test("live orders remain behind explicit authorization and all safety gates", () => {
  for (const token of [
    "MOOX_TRADING_CONTROL_MODE",
    "BITGET_LIVE_CONFIRMATION",
    "I_ACCEPT_REAL_LOSS",
    "getTradingReliabilityOpeningGate",
    "PROJECTED_OPEN_RISK_LIMIT",
    "PROJECTED_CRYPTO_GROUP_LIMIT",
    "PROTECTION_MISSING",
    "UNIFIED_HORIZON_POSITION_CAP",
    "UNIFIED_DAILY_LOSS_LIMIT",
    "UNIFIED_WEEKLY_LOSS_LIMIT",
    "SYMBOL_RESERVED_THIS_RUN",
  ]) assert.ok((client + engine).includes(token), `missing safety token ${token}`);
  assert.match(client, /positions\.length >= environment\.liveMaxConcurrentPositions/);
  assert.match(client, /existingPositionNotional \+ notional > perPositionLimit/);
  assert.match(client, /currentGross \+ notional > grossLimit/);
});

test("Demo header never leaks into live requests", () => {
  assert.match(client, /if \(env\.mode === "DEMO"\) headers\.paptrading = "1"/);
  assert.doesNotMatch(client, /if \(env\.mode === "LIVE_EXPERIMENT"\)[\s\S]{0,120}paptrading/);
});

test("plans and reliability correctly label the selected environment", () => {
  assert.match(plans, /profile\.mode === "LIVE" \? "BITGET_LIVE" : "BITGET_DEMO"/);
  assert.match(reliability, /UTA_V3_LIVE/);
  for (const token of ["paptrading_required=FALSE", "real_trading_locked=FALSE"]) {
    assert.ok(liveMigration.includes(token), `missing ${token}`);
  }
  assert.match(reliabilityUi, /UTA V3 Live/);
  assert.doesNotMatch(reliabilityUi, /真钱永久锁定/);
});
