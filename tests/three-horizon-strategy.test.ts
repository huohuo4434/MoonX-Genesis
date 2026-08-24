import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { selectOpportunityAwareScanBatch } from "../lib/trading-signals/live-scan-rotation-core";
import { runClassifiedPlanMaintenance } from "../lib/trading-signals/ai-plan-dynamic-sync-core";
import {
  evaluateNewExposureSafety,
  evaluateWeeklyLongEntryTiming,
} from "../lib/trading-signals/weekly-long-entry-timing-core";
import {
  applyAuxiliaryDirectionConflictGuard,
  isActivityPromotionEligible,
  resolveIntradayExecutionDirection,
} from "../lib/trading-signals/intraday-direction-authority-core";

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

const engine = () => read("lib/trading-signals/three-horizon-strategy.ts");

test("live scheduling prioritizes a fresh locked weekly entry zone without changing the one-symbol cap", () => {
  const selected = selectOpportunityAwareScanBatch({
    symbols: ["BTCUSDT", "ETHUSDT", "XAUTUSDT"],
    maxItems: 1,
    nowMs: 0,
    hints: [{
      id: "eth-week-v1",
      symbol: "ETHUSDT",
      direction: "LONG",
      entryZoneLow: 99.8,
      entryZoneHigh: 100.2,
      forecastLockedAt: new Date(-60_000).toISOString(),
      forecastValidFrom: new Date(-60_000).toISOString(),
      forecastValidUntil: new Date(3_600_000).toISOString(),
      lastCheckedAt: new Date(-30_000).toISOString(),
      updatedAt: new Date(-30_000).toISOString(),
    }],
    quotes: [{ symbol: "ETHUSDT", price: 100, capturedAt: new Date(-10_000).toISOString() }],
  });
  assert.deepEqual(selected, ["ETHUSDT"]);
  assert.equal(selected.length, 1);
});

test("live plan maintenance reports bounded phase timings without changing serial lifecycle writes", async () => {
  const writes: string[] = [];
  const clock = [0, 3, 3, 8, 8, 10];
  const telemetry = await runClassifiedPlanMaintenance({
    rows: [
      { id: "material", audit: "MATERIAL" as const },
      { id: "checkpoint", audit: "CHECKPOINT" as const },
      { id: "none", audit: "NONE" as const },
    ],
    classify: (row) => row.audit,
    writeMaterial: async (row) => { writes.push(`material:${row.id}`); },
    writeCheckpoints: async (rows) => { writes.push(`checkpoint:${rows.map((row) => row.id).join(",")}`); },
    queryMs: 12,
    monotonicNowMs: () => clock.shift() ?? 10,
  });
  assert.deepEqual(writes, ["material:material", "checkpoint:checkpoint"]);
  assert.deepEqual(telemetry, {
    selected: 3,
    none: 1,
    material: 1,
    duplicateFresh: 0,
    checkpointRows: 1,
    checkpointBatchCalls: 1,
    queryMs: 12,
    materialMs: 3,
    duplicateFreshMs: 0,
    checkpointBatchMs: 5,
  });
  assert.match(engine(), /PLAN_MAINTENANCE_COMPLETE[\s\S]*queryMs: planMaintenance\.queryMs[\s\S]*duplicateFreshMs: planMaintenance\.duplicateFreshMs/);
});

