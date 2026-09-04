import test from "node:test";
import assert from "node:assert/strict";
import {
  applyUnifiedLiveModeChange,
  buildUnifiedLiveRestoreBlockers,
  type UnifiedLiveRestoreReadiness,
} from "../lib/trading-signals/unified-live-admin-control-core";
import {
  composeRuntimePauseMessage,
  normalizeUnifiedLiveGateCodes,
} from "../lib/bitget/runtime-observability-core";

function ready(overrides: Partial<UnifiedLiveRestoreReadiness> = {}): UnifiedLiveRestoreReadiness {
  return {
    runtimeModeLive: true,
    liveSwitchAllowed: true,
    environmentAllowsNewEntries: true,
    positionManagementEnabled: true,
    bitgetLiveExperiment: true,
    liveExperiment: { status: "ACTIVE", startedAt: "2020-01-01T00:00:00Z", endsAt: "2099-01-01T00:00:00Z" },
    bitgetConfigured: true,
    bitgetExecutionAllowed: true,
    bitgetLiveConfirmationAccepted: true,
    initialCapitalIs1000U: true,
    strategyActiveExecutionEnabled: true,
    migrationRequired: false,
    custodyFreezeNewEntries: false,
    custodyIssues: [],
    ...overrides,
  };
}

test("LIVE confirmation and every failed hard gate prevent the mode write", async () => {
  let writes = 0;
  const apply = async () => {
    writes += 1;
    return { mode: "LIVE" };
  };

  for (const confirmation of [undefined, "live1000", "LIVE1000 "]) {
    const result = await applyUnifiedLiveModeChange({ mode: "LIVE", confirmation, readiness: ready(), apply });
    assert.deepEqual(result, { ok: false, error: "LIVE_CONFIRMATION_REQUIRED", blockers: [] });
  }

  const blocked = await applyUnifiedLiveModeChange({
    mode: "LIVE",
    confirmation: "LIVE1000",
    readiness: ready({
      runtimeModeLive: false,
      bitgetConfigured: false,
      migrationRequired: true,
      custodyFreezeNewEntries: true,
      custodyIssues: [{ code: "SITE_ONLY_POSITION", severity: "BLOCKER", detail: "仓位尚未完成托管" }],
    }),
    apply,
  });
  assert.equal(blocked.ok, false);
  if (!blocked.ok) {
    assert.equal(blocked.error, "LIVE_SWITCH_BLOCKED");
    assert.deepEqual(
      blocked.blockers.map((item) => item.code),
      ["RUNTIME_MODE_NOT_LIVE", "BITGET_CREDENTIALS_MISSING", "UNIFIED_LIVE_MIGRATION_REQUIRED", "SITE_ONLY_POSITION"],
    );
  }
  assert.equal(writes, 0);
});

test("only exact confirmation plus all hard gates applies LIVE once", async () => {
  const modes: string[] = [];
  const result = await applyUnifiedLiveModeChange({
    mode: "LIVE",
    confirmation: "LIVE1000",
    readiness: ready(),
    apply: async (mode) => {
      modes.push(mode);
      return { mode };
    },
  });
  assert.deepEqual(result, { ok: true, account: { mode: "LIVE" } });
  assert.deepEqual(modes, ["LIVE"]);
});

test("restore blockers are fixed and do not expose readiness values or raw errors", () => {
  const blockers = buildUnifiedLiveRestoreBlockers(ready({
    liveSwitchAllowed: false,
    environmentAllowsNewEntries: false,
    bitgetLiveConfirmationAccepted: false,
    initialCapitalIs1000U: false,
  }));
  assert.deepEqual(blockers.map((item) => item.code), [
    "LIVE_SWITCH_NOT_ALLOWED",
    "ENV_NEW_ENTRIES_DISABLED",
    "BITGET_LIVE_CONFIRMATION_MISSING",
    "LIVE_CAPITAL_NOT_1000U",
  ]);
  assert.equal(JSON.stringify(blockers).includes("process.env"), false);
});

