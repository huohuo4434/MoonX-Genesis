import test from "node:test";
import assert from "node:assert/strict";
import { buildLiveRenewalPreview, type LiveRenewalPreviewInput } from "../lib/trading-signals/live-renewal-preview-core";
const now = new Date("2026-09-04T15:00:00Z");
function evidence(): LiveRenewalPreviewInput {
  return {
    experiment: { status: "COMPLETED", started_at: "2026-08-01T00:00:00Z", ends_at: "2026-09-01T00:00:00Z", initial_equity_usdt: "1000", peak_equity_usdt: "1100", max_drawdown_usdt: "300" },
    runtime: { paused: false, run_lock_until: null, last_heartbeat_at: now.toISOString(), account_snapshot: { connected: true, checkedAt: now.toISOString(), equityUsdt: 1050, positionsCount: 0, pendingStrategyOrdersCount: 0 } },
    today: { trade_date: "2026-09-04", opening_equity_usdt: "1080" },
    pendingExecutions: 0, failedExecutions: 0, dailyLossLimit: 100, drawdownLimit: 500,
  };
}
const check = (input: LiveRenewalPreviewInput, key: string) => buildLiveRenewalPreview(input, now).checks.find((row) => row.key === key)!;
test("healthy-looking snapshots remain read-only and never authorize renewal", () => {
  const input = evidence(); const before = JSON.stringify(input);
  const result = buildLiveRenewalPreview(input, now);
  assert.equal(result.canRenew, false); assert.equal(result.writeAttempted, false); assert.equal(result.readOnly, true);
  assert.equal(result.initialEquity, 1000); assert.equal(result.peakEquity, 1100); assert.equal(result.historicalMaxDrawdown, 300);
  assert.equal(result.cumulativePnl, 50); assert.equal(result.proposedEndsAt, null);
  assert.equal(check(input, "exchange").state, "UNKNOWN"); assert.equal(check(input, "renewal").state, "BLOCKED");
  assert.equal(check(input, "positions").state, "UNKNOWN", "legacy zero protection count does not prove an empty exchange account");
  assert.match(check(input, "drawdown").detail, /50.00 USDT/);
  assert.match(check(input, "daily").detail, /-30.00 USDT/);
  assert.equal(JSON.stringify(input), before);
});

test("preview follows saved continuous or century-long settings without resetting risk or authorizing execution", () => {
  for (const durationDays of [null, 1, 36525]) {
    const input = evidence();
    input.configuration = {
      applied: false, revision: "saved-revision", savedAt: now.toISOString(),
      draft: { state: "PENDING", schemaVersion: 1, durationMode: durationDays === null ? "CONTINUOUS" : "FIXED", durationDays, capitalUsdt: "2345.67", leverage: 1 },
    };
    const before = JSON.stringify(input);
    const result = buildLiveRenewalPreview(input, now);
    assert.equal(result.proposedDurationDays, durationDays);
    assert.equal(result.proposedEndsAt, durationDays === null ? null : new Date(now.getTime() + durationDays * 86400000).toISOString());
    assert.equal(result.proposedConfiguration?.draft?.capitalUsdt, "2345.67");
    assert.equal(result.proposedConfiguration?.draft?.leverage, 1);
    assert.equal(result.proposedConfiguration?.revision, "saved-revision");
    assert.equal(result.initialEquity, 1000); assert.equal(result.peakEquity, 1100);
    assert.equal(result.historicalMaxDrawdown, 300); assert.equal(result.canRenew, false);
    assert.equal(result.writeAttempted, false); assert.equal(JSON.stringify(input), before);
  }
});

