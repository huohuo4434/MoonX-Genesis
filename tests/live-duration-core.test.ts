import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { evaluateLiveDuration } from "../lib/bitget/live-duration-core";
import { buildUnifiedLiveRestoreBlockers, type UnifiedLiveRestoreReadiness } from "../lib/trading-signals/unified-live-admin-control-core";

const now = new Date("2026-09-06T00:00:00Z");
const continuous = { status: "ACTIVE", durationMode: "CONTINUOUS", startedAt: "2026-08-04T00:00:00Z", endsAt: null };
test("explicit continuous operation has no 30-day expiry, including years later", () => {
  for (const time of [now, new Date("2126-09-06T00:00:00Z")]) {
    assert.equal(evaluateLiveDuration(continuous, time).active, true);
    assert.equal(evaluateLiveDuration(continuous, time).expired, false);
  }
});
test("legacy records stay fixed; null, corrupt, future and contradictory dates fail closed", () => {
  for (const record of [
    { ...continuous, durationMode: undefined }, { ...continuous, durationMode: null },
    { ...continuous, durationMode: "" }, { ...continuous, durationMode: "PENDING" },
    { ...continuous, startedAt: null }, { ...continuous, startedAt: "bad" },
    { ...continuous, startedAt: "2027-01-01Z" },
    { ...continuous, endsAt: "2027-01-01Z" }, { ...continuous, endsAt: "bad" },
  ]) assert.equal(evaluateLiveDuration(record, now).active, false, JSON.stringify(record));
  assert.equal(evaluateLiveDuration(continuous, new Date(NaN)).active, false);
});
test("expiry is inclusive and neither a stopped nor completed record is revived", () => {
  const endsAt = now.toISOString();
  const fixed = { ...continuous, durationMode: "FIXED", endsAt };
  assert.equal(evaluateLiveDuration(fixed, new Date(now.getTime() - 1)).active, true);
  assert.equal(evaluateLiveDuration(fixed, now).expired, true);
  assert.equal(evaluateLiveDuration({ ...fixed, durationMode: undefined }, now).expired, true);
  for (const status of ["COMPLETED", "STOPPED", "NOT_STARTED", "DISABLED", "UNKNOWN"]) {
    assert.equal(evaluateLiveDuration({ ...continuous, status }, now).active, false);
  }
});
const readiness: UnifiedLiveRestoreReadiness = {
  runtimeModeLive: true, liveSwitchAllowed: true, environmentAllowsNewEntries: true,
  positionManagementEnabled: true, bitgetLiveExperiment: true, liveExperiment: continuous,
  bitgetConfigured: true, bitgetExecutionAllowed: true, bitgetLiveConfirmationAccepted: true,
  initialCapitalIs1000U: true, strategyActiveExecutionEnabled: true, migrationRequired: false,
  custodyFreezeNewEntries: false,
};
test("admin accepts authoritative continuous time but retains every other gate", () => {
  assert.deepEqual(buildUnifiedLiveRestoreBlockers(readiness, now), []);
  for (const key of ["runtimeModeLive", "liveSwitchAllowed", "environmentAllowsNewEntries", "positionManagementEnabled", "bitgetConfigured", "bitgetExecutionAllowed", "bitgetLiveConfirmationAccepted", "initialCapitalIs1000U", "strategyActiveExecutionEnabled"]) {
    assert.ok(buildUnifiedLiveRestoreBlockers({ ...readiness, [key]: false }, now).length, key);
  }
  assert.ok(buildUnifiedLiveRestoreBlockers({ ...readiness, custodyFreezeNewEntries: true }, now).length);
  assert.ok(buildUnifiedLiveRestoreBlockers({ ...readiness, liveExperiment: { ...continuous, status: "COMPLETED" } }, now).length);
});
test("migration is additive only; pending drafts cannot activate runtime mode", () => {
  const sql = readFileSync("prisma/migrations/20260906022000_live_duration_mode/migration.sql", "utf8");
  assert.match(sql, /DEFAULT 'FIXED'/);
  assert.doesNotMatch(sql, /\bUPDATE\b|\bDELETE\b|\bDROP\b/i);
  for (const path of ["lib/bitget/demo-client.ts", "lib/trading-signals/ai-desk-status.ts", "lib/trading-signals/unified-live-admin-control-core.ts"]) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /evaluateLiveDuration|livePeriodReadiness/);
    assert.doesNotMatch(source, /getLiveConfigurationDraft|LIVE_CONFIGURATION_DRAFT_V1/);
  }
  assert.match(readFileSync("lib/bitget/live-period-readiness-core.ts", "utf8"), /evaluateLiveDuration/);
});