test("experiment must be active and within valid start/end bounds, including exact expiry", async () => {
  const now = new Date("2026-09-04T15:00:00Z");
  const valid = { status: "ACTIVE", startedAt: "2026-09-01T00:00:00Z", endsAt: "2026-09-05T00:00:00Z" };
  const cases: Array<[UnifiedLiveRestoreReadiness["liveExperiment"], string]> = [
    [null, "LIVE_EXPERIMENT_UNAVAILABLE"],
    [undefined, "LIVE_EXPERIMENT_UNAVAILABLE"],
    [{ ...valid, endsAt: now.toISOString() }, "LIVE_EXPERIMENT_EXPIRED"],
    [{ ...valid, endsAt: "2026-09-03T15:30:36Z" }, "LIVE_EXPERIMENT_EXPIRED"],
    [{ ...valid, status: "COMPLETED" }, "LIVE_EXPERIMENT_EXPIRED"],
    [{ ...valid, status: "STOPPED" }, "LIVE_EXPERIMENT_STOPPED"],
    [{ ...valid, status: "NOT_STARTED", startedAt: null, endsAt: null }, "LIVE_EXPERIMENT_NOT_STARTED"],
    [{ ...valid, startedAt: "2026-09-04T16:00:00Z" }, "LIVE_EXPERIMENT_NOT_DUE"],
    [{ ...valid, startedAt: null }, "LIVE_EXPERIMENT_INVALID"],
    [{ ...valid, endsAt: "garbage" }, "LIVE_EXPERIMENT_INVALID"],
    [{ ...valid, startedAt: valid.endsAt }, "LIVE_EXPERIMENT_INVALID"],
    [{ ...valid, status: "UNKNOWN" }, "LIVE_EXPERIMENT_INVALID"],
  ];
  for (const [liveExperiment, code] of cases) {
    assert.deepEqual(buildUnifiedLiveRestoreBlockers(ready({ liveExperiment }), now).map((item) => item.code), [code]);
  }
  assert.deepEqual(buildUnifiedLiveRestoreBlockers(ready({ liveExperiment: valid }), now), []);
  assert.deepEqual(buildUnifiedLiveRestoreBlockers(ready({ liveExperiment: { ...valid, startedAt: now } }), now), []);
  let writes = 0;
  const expired = ready({ liveExperiment: { ...valid, endsAt: "2000-01-01T00:00:00Z" } });
  assert.equal((await applyUnifiedLiveModeChange({ mode: "LIVE", confirmation: "LIVE1000", readiness: expired, apply: async () => ++writes })).ok, false);
  assert.equal(writes, 0);
  for (const mode of ["MANAGE_ONLY", "PAUSED"] as const) {
    assert.equal((await applyUnifiedLiveModeChange({ mode, readiness: expired, apply: async () => ++writes })).ok, true);
  }
  assert.equal(writes, 2);
});

test("every LIVE hard gate has one deterministic blocker code", () => {
  const cases: Array<[keyof UnifiedLiveRestoreReadiness, boolean, string]> = [
    ["runtimeModeLive", false, "RUNTIME_MODE_NOT_LIVE"],
    ["liveSwitchAllowed", false, "LIVE_SWITCH_NOT_ALLOWED"],
    ["environmentAllowsNewEntries", false, "ENV_NEW_ENTRIES_DISABLED"],
    ["positionManagementEnabled", false, "POSITION_MANAGEMENT_DISABLED"],
    ["bitgetLiveExperiment", false, "BITGET_MODE_NOT_LIVE_EXPERIMENT"],
    ["bitgetConfigured", false, "BITGET_CREDENTIALS_MISSING"],
    ["bitgetExecutionAllowed", false, "BITGET_EXECUTION_DISABLED"],
    ["bitgetLiveConfirmationAccepted", false, "BITGET_LIVE_CONFIRMATION_MISSING"],
    ["initialCapitalIs1000U", false, "LIVE_CAPITAL_NOT_1000U"],
    ["strategyActiveExecutionEnabled", false, "TRADING_CONTROL_MODE_BLOCKED"],
    ["migrationRequired", true, "UNIFIED_LIVE_MIGRATION_REQUIRED"],
    ["custodyFreezeNewEntries", true, "CUSTODY_BLOCKER_PRESENT"],
  ];
  for (const [field, value, expectedCode] of cases) {
    const blockers = buildUnifiedLiveRestoreBlockers(ready({ [field]: value }));
    assert.deepEqual(blockers.map((item) => item.code), [expectedCode], field);
  }
});

test("PAUSED_SKIP keeps the unified blocker when market or account is also unavailable", () => {
  const message = composeRuntimePauseMessage({
    primaryReason: "行情读取失败或数据不足，本轮禁止新开仓。",
    forcedManageOnly: true,
    forcedManageOnlyReason: "ACCOUNT_NEW_ENTRIES_DISABLED,RUNTIME_MODE_MANAGE_ONLY",
  });
  assert.match(message, /行情读取失败/);
  assert.match(message, /ACCOUNT_NEW_ENTRIES_DISABLED,RUNTIME_MODE_MANAGE_ONLY/);
  assert.equal(
    normalizeUnifiedLiveGateCodes("postgres://admin:secret@host"),
    "UNIFIED_LIVE_GATE_BLOCKED",
  );
  assert.equal(
    composeRuntimePauseMessage({ primaryReason: "账户暂停", forcedManageOnly: false, forcedManageOnlyReason: "SECRET" }),
    "账户暂停",
  );
  const engineFailureSummary = composeRuntimePauseMessage({
    primaryReason: "Three-horizon engine failed; no post-engine order chain was started.",
    forcedManageOnly: true,
    forcedManageOnlyReason: "ACCOUNT_NEW_ENTRIES_DISABLED",
  });
  assert.match(engineFailureSummary, /Three-horizon engine failed/);
  assert.match(engineFailureSummary, /ACCOUNT_NEW_ENTRIES_DISABLED/);
});