test("missing or corrupt settings never create a default budget or duration", () => {
  const valid = { applied: false, revision: "r1", savedAt: now.toISOString(), draft: { state: "PENDING", schemaVersion: 1, durationMode: "CONTINUOUS", durationDays: null, capitalUsdt: "500.00", leverage: 2 as const } };
  for (const configuration of [null, undefined, {}, { ...valid, applied: true }, { ...valid, revision: "" }, { ...valid, savedAt: "2027-01-01" }, { ...valid, draft: { ...valid.draft, capitalUsdt: "NaN" } }, { ...valid, draft: { ...valid.draft, durationDays: 30 } }, { ...valid, draft: { ...valid.draft, leverage: 3 } }]) {
    const input = evidence(); input.configuration = configuration as LiveRenewalPreviewInput["configuration"];
    const result = buildLiveRenewalPreview(input, now);
    assert.equal(result.proposedConfiguration, null); assert.equal(result.proposedDurationDays, null);
    assert.equal(result.proposedEndsAt, null); assert.equal(check(input, "configuration").state, "UNKNOWN");
    assert.equal(result.canRenew, false);
  }
});
test("legacy protection zero remains unknown, while positive exposure is blocked", () => {
  const input = evidence();
  const snapshot = input.runtime!.account_snapshot as Record<string, unknown>;
  snapshot.warning = "protection request failed";
  assert.equal(check(input, "positions").state, "UNKNOWN");
  snapshot.positionsCount = 1;
  assert.equal(check(input, "positions").state, "BLOCKED");
  snapshot.positionsCount = 0; snapshot.pendingStrategyOrdersCount = 1;
  assert.equal(check(input, "positions").state, "BLOCKED");
});
test("missing, malformed and future evidence does not turn into zero holdings or healthy risk", () => {
  const empty = buildLiveRenewalPreview({}, now);
  assert.equal(empty.initialEquity, null); assert.equal(empty.currentEquity, null);
  assert.equal(empty.checks.find((row) => row.key === "positions")?.state, "UNKNOWN");
  for (const value of [undefined, null, "", "bad", -1, false, 0.2]) {
    const input = evidence();
    (input.runtime!.account_snapshot as Record<string, unknown>).positionsCount = value;
    assert.equal(check(input, "positions").state, "UNKNOWN");
  }
  for (const checkedAt of [null, "invalid", "2026-09-04T14:56:59Z", "2026-09-04T15:01:00Z"]) {
    const input = evidence(); (input.runtime!.account_snapshot as Record<string, unknown>).checkedAt = checkedAt;
    assert.equal(check(input, "account").state, "UNKNOWN");
    assert.equal(check(input, "positions").state, "UNKNOWN");
    assert.equal(check(input, "daily").state, "UNKNOWN");
  }
});
test("exact daily loss and drawdown limits block, and new-day missing baseline stays unknown", () => {
  const input = evidence(); (input.runtime!.account_snapshot as Record<string, unknown>).equityUsdt = 980;
  assert.equal(check(input, "daily").state, "BLOCKED");
  (input.runtime!.account_snapshot as Record<string, unknown>).equityUsdt = 600;
  assert.equal(check(input, "drawdown").state, "BLOCKED");
  input.today!.trade_date = "2026-09-03";
  assert.equal(check(input, "daily").state, "UNKNOWN");
  input.dailyLossLimit = 0; input.drawdownLimit = null;
  assert.equal(check(input, "drawdown").state, "UNKNOWN");
});
test("open work, runtime pause, STOPPED, and invalid lease are not a safe renewal preview", () => {
  const input = evidence(); input.pendingExecutions = 1;
  assert.equal(check(input, "outbox").state, "BLOCKED");
  input.failedExecutions = 9; assert.equal(check(input, "failed").state, "UNKNOWN");
  input.runtime!.paused = true; assert.equal(check(input, "runtime").state, "BLOCKED");
  input.runtime!.paused = false; input.runtime!.run_lock_until = "invalid";
  assert.equal(check(input, "runtime").state, "UNKNOWN");
  input.experiment!.status = "STOPPED"; assert.equal(check(input, "period").state, "BLOCKED");
});
test("fresh pre-midnight equity cannot be mixed with the next Beijing day's opening", () => {
  const input = evidence();
  const midnight = new Date("2026-09-04T16:00:10Z");
  const snapshot = input.runtime!.account_snapshot as Record<string, unknown>;
  input.today!.trade_date = "2026-09-05";
  snapshot.checkedAt = "2026-09-04T15:59:50Z";
  let result = buildLiveRenewalPreview(input, midnight);
  assert.equal(result.checks.find((row) => row.key === "account")?.state, "OK");
  assert.equal(result.checks.find((row) => row.key === "daily")?.state, "UNKNOWN");
  snapshot.checkedAt = "2026-09-04T16:00:00Z";
  result = buildLiveRenewalPreview(input, midnight);
  assert.equal(result.checks.find((row) => row.key === "daily")?.state, "OK");
});
