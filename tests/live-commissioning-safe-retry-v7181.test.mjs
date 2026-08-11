import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const plans = fs.readFileSync("lib/trading-signals/ai-trade-plans.ts", "utf8");
const recovery = fs.readFileSync("lib/bitget/live-commissioning-recovery-core.ts", "utf8");
const renewal = fs.readFileSync("lib/trading-signals/ai-plan-renewal-core.ts", "utf8");
const migration = fs.readFileSync(
  "prisma/migrations/20260811143000_live_commissioning_safe_retry/migration.sql",
  "utf8"
);

test("commissioning retry requires authoritative zero-state and an absent non-dispatched order", () => {
  for (const guard of [
    "storedFailures.length !== 1",
    "stored.remoteSubmissionAttempted !== false",
    'stored.failureStage === "AMBIGUOUS_WRITE"',
    "exactOrder !== null",
    "positions.some",
    "openOrders.length !== 0",
    "strategies.length !== 0",
  ]) {
    assert.match(recovery, new RegExp(guard.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(plans, /auditBitgetLiveCommissioningRecovery/);
});

test("recovery is scoped to failed live commissioning and preserves old identifiers", () => {
  assert.match(plans, /input\.decision\.rejectionCode === "LIVE_COMMISSIONING"/);
  assert.match(plans, /input\.profile\.mode === "LIVE"/);
  assert.match(plans, /failedPlan\.status !== "EXECUTION_ERROR"/);
  assert.match(plans, /LIVE_COMMISSIONING_RECOVERY_VERIFIED/);
  assert.match(plans, /LIVE_COMMISSIONING_RECOVERY_CREATED/);
  assert.doesNotMatch(plans, /UPDATE trade_ai_plans SET[\s\S]{0,300}client_oid\s*=\s*NULL/);
  assert.match(renewal, /sameVersion\.status === "EXECUTION_ERROR"/);
});

test("database permits historical failures but enforces one active forecast plan", () => {
  assert.match(migration, /DROP INDEX IF EXISTS trade_ai_plans_forecast_version_unique/);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS trade_ai_plans_active_forecast_version_unique/);
  assert.match(migration, /status IN \([\s\S]*'ORDER_SUBMITTED'[\s\S]*'OPEN'[\s\S]*'REDUCED'/);
  assert.doesNotMatch(migration, /'EXECUTION_ERROR'/);
});
