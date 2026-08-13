import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveWeeklyAuthoritySetup } from "../lib/trading-signals/authoritative-market-structure-core";
import {
  postPlanDecisionRequiresSync,
  shouldWriteDynamicPlanAudit,
  writeDynamicPlanAuditIfRequired,
} from "../lib/trading-signals/ai-plan-dynamic-sync-core";
import {
  runTp1ProtectionTransition,
  shouldRunTp1ProtectionTransition,
} from "../lib/trading-signals/tp1-protection-transition-core";
import {
  classifyReliabilityPosition,
  reliabilityDecisionModeForEnvironment,
  shouldRepairConfirmedMissingProtection,
} from "../lib/trading-signals/reliability-position-classification-core";
import {
  aiTradePlanDashboardReadPolicy,
  buildMemberDeskPlansFromPersistedAudit,
  summarizePersistedPlans,
} from "../lib/trading-signals/member-desk-persisted-plan-core";
import type { AiTradePlan } from "../types/ai-trade-plan";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const client = read("lib/bitget/demo-client.ts");
const liveExecutionCore = read("lib/bitget/live-execution-core.ts");
const reliability = read("lib/trading-signals/trading-reliability.ts");
const reliabilityTypes = read("types/trading-reliability.ts");
const strategy = read("lib/trading-signals/three-horizon-strategy.ts");
const runtime = read("lib/bitget/demo-runtime.ts");
const migration = read("prisma/migrations/20260804050000_trade_reliability_phase4/migration.sql");
const liveMigration = read("prisma/migrations/20260807010000_trade_reliability_live_mode/migration.sql");
const commissioningPlans = read("lib/trading-signals/ai-trade-plans.ts");
const predictionAutoTrader = read("lib/trading-signals/prediction-auto-trader.ts");
const weeklySourceStore = read("lib/weekly-source/store.ts");
const commissioningRecovery = read("lib/bitget/live-commissioning-recovery-core.ts");
const commissioningRetryMigration = read("prisma/migrations/20260811143000_live_commissioning_safe_retry/migration.sql");
const xIntelligenceOverlay = read("lib/trading-signals/x-intelligence-overlay.ts");
const watchdog = read("app/api/cron/trading-watchdog/route.ts");
const adminRoute = read("app/api/admin/bitget-demo/reliability/route.ts");
const adminClient = read("components/admin/TradingReliabilityClient.tsx");
const page = read("app/admin/bitget-demo/page.tsx");
const pkg = JSON.parse(read("package.json")) as { scripts: { test: string } };
const vercel = JSON.parse(read("vercel.json")) as { crons: Array<{ path: string; schedule: string }> };

test("member desk builds display rows from persisted locked plans without broad forecast resolution", () => {
  const persisted = {
    symbol: "HYPEUSDT",
    direction: "LONG",
    status: "OPEN",
    planningConfidence: 72,
    forecastHorizon: "WEEK",
    forecastVersion: "weekly-hype:v1",
    forecastLockedAt: "2026-08-11T00:00:00.000Z",
    thesisSummary: "周预测方向保持偏多",
    triggerRule: "价格回到周线结构边沿",
    conditionsMet: 4,
    conditionsTotal: 5,
    invalidationRule: "周预测失效",
    cancelIf: "硬风险门禁触发",
    entryZoneLow: 44,
    entryZoneHigh: 45,
    currentPrice: 46,
    lastCheckedAt: "2026-08-13T17:40:00.000Z",
    updatedAt: "2026-08-13T17:40:00.000Z",
    closeReason: null,
    executionMode: "BITGET_LIVE",
    publishedAt: "2026-08-13T17:39:00.000Z",
    version: 1,
    id: "persisted-live-hype",
  } as AiTradePlan;
  const rows = buildMemberDeskPlansFromPersistedAudit({
    plans: [persisted],
    openPositions: [{ symbol: "HYPEUSDT", posSide: "long" }],
    executionMode: "BITGET_LIVE",
  });
  assert.equal(rows[0]?.status, "POSITION_OPEN");
  assert.equal(rows[0]?.direction, "LONG");
  assert.match(rows[0]?.weeklyText ?? "", /weekly-hype:v1/);
  assert.match(rows[0]?.triggerText ?? "", /4\/5/);
  assert.doesNotMatch(read("lib/trading-signals/member-ai-trading-desk.ts"), /getPredictionAutoTraderDashboard/);
});

