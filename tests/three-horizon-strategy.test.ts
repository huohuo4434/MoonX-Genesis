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

test("profiles seed safely in shadow but switch to active Demo when the primary Demo gate is enabled", () => {
  const source = engine();
  assert.match(source, /VALUES \([\s\S]*'SHADOW'/);
  assert.match(source, /MOOX_DEMO_ACTIVE_EXECUTION_V64/);
  assert.match(source, /environment\.executionAllowed && DEMO_ACTIVE_EXECUTION_ENABLED/);
  assert.match(source, /mode = 'DEMO'/);
  assert.match(source, /profile\.mode === "SHADOW"/);
  assert.match(source, /LEGACY_MIRROR_ACTIVE/);
});

test("position sizing is derived from stop distance and capped risk rather than fixed account percentage", () => {
  const source = engine();
  assert.match(source, /stopDistance = Math\.abs\(input\.evaluation\.entryPrice - input\.evaluation\.stopLoss\)/);
  assert.match(source, /riskAmount = input\.equityUsdt \* requestedRiskPct \/ 100/);
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

test("weekly forecast owns direction while technical structure only controls entry state", () => {
  const source = engine();
  const autoTrader = read("lib/trading-signals/prediction-auto-trader.ts");
  assert.match(source, /resolveAuthoritativeForecastDirection/);
  assert.match(source, /weeklyDirection: plan\.weeklyDirection/);
  assert.match(source, /日内反向只描述回撤路径，不否决或翻转周方向/);
  assert.match(source, /probeOnly: directionalEdgeProbe && !confirmationTrigger/);
  assert.match(source, /currentEntryInvalidated: marketStructure\.currentEntryInvalidated/);
  assert.match(source, /rejectionCode = "ENTRY_STRUCTURE_INVALID"/);
  assert.match(source, /仅取消本次入场并等待新位置，不自动反手/);
  assert.doesNotMatch(source, /strategyType === "INTRADAY"\) return plan\.dailyDirection/);
  assert.match(source, /const strongCountertrend = Boolean\([\s\S]{0,120}forecastDirection\(plan\) === "NEUTRAL" &&/);
  assert.match(autoTrader, /resolveWeeklyAuthoritySetup/);
  assert.doesNotMatch(autoTrader, /if \(!weekly \|\| !daily\)/);
  assert.doesNotMatch(autoTrader, /daily\.confidence < settings\.minForecastConfidence/);
  assert.equal(/supportsLong|supportsShort/.test(autoTrader), false);
});

test("Bitget orders use idempotent clientOid and exchange-side preset protection", () => {
  const client = read("lib/bitget/demo-client.ts");
  const executionCore = read("lib/bitget/live-execution-core.ts");
  assert.match(client, /clientOid\(paperOrderId/);
  assert.match(client, /getBitgetDemoOrderByClientOid\(oid\)/);
  assert.match(client, /buildUtaMarketOrderBody/);
  assert.match(executionCore, /body\.stopLoss/);
  assert.match(executionCore, /body\.takeProfit/);
  assert.match(client, /headers\.paptrading\s*=\s*"1"/);
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
  assert.match(memberClient, /AI交易执行台/);
  assert.match(memberClient, /MEMBER_FEED/);
  assert.match(memberClient, /LIVE_EXPERIMENT/);
  assert.match(memberClient, /PAPER/);
  assert.match(memberClient, /技术分析不参与多空方向投票/);
  assert.match(memberTypes, /strategies: ThreeHorizonPublicStrategy\[\]/);
});


test("active execution supports a smaller probe before exact entry confirmation while keeping risk mandatory", () => {
  const source = engine();
  assert.match(source, /executionTier: "FULL" \| "PROBE" \| "OBSERVE"/);
  assert.match(source, /const fullReady = Boolean\([\s\S]*entryMet/);
  assert.match(source, /const probeReady = Boolean\([\s\S]*profile\.strategyType !== "POSITION"/);
  assert.match(source, /baseValid = Boolean\(direction !== "NEUTRAL" && currentPrice && prices && riskMet && !context\.currentEntryInvalidated\)/);
  assert.match(source, /PROBE_RISK_SCALE/);
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
  assert.match(engineSource, /options: \{[\s\S]*manageOnly\?: boolean;[\s\S]*\} = \{\}/);
  assert.match(engineSource, /options\.manageOnly/);
  assert.match(runtime, /\{ manageOnly: true \}/);
  assert.match(runtime, /THREE_HORIZON_MANAGE_ONLY/);
});



test("v6.4 active Demo uses a two-trade activity target, hard caps and staged entries", () => {
  const source = engine();
  assert.match(source, /MOOX_DEMO_ACTIVITY_TARGET_V64/);
  assert.match(source, /MOOX_DEMO_GLOBAL_TRADE_CAP_V64/);
  assert.match(source, /MOOX_DEMO_SYMBOL_TRADE_CAP_V64/);
  assert.match(source, /DAILY_ACTIVITY_PROBE/);
  assert.match(source, /entryStage: 1/);
  assert.match(source, /entryStage: 2/);
  assert.match(source, /scale-in-2/);
});

test("locked Liu Yao priors are soft directional inputs and never replace fresh risk controls", () => {
  const source = engine();
  const priors = read("lib/trading-signals/hexagram-direction-priors.ts");
  assert.match(source, /getHexagramDirectionPrior/);
  assert.match(source, /priorWeight/);
  assert.match(source, /riskMet/);
  for (const symbol of ["BTCUSDT", "ETHUSDT", "HYPEUSDT", "MUUSDT", "QQQUSDT", "SPYUSDT", "XAUTUSDT", "XAGUSDT", "CLUSDT"]) {
    assert.match(priors, new RegExp(symbol));
  }
  assert.match(priors, /phaseShiftToleranceDays: 1/);
});

test("Demo leverage defaults to two while paptrading isolation remains mandatory", () => {
  const client = read("lib/bitget/demo-client.ts");
  assert.match(client, /BITGET_DEMO_LEVERAGE \?\? 2/);
  assert.match(client, /headers\.paptrading\s*=\s*"1"/);
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

test("v6.4.1 live active execution keeps one small activation target without removing hard caps", () => {
  const source = engine();
  const client = read("lib/bitget/demo-client.ts");
  assert.match(source, /MOOX_LIVE_ACTIVE_EXECUTION_V641/);
  assert.match(source, /MOOX_LIVE_ACTIVITY_TARGET_V641", 1, 0, 4/);
  assert.match(source, /MOOX_LIVE_ACTIVITY_PROBE_RISK_PCT_V641/);
  assert.match(source, /LIVE_SYMBOL_TRADE_CAP/);
  assert.match(source, /environment\.liveMaxTradesPerDay/);
  assert.match(source, /DAILY_MINIMUM_EXECUTION/);
  assert.match(client, /BITGET_LIVE_MAX_TRADES_PER_DAY/);
  assert.match(client, /BITGET_LIVE_DAILY_LOSS_USDT/);
  assert.match(client, /BITGET_LIVE_MAX_DRAWDOWN_USDT/);
});

test("live and demo plans are labeled separately while Demo paptrading remains isolated", () => {
  const plans = read("lib/trading-signals/ai-trade-plans.ts");
  const planTypes = read("types/ai-trade-plan.ts");
  const client = read("lib/bitget/demo-client.ts");
  assert.match(plans, /profile\.mode === "LIVE" \? "BITGET_LIVE" : "BITGET_DEMO"/);
  assert.match(planTypes, /"BITGET_LIVE"/);
  assert.match(client, /if \(env\.mode === "DEMO"\) headers\.paptrading = "1"/);
});
