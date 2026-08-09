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

test("live execution keeps one activation target with small risk and hard caps", () => {
  for (const token of [
    "MOOX_LIVE_ACTIVE_EXECUTION_V641",
    'MOOX_LIVE_ACTIVITY_TARGET_V641", 1, 0, 4',
    "MOOX_LIVE_ACTIVITY_PROBE_RISK_PCT_V641",
    "MOOX_LIVE_SYMBOL_TRADE_CAP_V641",
    "DAILY_MINIMUM_EXECUTION",
    "environment.liveMaxTradesPerDay",
    "decisionRewardRisk(decision) >= 1.05",
  ]) assert.ok(engine.includes(token), `missing ${token}`);
});

test("live orders remain behind explicit authorization and all safety gates", () => {
  for (const token of [
    "BITGET_LIVE_EXECUTION_ALLOWED",
    "BITGET_LIVE_CONFIRMATION",
    "I_ACCEPT_REAL_LOSS",
    "getTradingReliabilityOpeningGate",
    "PROJECTED_OPEN_RISK_LIMIT",
    "PROJECTED_CRYPTO_GROUP_LIMIT",
    "PROTECTION_MISSING",
    "GLOBAL_DAILY_TRADE_CAP",
    "SYMBOL_DAILY_TRADE_CAP",
  ]) assert.ok((client + engine).includes(token), `missing safety token ${token}`);
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