test("three independent strategy profiles use different horizons and holding periods", () => {
  const source = engine();
  assert.match(source, /INTRADAY:[\s\S]*environmentTimeframe: "4H"[\s\S]*directionTimeframe: "30m"[\s\S]*entryTimeframe: "5m\/1m"/);
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
  assert.match(source, /const focusCountertrend = Boolean\([\s\S]{0,180}forecastDirection\(plan\) === "NEUTRAL" &&/);
  assert.match(source, /const strongCountertrend = focusCountertrend/);
  assert.doesNotMatch(source, /strongCountertrend\s*=\s*focusCountertrend\s*\|\|\s*baziCountertrend/);
  assert.match(source, /applyAuxiliaryDirectionConflictGuard\(baseResult, baziCountertrend\)/);
  assert.match(autoTrader, /resolveWeeklyAuthoritySetup/);
  assert.doesNotMatch(autoTrader, /if \(!weekly \|\| !daily\)/);
  assert.doesNotMatch(autoTrader, /daily\.confidence < settings\.minForecastConfidence/);
  assert.equal(/supportsLong|supportsShort/.test(autoTrader), false);
});

test("auxiliary Bazi and technical conflict cannot reverse an official side", () => {
  assert.equal(resolveIntradayExecutionDirection({
    officialDirection: "LONG",
    focusCountertrend: false,
    focusTacticalDirection: "SHORT",
  }), "LONG");
  assert.equal(resolveIntradayExecutionDirection({
    officialDirection: "SHORT",
    focusCountertrend: false,
    focusTacticalDirection: "LONG",
  }), "SHORT");
  assert.equal(resolveIntradayExecutionDirection({
    officialDirection: "NEUTRAL",
    focusCountertrend: true,
    focusTacticalDirection: "SHORT",
  }), "SHORT");
  const guarded = applyAuxiliaryDirectionConflictGuard({
    direction: "LONG" as const,
    ready: true,
    executionTier: "FULL" as const,
    riskScale: 1,
    rejectionCode: "",
    rejectionReason: "ready",
    raw: {
      executionTier: "FULL",
      riskScale: 1,
    },
  }, true);
  assert.deepEqual(guarded, {
    direction: "LONG",
    ready: false,
    executionTier: "OBSERVE",
    riskScale: 0,
    rejectionCode: "AUXILIARY_DIRECTION_CONFLICT",
    rejectionReason: "资产八字与正式方向冲突；辅助先验只能降级或阻止入场，不能反向覆盖正式方向。",
    raw: {
      executionTier: "OBSERVE",
      riskScale: 0,
      auxiliaryDirectionConflict: true,
    },
  });
});

test("daily activity targets promote only an observing low-confidence candidate", () => {
  assert.equal(isActivityPromotionEligible({ status: "OBSERVING", rejectionCode: "CONFIDENCE_LOW" }), true);
  for (const rejectionCode of [
    "AUXILIARY_DIRECTION_CONFLICT",
    "DIRECTION_EVIDENCE_LOW",
    "ENTRY_STRUCTURE_INVALID",
    "RISK_FILTER",
    "RISK_PLAN_INVALID",
    "TIMING_RISK",
    "RECONCILIATION_REQUIRED",
    "MARKET_SESSION_CLOSED",
  ]) {
    assert.equal(
      isActivityPromotionEligible({ status: "OBSERVING", rejectionCode }),
      false,
      rejectionCode,
    );
  }
  assert.equal(isActivityPromotionEligible({ status: "BLOCKED", rejectionCode: "CONFIDENCE_LOW" }), false);
  assert.equal(isActivityPromotionEligible({ status: "READY", rejectionCode: "CONFIDENCE_LOW" }), false);

  const source = engine();
  assert.equal(source.match(/isActivityPromotionEligible\(decision\) &&/g)?.length, 2);
  assert.doesNotMatch(source, /\["MARKET_ERROR", "ORDER_ERROR", "RISK_LIMIT", "PROTECTION_MISSING", "GLOBAL_DAILY_TRADE_CAP"\]\.includes\(decision\.rejectionCode\)/);
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

test("legacy 25238 hedge close recovery is narrow, versioned and preserves normal open idempotency", () => {
  const client = read("lib/bitget/demo-client.ts");
  const executionCore = read("lib/bitget/live-execution-core.ts");
  assert.match(client, /input\.reduceOnly && shouldRetryLegacyHedgeClose/);
  assert.match(client, /uta-hedge-close-v2/);
  assert.match(client, /actionType: "CLOSE_MARKET"/);
  assert.match(client, /idempotencyKey: `close:\$\{recoveryOid\}`/);
  assert.match(executionCore, /input\.actionType !== "CLOSE_MARKET"/);
  assert.match(executionCore, /input\.status !== "FAILED"/);
  assert.match(executionCore, /input\.failureStage === "AMBIGUOUS_WRITE"/);
  assert.match(executionCore, /input\.bitgetCode === "25238"/);
  assert.match(executionCore, /input\.remoteSubmissionAttempted !== false/);
  assert.match(client, /idempotencyKey: `\$\{input\.reduceOnly \? "close" : "open"\}:\$\{oid\}`/);
});

test("long horizon is aggregated from closed daily candles and current endpoint supports adequate history", () => {
  const source = engine();
  const client = read("lib/bitget/demo-client.ts");
  assert.match(source, /completedAggregateCandles\(d1, weekKey, now\)/);
  assert.match(source, /completedAggregateCandles\(d1, monthKey, now\)/);
  assert.match(source, /interval === "1D" \? 400 : interval === "1m" \? 240 : interval === "5m" \? 180 : 120/);
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


test("active execution requires an exact entry trigger even for a smaller probe", () => {
  const source = engine();
  assert.match(source, /executionTier: "FULL" \| "PROBE" \| "OBSERVE"/);
  assert.match(source, /const fullReady = Boolean\([\s\S]*entryMet/);
  assert.match(source, /const probeReady = Boolean\([\s\S]*profile\.strategyType !== "POSITION"/);
  assert.match(source, /const probeReady = Boolean\([\s\S]*!fullReady &&[\s\S]*entryMet/);
  assert.match(source, /otherwiseEligible: Boolean\(direction !== "NEUTRAL" && currentPrice && prices && riskMet && !context\.currentEntryInvalidated\)/);
  assert.match(source, /const baseValid = entryEligibility\.eligible/);
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



test("Demo keeps hard caps and staged entries without quantity-driven promotion", () => {
  const source = engine();
  assert.match(source, /const DEMO_ACTIVITY_TARGET = 0/);
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

test("live active execution is fail-closed and quantity promotion is permanently disabled", () => {
  const source = engine();
  const client = read("lib/bitget/demo-client.ts");
  assert.match(source, /MOOX_TRADING_CONTROL_MODE/);
  assert.match(source, /const LIVE_ACTIVITY_ENABLED = false/);
  assert.match(source, /LIVE_SYMBOL_TRADE_CAP/);
  assert.match(source, /environment\.liveMaxTradesPerDay/);
  assert.match(source, /HORIZON_PERIOD_TRADE_CAP/);
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

test("production new-exposure routes share the formal late-week timing and reconciliation gate", () => {
  const timing = evaluateWeeklyLongEntryTiming({
    strategyType: "SWING",
    direction: "LONG",
    weeklyPath: "SURGE_THEN_PULLBACK / 冲高回落",
    weeklyStatus: "LOCKED",
    weeklyPublishedAt: "2026-08-09T20:00:00+08:00",
    weeklyLockedAt: "2026-08-10T00:00:00+08:00",
    weeklyPeriodStart: "2026-08-10",
    weeklyPeriodEnd: "2026-08-16",
    nowMs: Date.parse("2026-08-14T12:00:00+08:00"),
    atDirectionalEdge: true,
    falseBreakReclaimed: true,
  });
  assert.equal(timing.blocked, true);
  for (const action of ["COMMISSIONING_ENTRY", "NORMAL_PROFILE_ENTRY", "DAILY_MINIMUM_ENTRY", "ACTIVITY_FALLBACK_ENTRY", "SCALE_IN"] as const) {
    const blocked = evaluateNewExposureSafety({ action, direction: "LONG", authorityReadsOk: true, ledgerConsistent: true, timing });
    assert.equal(blocked.rejectionCode, "TIMING_RISK", action);
  }
  const reconciliation = evaluateNewExposureSafety({
    action: "NORMAL_PROFILE_ENTRY",
    direction: "SHORT",
    authorityReadsOk: false,
    ledgerConsistent: false,
    timing,
  });
  assert.equal(reconciliation.rejectionCode, "RECONCILIATION_REQUIRED");
  const reduction = evaluateNewExposureSafety({
    action: "RISK_REDUCTION",
    direction: "LONG",
    authorityReadsOk: false,
    ledgerConsistent: false,
    timing,
  });
  assert.equal(reduction.allowed, true);
});
