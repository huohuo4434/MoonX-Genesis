import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

const engine = () => read("lib/trading-signals/three-horizon-strategy.ts");

test("three independent strategy profiles use different horizons and holding periods", () => {
  const source = engine();
  assert.match(source, /INTRADAY:[\s\S]*environmentTimeframe: "1H"[\s\S]*directionTimeframe: "15m"[\s\S]*entryTimeframe: "5m"/);
  assert.match(source, /SWING:[\s\S]*environmentTimeframe: "1D\/1W"[\s\S]*directionTimeframe: "4H"[\s\S]*entryTimeframe: "1H"/);
  assert.match(source, /POSITION:[\s\S]*environmentTimeframe: "1M\/1W"[\s\S]*directionTimeframe: "1D"[\s\S]*entryTimeframe: "4H"/);
  assert.match(source, /maxHoldingMinutes: 8 \* 60/);
  assert.match(source, /maxHoldingMinutes: 7 \* 24 \* 60/);
  assert.match(source, /maxHoldingMinutes: 28 \* 24 \* 60/);
});

test("all new profiles default to shadow mode and require a separate demo execution gate", () => {
  const source = engine();
  assert.match(source, /VALUES \([\s\S]*'SHADOW'/);
  assert.match(source, /BITGET_DEMO_THREE_HORIZON_EXECUTION_ALLOWED/);
  assert.match(source, /profile\.mode === "SHADOW"/);
  assert.match(source, /LEGACY_MIRROR_ACTIVE/);
});

test("position sizing is derived from stop distance and capped risk rather than fixed account percentage", () => {
  const source = engine();
  assert.match(source, /stopDistance = Math\.abs\(input\.evaluation\.entryPrice - input\.evaluation\.stopLoss\)/);
  assert.match(source, /riskAmount = input\.equityUsdt \* input\.profile\.riskPerTradePct \/ 100/);
  assert.match(source, /riskQuantity = riskAmount \/ stopDistance/);
  assert.match(source, /MAX_POSITION_NOTIONAL_PCT/);
});

test("risk engine enforces daily weekly open and correlated crypto limits", () => {
  const source = engine();
  for (const token of [
    "THREE_HORIZON_DAILY_LOSS_LIMIT_PCT",
    "THREE_HORIZON_WEEKLY_LOSS_LIMIT_PCT",
    "THREE_HORIZON_OPEN_RISK_LIMIT_PCT",
    "THREE_HORIZON_CRYPTO_GROUP_RISK_LIMIT_PCT",
    "连续亏损3单",
  ]) {
    assert.match(source, new RegExp(token));
  }
});

test("Bitget orders use idempotent clientOid and exchange-side preset protection", () => {
  const client = read("lib/bitget/demo-client.ts");
  assert.match(client, /clientOid\(paperOrderId/);
  assert.match(client, /getBitgetDemoOrderByClientOid\(oid\)/);
  assert.match(client, /body\.stopLoss/);
  assert.match(client, /body\.takeProfit/);
  assert.match(client, /paptrading:\s*"1"/);
});

test("long horizon is aggregated from closed daily candles and current endpoint supports adequate history", () => {
  const source = engine();
  const client = read("lib/bitget/demo-client.ts");
  assert.match(source, /completedAggregateCandles\(d1, weekKey, now\)/);
  assert.match(source, /completedAggregateCandles\(d1, monthKey, now\)/);
  assert.match(source, /interval === "1D" \? 400 : 120/);
  assert.match(client, /Math\.min\(1000/);
});

test("server cron runs the three-horizon engine and includes it in audit reports", () => {
  const runtime = read("lib/bitget/demo-runtime.ts");
  const runtimeTypes = read("types/bitget-demo-runtime.ts");
  assert.match(runtime, /runThreeHorizonStrategyEngine/);
  assert.match(runtime, /action: "THREE_HORIZON"/);
  assert.match(runtime, /threeHorizon:/);
  assert.match(runtimeTypes, /threeHorizon: Record<string, unknown> \| null/);
});

test("admin and member desks expose the three strategy profiles and rejection reasons", () => {
  const adminPage = read("app/admin/bitget-demo/page.tsx");
  const adminClient = read("components/admin/ThreeHorizonStrategyClient.tsx");
  const memberClient = read("components/member/AiTradingDeskClient.tsx");
  const memberTypes = read("types/ai-trading-desk.ts");
  assert.match(adminPage, /ThreeHorizonStrategyClient/);
  assert.match(adminClient, /三周期策略控制台/);
  assert.match(adminClient, /最近决策审计/);
  assert.match(memberClient, /三周期策略/);
  assert.match(memberClient, /影子观察只记录机会/);
  assert.match(memberTypes, /strategies: ThreeHorizonPublicStrategy\[\]/);
});


test("mandatory entry and volatility conditions cannot be bypassed by a high score", () => {
  const source = engine();
  assert.match(source, /mandatoryKeys = profile\.strategyType === "INTRADAY"/);
  assert.match(source, /\["environment", "direction", "entry", "risk"\]/);
  assert.match(source, /\["weekly", "daily", "structure", "entry", "risk"\]/);
  assert.match(source, /missingMandatory\.length === 0/);
});

test("same-run reservations and projected risk prevent concurrent duplicate orders", () => {
  const source = engine();
  assert.match(source, /PROJECTED_OPEN_RISK_LIMIT/);
  assert.match(source, /PROJECTED_CRYPTO_GROUP_LIMIT/);
  assert.match(source, /SYMBOL_RESERVED_THIS_RUN/);
  assert.match(source, /reservedSymbols\.add\(symbol\)/);
  assert.match(source, /reservedRiskPct \+= executed\.riskReservedPct/);
});

test("runtime pause still manages existing positions without scanning new entries", () => {
  const engineSource = engine();
  const runtime = read("lib/bitget/demo-runtime.ts");
  assert.match(engineSource, /options: \{ manageOnly\?: boolean \} = \{\}/);
  assert.match(engineSource, /options\.manageOnly/);
  assert.match(runtime, /\{ manageOnly: true \}/);
  assert.match(runtime, /THREE_HORIZON_MANAGE_ONLY/);
});

test("database migration is additive and seeds only shadow profiles", () => {
  const migration = read("prisma/migrations/20260804010000_three_horizon_strategies/migration.sql");
  assert.match(migration, /CREATE TABLE IF NOT EXISTS trade_three_horizon_profiles/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS trade_three_horizon_decisions/);
  assert.match(migration, /'INTRADAY', TRUE, 'SHADOW'/);
  assert.match(migration, /'SWING', TRUE, 'SHADOW'/);
  assert.match(migration, /'POSITION', TRUE, 'SHADOW'/);
  assert.doesNotMatch(migration, /DROP\s+TABLE|DELETE\s+FROM/i);
});