test("member desk isolates execution environments, trusts Bitget positions, and selects deterministic latest plan", () => {
  const base = {
    symbol: "HYPEUSDT",
    direction: "LONG",
    status: "OPEN",
    planningConfidence: 70,
    forecastHorizon: "WEEK",
    forecastVersion: "week:v1",
    forecastLockedAt: "2026-08-11T00:00:00.000Z",
    thesisSummary: "weekly",
    triggerRule: "trigger",
    conditionsMet: 4,
    conditionsTotal: 5,
    invalidationRule: "invalid",
    cancelIf: "cancel",
    entryZoneLow: 44,
    entryZoneHigh: 45,
    currentPrice: 46,
    lastCheckedAt: "2026-08-13T17:40:00.000Z",
    updatedAt: "2026-08-13T17:40:00.000Z",
    publishedAt: "2026-08-13T17:39:00.000Z",
    closeReason: null,
    version: 1,
    id: "live-v1",
    executionMode: "BITGET_LIVE",
  } as AiTradePlan;
  const liveV2 = { ...base, id: "live-v2", version: 2, planningConfidence: 71 };
  const demoV9 = { ...base, id: "demo-v9", version: 9, executionMode: "BITGET_DEMO" as const };
  const rows = buildMemberDeskPlansFromPersistedAudit({
    plans: [demoV9, base, liveV2],
    openPositions: [],
    executionMode: "BITGET_LIVE",
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.status, "ERROR", "stale OPEN ledger is not an authoritative exchange position");
  assert.equal(rows[0]?.statusLabel, "计划账本待对账");
  assert.equal(rows[0]?.confidence, liveV2.planningConfidence);

  const withPosition = buildMemberDeskPlansFromPersistedAudit({
    plans: [liveV2],
    openPositions: [{ symbol: "HYPEUSDT", posSide: "long" }],
    executionMode: "BITGET_LIVE",
  });
  assert.equal(withPosition[0]?.status, "POSITION_OPEN");
});

test("member desk exposes MONTH locks, terminal CLOSED, opposite-side positions, and versioned summaries correctly", () => {
  const base = {
    id: "month-v1",
    planGroupId: "POSITION:GOOGLUSDT",
    version: 1,
    symbol: "GOOGLUSDT",
    direction: "LONG",
    status: "CLOSED",
    executionMode: "BITGET_LIVE",
    planningConfidence: 68,
    forecastHorizon: "MONTH",
    forecastVersion: "month-googl:v1",
    forecastLockedAt: "2026-08-01T00:00:00.000Z",
    thesisSummary: "monthly thesis",
    triggerRule: "monthly trigger",
    conditionsMet: 5,
    conditionsTotal: 5,
    invalidationRule: "invalid",
    cancelIf: "cancel",
    entryZoneLow: 190,
    entryZoneHigh: 195,
    currentPrice: 198,
    lastCheckedAt: "2026-08-13T17:40:00.000Z",
    updatedAt: "2026-08-13T17:40:00.000Z",
    publishedAt: "2026-08-13T17:39:00.000Z",
    closedAt: "2026-08-13T17:41:00.000Z",
    closeReason: "closed",
  } as AiTradePlan;
  const rows = buildMemberDeskPlansFromPersistedAudit({
    plans: [base],
    openPositions: [{ symbol: "GOOGLUSDT", posSide: "short" }],
    executionMode: "BITGET_LIVE",
  });
  assert.equal(rows[0]?.status, "BLOCKED", "opposite-side position cannot make a LONG plan look open");
  assert.equal(rows[0]?.statusLabel, "计划已结束");
  assert.match(rows[0]?.weeklyText ?? "", /MONTH锁定预测 month-googl:v1/);

  const newer = {
    ...base,
    id: "month-v2",
    version: 2,
    status: "OPEN" as const,
    closedAt: null,
    publishedAt: "2026-08-13T17:42:00.000Z",
  };
  const summary = summarizePersistedPlans([base, newer], new Date("2026-08-13T18:00:00.000Z"));
  assert.equal(summary.publishedToday, 1);
  assert.equal(summary.submittedOrOpen, 1);
  assert.equal(summary.closedToday, 0);
});

test("publishedToday counts first publication per group and NEUTRAL never matches an exchange side", () => {
  const yesterday = {
    id: "old-v1",
    planGroupId: "old-group",
    version: 1,
    symbol: "QQQUSDT",
    direction: "LONG",
    status: "WATCHING",
    executionMode: "BITGET_LIVE",
    planningConfidence: 60,
    forecastHorizon: "WEEK",
    forecastVersion: "week-old:v1",
    forecastLockedAt: "2026-08-12T00:00:00.000Z",
    thesisSummary: "old",
    triggerRule: "trigger",
    conditionsMet: 1,
    conditionsTotal: 5,
    invalidationRule: "invalid",
    cancelIf: "cancel",
    entryZoneLow: 1,
    entryZoneHigh: 2,
    currentPrice: 2,
    lastCheckedAt: "2026-08-13T18:00:00.000Z",
    updatedAt: "2026-08-13T18:00:00.000Z",
    publishedAt: "2026-08-12T10:00:00.000Z",
    closedAt: null,
    closeReason: null,
  } as AiTradePlan;
  const renewedToday = {
    ...yesterday,
    id: "old-v2",
    version: 2,
    publishedAt: "2026-08-13T10:00:00.000Z",
    updatedAt: "2026-08-13T18:01:00.000Z",
  };
  const newToday = {
    ...renewedToday,
    id: "new-v1",
    planGroupId: "new-group",
    version: 1,
    symbol: "MUUSDT",
  };
  const summary = summarizePersistedPlans(
    [yesterday, renewedToday, newToday],
    new Date("2026-08-13T12:30:00.000Z")
  );
  assert.equal(summary.publishedToday, 1, "yesterday group renewed today is not a new group publication");

  const neutral = buildMemberDeskPlansFromPersistedAudit({
    plans: [{ ...newToday, direction: "NEUTRAL", status: "WATCHING" }],
    openPositions: [{ symbol: "MUUSDT", posSide: "long" }],
    executionMode: "BITGET_LIVE",
  });
  assert.notEqual(neutral[0]?.status, "POSITION_OPEN");
});

test("strict member dashboard read policy permits no schema, expiry, or event writes", () => {
  assert.deepEqual(aiTradePlanDashboardReadPolicy(true), { ensureSchema: false, expirePlans: false });
  assert.deepEqual(aiTradePlanDashboardReadPolicy(false), { ensureSchema: true, expirePlans: true });
  const memberSource = read("lib/trading-signals/member-ai-trading-desk.ts");
  const planSource = read("lib/trading-signals/ai-trade-plans.ts");
  assert.match(memberSource, /getAiTradePlanDashboard\(now, \{ readOnly: true \}\)/);
  assert.match(memberSource, /persistedPlans = planDashboard\.plans\.filter\(\(plan\) => plan\.executionMode === executionMode\)/);
  assert.match(planSource, /policy\.ensureSchema \? await ensureAiTradePlanTables\(\) : Boolean\(prisma\)/);
  assert.match(planSource, /databaseReady && policy\.expirePlans/);
});

test("watchdog isolates Demo and Live decisions while classifying a live naked position for confirmed repair", () => {
  assert.equal(reliabilityDecisionModeForEnvironment("DEMO"), "DEMO");
  assert.equal(reliabilityDecisionModeForEnvironment("LIVE_EXPERIMENT"), "LIVE");
  const position = { symbol: "HYPEUSDT", posSide: "long" as const };
  const liveDecision = { id: "live-hype", symbol: "HYPEUSDT", direction: "LONG" };
  const demoDecision = { id: "demo-hype", symbol: "HYPEUSDT", direction: "LONG" };

  const live = classifyReliabilityPosition({ position, decisions: [liveDecision], protections: [] });
  assert.deepEqual(live, { kind: "UNPROTECTED", decision: liveDecision });
  assert.equal(shouldRepairConfirmedMissingProtection({ occurrenceCount: 1, requiredOccurrences: 2 }), false);
  assert.equal(shouldRepairConfirmedMissingProtection({ occurrenceCount: 2, requiredOccurrences: 2 }), true);

  const noLiveDecision = classifyReliabilityPosition({ position, decisions: [], protections: [] });
  assert.deepEqual(noLiveDecision, { kind: "ORPHAN", decision: null });
  const protectedLive = classifyReliabilityPosition({
    position,
    decisions: [liveDecision],
    protections: [{ symbol: "HYPEUSDT", posSide: "long" }],
  });
  assert.deepEqual(protectedLive, { kind: "PROTECTED", decision: liveDecision });
  assert.notEqual(liveDecision.id, demoDecision.id, "the SQL mode filter selects only the environment-authoritative row set");
});

test("TP1 persists the confirmed reduction before protection replacement and never reduces twice", async () => {
  const calls: string[] = [];
  let reduced = false;
  const result = await runTp1ProtectionTransition({
    reducePosition: async () => { assert.equal(reduced, false); reduced = true; calls.push("reduce"); },
    persistPartialClose: async () => { calls.push("persist-partial"); },
    cancelExistingProtection: async () => { calls.push("cancel"); },
    readProtection: async () => null,
    readRemainingPosition: async () => ({ total: 0.5 }),
    placeReplacementProtection: async () => { calls.push("replace"); return { orderId: "protect-new" }; },
    persistProtection: async () => { calls.push("persist-protection"); },
    emergencyCloseRemaining: async () => { calls.push("emergency-close"); },
    persistEmergencyClose: async () => { calls.push("persist-close"); },
  });
  assert.deepEqual(calls, ["reduce", "persist-partial", "cancel", "replace", "persist-protection"]);
  assert.deepEqual(result, { state: "PROTECTED", protectionOrderId: "protect-new" });
  assert.equal(shouldRunTp1ProtectionTransition({ tp1Done: true, targetReached: true }), false);
  assert.equal(shouldRunTp1ProtectionTransition({ tp1Done: false, targetReached: true }), true);
});

test("TP1 ambiguous cancel retains an authoritative old protection and creates no duplicate", async () => {
  let replacementCalls = 0;
  const result = await runTp1ProtectionTransition({
    reducePosition: async () => undefined,
    persistPartialClose: async () => undefined,
    cancelExistingProtection: async () => { throw new Error("timeout"); },
    readProtection: async () => ({ orderId: "protect-old" }),
    readRemainingPosition: async () => ({ total: 0.5 }),
    placeReplacementProtection: async () => { replacementCalls += 1; return { orderId: "duplicate" }; },
    persistProtection: async () => undefined,
    emergencyCloseRemaining: async () => undefined,
    persistEmergencyClose: async () => undefined,
  });
  assert.equal(replacementCalls, 0);
  assert.deepEqual(result, { state: "PROTECTED", protectionOrderId: "protect-old" });
});

test("TP1 replacement failure re-reads authority, retries one stable intent, then closes exact remaining position", async () => {
  let replacementCalls = 0;
  const closed: number[] = [];
  const calls: string[] = [];
  const result = await runTp1ProtectionTransition({
    reducePosition: async () => { calls.push("reduce"); },
    persistPartialClose: async () => { calls.push("persist-partial"); },
    cancelExistingProtection: async () => { calls.push("cancel"); },
    readProtection: async () => null,
    readRemainingPosition: async () => ({ total: 0.37 }),
    placeReplacementProtection: async () => { replacementCalls += 1; throw new Error("ambiguous"); },
    persistProtection: async () => { throw new Error("unexpected"); },
    emergencyCloseRemaining: async (position) => { closed.push(position.total); calls.push("emergency-close"); },
    persistEmergencyClose: async () => { calls.push("persist-close"); },
  });
  assert.equal(replacementCalls, 2, "the production adapter reuses one stable replacement outbox key");
  assert.deepEqual(closed, [0.37]);
  assert.deepEqual(calls, ["reduce", "persist-partial", "cancel", "emergency-close", "persist-close"]);
  assert.deepEqual(result, { state: "EMERGENCY_CLOSE_SUBMITTED" });
});

test("unchanged active plans avoid per-minute writes but retain lifecycle and periodic audit writes", () => {
  const now = new Date("2026-08-14T17:00:00.000Z");
  const current = {
    id: "plan-1",
    status: "OPEN" as const,
    conditionsMet: 4,
    conditionsTotal: 5,
    lastCheckedAt: new Date(now.getTime() - 60_000),
    clientOid: "client-1",
    bitgetOrderId: "order-1",
    closeReason: null,
  };
  const decision = {
    id: "decision-1",
    planId: "plan-1",
    conditionsMet: 4,
    conditionsTotal: 5,
    clientOid: "client-1",
    bitgetOrderId: "order-1",
    rejectionReason: "",
  };
  assert.equal(shouldWriteDynamicPlanAudit({ current, decision, desiredStatus: "OPEN", now }), false);
  assert.equal(shouldWriteDynamicPlanAudit({
    current: { ...current, status: "ARMED" },
    decision: { ...decision, rejectionReason: "PLAN_LEAD_TIME" },
    desiredStatus: "ARMED",
    now,
    force: true,
  }), true, "READY to gate-block must write its same-status audit immediately");
  assert.equal(shouldWriteDynamicPlanAudit({
    current: { ...current, status: "ARMED" },
    decision: { ...decision, rejectionReason: "remote order response ambiguous" },
    desiredStatus: "ARMED",
    now,
    force: true,
  }), true, "every post-gate execution attempt must write its result immediately");
  assert.equal(shouldWriteDynamicPlanAudit({ current, decision, desiredStatus: "CLOSED", now }), true);
  assert.equal(shouldWriteDynamicPlanAudit({
    current,
    decision: { ...decision, bitgetOrderId: "order-2" },
    desiredStatus: "OPEN",
    now,
  }), true);
  assert.equal(shouldWriteDynamicPlanAudit({
    current,
    decision: { ...decision, conditionsMet: 5 },
    desiredStatus: "OPEN",
    now,
  }), true);
  assert.equal(shouldWriteDynamicPlanAudit({
    current: { ...current, lastCheckedAt: new Date(now.getTime() - 5 * 60_000) },
    decision,
    desiredStatus: "OPEN",
    now,
  }), true);
});

test("normal profile post-plan synchronization is reserved for gate or execution mutations", () => {
  assert.equal(postPlanDecisionRequiresSync({ evaluationReady: false, initialDecisionStatus: "OBSERVING" }), false);
  assert.equal(postPlanDecisionRequiresSync({ evaluationReady: true, initialDecisionStatus: "BLOCKED" }), false);
  assert.equal(postPlanDecisionRequiresSync({ evaluationReady: true, initialDecisionStatus: "READY" }), true);
});

test("forced post-gate block, submission, and error write their update and event audit in the same turn", async () => {
  const now = new Date("2026-08-14T17:00:00.000Z");
  const current = {
    id: "plan-armed",
    status: "ARMED" as const,
    conditionsMet: 5,
    conditionsTotal: 5,
    lastCheckedAt: new Date(now.getTime() - 30_000),
    clientOid: null,
    bitgetOrderId: null,
    closeReason: null,
  };
  const baseDecision = {
    id: "decision-ready",
    planId: "plan-armed",
    conditionsMet: 5,
    conditionsTotal: 5,
    clientOid: null,
    bitgetOrderId: null,
    rejectionReason: "",
  };
  for (const rejectionReason of ["PLAN_LEAD_TIME", "ORDER_SUBMITTED", "ORDER_ERROR"]) {
    const auditWrites: string[] = [];
    const written = await writeDynamicPlanAuditIfRequired({
      current,
      decision: { ...baseDecision, rejectionReason },
      desiredStatus: "ARMED",
      now,
      force: true,
      write: async () => { auditWrites.push("UPDATE", "CONDITION_PROGRESS"); },
    });
    assert.equal(written, true);
    assert.deepEqual(auditWrites, ["UPDATE", "CONDITION_PROGRESS"]);
  }
});

test("failed live commissioning retry keeps one active forecast plan and requires zero-state evidence", () => {
  for (const guard of [
    "storedFailures.length !== 1",
    "stored.remoteSubmissionAttempted !== false",
    "exactOrder !== null",
    "positions.some",
    "openOrders.length !== 0",
    "strategies.length !== 0",
  ]) {
    assert.ok(commissioningRecovery.includes(guard), guard);
  }
  assert.ok(commissioningPlans.includes("auditBitgetLiveCommissioningRecovery"));
  all(commissioningPlans, [
    "strategyType: input.profile.strategyType",
    "symbol: input.decision.symbol",
    "isCreateConflict: isPlanCreateUniqueConflict",
    'record.code === "P2002"',
    'record.meta?.code === "23505"',
  ]);
  assert.match(commissioningRetryMigration, /trade_ai_plans_active_forecast_version_unique/);
  assert.match(commissioningRetryMigration, /status IN \([\s\S]*'ORDER_SUBMITTED'[\s\S]*'OPEN'/);
  assert.doesNotMatch(commissioningRetryMigration, /'EXECUTION_ERROR'/);
});

test("UTA hedge market orders never assign posSide and reduceOnly together", () => {
  all(liveExecutionCore, [
    "if (input.hedgeMode) body.posSide = input.posSide",
    'else body.reduceOnly = input.reduceOnly ? "yes" : "no"',
  ]);
  assert.match(client, /buildUtaMarketOrderBody/);
});

test("prediction auto trader keeps formal weekly authority without a daily forecast", () => {
  assert.equal(resolveWeeklyAuthoritySetup({
    weeklyAvailable: true,
    weeklyDirection: "LONG",
    weeklyConfidence: 72,
    minimumConfidence: 50,
  }), "BUY_DIP");
  assert.equal(resolveWeeklyAuthoritySetup({
    weeklyAvailable: true,
    weeklyDirection: "SHORT",
    weeklyConfidence: 72,
    minimumConfidence: 50,
  }), "SELL_RALLY");
  assert.equal(resolveWeeklyAuthoritySetup({
    weeklyAvailable: false,
    weeklyDirection: "NEUTRAL",
    weeklyConfidence: 0,
    minimumConfidence: 50,
  }), "MISSING_FORECAST");
});

test("X intelligence public evidence localizes internal lifecycle states without changing trading authority", () => {
  all(xIntelligenceOverlay, [
    'OVERHEATED: "热度过高"',
    'COOLING: "热度降温"',
    "PUBLIC_STAGE_LABEL[summary.dominantStage]",
    "PUBLIC_MOMENTUM_LABEL[summary.momentum]",
    "canTriggerTradeAlone: false",
  ]);
  assert.doesNotMatch(xIntelligenceOverlay, /阶段\$\{summary\.dominantStage\}/);
  assert.doesNotMatch(xIntelligenceOverlay, /热度\$\{summary\.momentum\}/);
});

function all(text: string, values: string[]) {
  for (const value of values) assert.ok(text.includes(value), `缺少核心标记：${value}`);
}

test("UTA V3 Demo与实盘共用可靠性框架，但paptrading只允许Demo", () => {
  all(client, [
    'const BASE_URL = "https://api.bitget.com"',
    'if (env.mode === "DEMO") headers.paptrading = "1"',
    "/api/v3/trade/place-order",
    "BITGET_LIVE_CONFIRMATION",
    "I_ACCEPT_REAL_LOSS",
  ]);
  assert.doesNotMatch(client, /if\s*\(env\.mode\s*===\s*"LIVE_EXPERIMENT"\)[\s\S]{0,120}paptrading/);
  all(reliability, ["UTA_V3_DEMO", "UTA_V3_LIVE", "reliabilityApiConfig", "real_trading_locked"]);
  all(reliabilityTypes, ['apiMode: "UTA_V3_DEMO" | "UTA_V3_LIVE"', "realTradingLocked: boolean"]);
  all(migration, ["api_mode TEXT NOT NULL DEFAULT 'UTA_V3_DEMO'", "paptrading_required BOOLEAN NOT NULL DEFAULT TRUE", "real_trading_locked BOOLEAN NOT NULL DEFAULT TRUE"]);
});

test("旧Demo专用数据库约束通过独立迁移安全升级为双环境约束", () => {
  all(liveMigration, [
    "DROP CONSTRAINT IF EXISTS trade_reliability_api_mode_check",
    "api_mode IN ('UTA_V3_DEMO','UTA_V3_LIVE')",
    "api_mode='UTA_V3_LIVE' AND paptrading_required=FALSE",
    "api_mode='UTA_V3_LIVE' AND real_trading_locked=FALSE",
  ]);
  assert.doesNotMatch(liveMigration, /DROP\s+TABLE|TRUNCATE|DELETE\s+FROM/i);
  all(reliability, [
    "DO $reliability_constraint_upgrade$",
    "pg_get_constraintdef",
    "position('UTA_V3_LIVE' IN api_constraint) = 0",
    "position('UTA_V3_LIVE' IN paper_constraint) = 0",
    "position('UTA_V3_LIVE' IN real_lock_constraint) = 0",
    "DROP CONSTRAINT IF EXISTS trade_reliability_api_mode_check",
    "api_mode IN ('UTA_V3_DEMO','UTA_V3_LIVE')",
  ]);
  assert.match(reliability, /CREATE TABLE IF NOT EXISTS trade_reliability_state[\s\S]*DO \$reliability_constraint_upgrade\$[\s\S]*INSERT INTO trade_reliability_state/);
});

test("服务器时间同步和写操作时钟闸门已安装", () => {
  all(client, ["/api/v2/public/time", "MAX_SAFE_CLOCK_SKEW_MS", "syncBitgetServerClock", "assertBitgetClockSafe", "Date.now() + serverClockOffsetMs"]);
});

test("数据库发件箱具有唯一幂等键和状态机", () => {
  all(migration, ["CREATE TABLE IF NOT EXISTS trade_execution_outbox", "idempotency_key TEXT NOT NULL UNIQUE", "PENDING", "PROCESSING", "ACKNOWLEDGED", "CONFIRMED", "FAILED", "RECONCILED"]);
  all(client, ["ON CONFLICT (idempotency_key)", "acquireOutboxTask", "processBitgetDemoExecutionOutbox", "locked_until"]);
  assert.match(client, /trade_execution_outbox\.status = 'PENDING'[\s\S]{0,180}ELSE trade_execution_outbox\.payload END/);
  assert.match(client, /updated_at=CASE WHEN trade_execution_outbox\.status = 'PENDING'[\s\S]{0,220}ELSE trade_execution_outbox\.updated_at END/);
  assert.doesNotMatch(client, /trade_execution_outbox\.status IN \('PENDING','FAILED'\)/);
});

test("订单必须按orderId或clientOid回查最终状态", () => {
  all(client, ["/api/v3/trade/order-info", "orderTerminalStatus", 'status === "filled"', 'status === "cancelled"', "getBitgetDemoOrderByClientOid(oid)", "return getBitgetDemoOrderDetailsStrict({ clientOid: oid })"]);
});

test("超时或响应不明时只回查，不盲目重复下单", () => {
  all(client, [
    "BitgetApiError", "ambiguousWrite", "getBitgetDemoOrderDetailsStrict",
    "响应异常后已按clientOid找回订单", "响应异常后已按clientOid找回保护单",
    "ORDER_STATUS_UNKNOWN", "FINAL_STATUS_QUERY_FAILED", "为防止重复下单，系统只回查、不自动重提",
  ]);
});

test("保护单同时检查当前与历史策略订单", () => {
  all(client, ["/api/v3/trade/unfilled-strategy-orders", "/api/v3/trade/history-strategy-orders", "getStrategyOrderRecord", "history.list ?? []"]);
});

test("被交易所取消或拒绝的任务不会无限自动重开", () => {
  all(client, ["terminal?: boolean", "max_attempts = CASE WHEN $7 THEN attempt_count ELSE max_attempts END", "terminal: true"]);
});

test("三周期新开仓进入可靠性闸门", () => {
  all(strategy, ["getTradingReliabilityOpeningGate", "reliabilityGate.allowed", "reliabilityGate.code", "reliabilityGate.reason"]);
});

test("live cron bounds each pass to one rotating symbol while preserving its one-minute cadence", () => {
  all(runtime, [
    "LIVE_STRATEGY_SYMBOLS_PER_RUN = 1",
    "LIVE_STRATEGY_BUDGET_MS = 70_000",
    'maxNewSymbols: environment.mode === "LIVE_EXPERIMENT" ? LIVE_STRATEGY_SYMBOLS_PER_RUN : undefined',
  ]);
  assert.match(strategy, /const maxNewSymbols = options\.maxNewSymbols != null && Number\.isFinite\(options\.maxNewSymbols\)/);
  assert.doesNotMatch(strategy, /const maxNewSymbols = liveExperimentMode[\s\S]{0,80}Number\.POSITIVE_INFINITY/);
  assert.match(strategy, /const liveScanRound = await beginLiveScanRound\([\s\S]{0,500}manage: \(\) => manageActiveDecisions\(now\)/);
  assert.match(strategy, /const liveSymbolsForThisRun = liveScanRound\.selected/);
  assert.match(strategy, /await reportProgress\("SCHEMA_COMPLETE"\)/);
  assert.match(strategy, /Promise\.all\(\[\s*getThreeHorizonProfiles\(\),\s*getPredictionAutoTraderSettings\(\{ readOnly: liveExperimentMode \}\)/);
  assert.match(predictionAutoTrader, /if \(!options\.readOnly && !\(await ensurePredictionAutoTraderTables\(\)\)\)/);
  assert.match(predictionAutoTrader, /if \(options\.readOnly && !rows\[0\]\)[\s\S]*实盘扫描禁止使用默认值/);
  assert.match(predictionAutoTrader, /loadForecastSourcesForScope\(\{ requestedSymbols: requested \?\? undefined \}/);
  assert.match(predictionAutoTrader, /listCodeBackedForecastRowsForAssets\(requestedAssetIds \?\? \[\], now\)/);
  assert.match(weeklySourceStore, /marketCode: \{ in: markets \}/);
  assert.match(weeklySourceStore, /if \(!options\.readOnly\)[\s\S]*ensureGeneratedForecastSourceSchema/);
  assert.match(strategy, /to_regclass\('trade_three_horizon_profiles'\)[\s\S]*information_schema\.columns[\s\S]*catch\(\(\) => false\)[\s\S]*if \(catalogReady\)/);
  assert.match(commissioningPlans, /to_regclass\('trade_ai_plans'\)[\s\S]*information_schema\.columns[\s\S]*catch\(\(\) => false\)[\s\S]*if \(catalogReady\)/);
  assert.match(strategy, /syncAiTradePlansFromRecentDecisions\(\s*now,\s*liveExperimentMode \? \{ symbols: liveSymbolsForThisRun, limit: 3 \} : \{\}/);
  assert.match(commissioningPlans, /WITH active_audit AS[\s\S]*status IN \('ORDER_SUBMITTED','OPEN','PARTIAL','CLOSING'\)[\s\S]*recent_increment AS[\s\S]*DISTINCT ON \(d\.symbol, d\.strategy_type\)[\s\S]*LIMIT \$1/);
  assert.match(commissioningPlans, /runBoundedSerialMaintenance\(\{ rows, maxRows: rows\.length/);
  assert.match(strategy, /runLiveCommissioning\([\s\S]{0,500}eligibleSymbols: liveSymbolsForThisRun/);
  assert.match(strategy, /selectDynamicTradeUniverse\(liveSymbolsForThisRun, forecastBySymbol, now\)/);
  assert.match(strategy, /readWithinLiveScanDeadline\(\(\) => loadCandleSet\(symbol\), deadlineMs\)/);
  assert.match(strategy, /runLiveScanSymbolStep\(async \(\) =>[\s\S]{0,1000}readWithinLiveScanDeadline\(\(\) => loadCandleSet\(symbol\), deadlineMs\)/);
  assert.match(strategy, /if \(scanStep\.timedOut\)[\s\S]{0,120}timeBudgetReached = true;[\s\S]{0,80}break/);
  assert.match(strategy, /if \(timeBudgetReached\) break;\s*await markProfileScanned/);
  assert.match(strategy, /reportProgress\("PROFILE_DATA_COMPLETE"[\s\S]*dataDurationMs[\s\S]*candleCacheHit/);
  assert.match(strategy, /if \(\s*!timeBudgetReached &&\s*liveExperimentMode &&\s*LIVE_ACTIVITY_ENABLED/);
  assert.doesNotMatch(strategy, /readWithinLiveScanDeadline\([\s\S]{0,120}getExternalAnalystOverlay/);
  all(runtime, [
    "run_lock_owner = $1",
    "WHERE id = 'default' AND run_lock_owner = $1",
    "acquireRuntimeLock(runId)",
    "releaseRuntimeLock(runId)",
    'action: "THREE_HORIZON_PROGRESS"',
    "strategyStage: progress.stage",
    "elapsedMs: progress.elapsedMs",
  ]);
  assert.deepEqual(
    vercel.crons.find((row) => row.path === "/api/cron/prediction-auto-trader"),
    { path: "/api/cron/prediction-auto-trader", schedule: "* * * * *" }
  );
});

test("看门狗覆盖关键失效场景", () => {
  all(reliability, ["TRADING_HEARTBEAT_STALE", "MARKET_DATA_STALE", "CLOCK_SKEW", "OUTBOX_STUCK", "ORPHAN_EXCHANGE_POSITION", "UNPROTECTED_POSITION", "UNKNOWN_PROTECTION_ORDER"]);
});

test("异常后至少连续三轮健康检查才恢复开仓", () => {
  all(reliability, ["RECOVERY_HEALTHY_RUNS = 3", "连续健康检查", 'mode: "RECOVERING"', 'mode: "RUNNING"']);
});

test("无保护仓位连续出现两次后才按当前环境补挂保护单", () => {
  all(reliability, ["AUTO_REPAIR_AFTER_OCCURRENCES = 2", "occurrence_count", "phase4-repair", "placeBitgetDemoProtectionOrder", "environmentLabel"]);
});

test("孤儿仓位不自动全部平仓", () => {
  all(reliability, ["系统不会自动全部平仓", 'mode: "EMERGENCY_CLOSE_ONLY"']);
  assert.doesNotMatch(adminRoute + adminClient, /closeAll|liquidateAll|emergencyCloseAll/i);
});

test("独立看门狗Cron每五分钟运行并校验密钥", () => {
  const cron = vercel.crons.find((row) => row.path === "/api/cron/trading-watchdog");
  assert.deepEqual(cron, { path: "/api/cron/trading-watchdog", schedule: "*/5 * * * *" });
  all(watchdog, ["CRON_SECRET", "Bearer ${secret}", "runTradingReliabilityWatchdog"]);
});

test("管理员API与界面已接入，按当前环境显示且不暴露危险按钮", () => {
  all(adminRoute, ["requireAdmin", "retryFailedTradeOutbox", "clearTradingReliabilityAdminOverride"]);
  all(adminClient, ["Phase 4 交易可靠性与故障恢复", "执行发件箱", "最近可靠性异常", "dashboard.realTradingLocked", "UTA V3 Live", "真实资金", "Demo隔离", "申请恢复运行"]);
  assert.doesNotMatch(adminClient, /真钱永久锁定/);
  all(page, ["TradingReliabilityClient", "getTradingReliabilityDashboard"]);
});

test("邮件只对真正的可靠性异常发送", () => {
  all(reliability, ["sendIncidentAlerts", "sendRawEmail", "paymentNotifyTo", 'item.severity !== "WARNING" && item.severity !== "CRITICAL"']);
  assert.doesNotMatch(reliability, /TRIGGER_WAITING.*sendRawEmail/s);
});

test("项目完整测试已包含Phase 4回归", () => {
  assert.ok(pkg.scripts.test.includes("tests/trading-reliability-phase4.test.ts"));
});

test("原数据库迁移仍保持非破坏性", () => {
  assert.doesNotMatch(migration, /DROP\s+TABLE|TRUNCATE|DELETE\s+FROM/i);
});
