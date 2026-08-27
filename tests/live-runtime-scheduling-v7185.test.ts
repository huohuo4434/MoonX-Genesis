import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  acquireRuntimeLease,
  releaseRuntimeLease,
  type RuntimeLeaseStore,
} from "../lib/bitget/runtime-lease-core";
import {
  beginLiveScanRound,
  LiveScanReadDeadlineError,
  readWithinLiveScanDeadline,
  runLiveScanSymbolStep,
  selectOpportunityAwareScanBatch,
  selectOpportunityBatchWithinDeadline,
  selectPersistentCursorBatch,
  selectRotatingScanBatch,
} from "../lib/trading-signals/live-scan-rotation-core";
import {
  captureWallClockRunTiming,
  createStrategyProgressReporter,
  resolveRuntimeEngineFailureGate,
  runBoundedSerialMaintenance,
} from "../lib/trading-signals/strategy-runtime-progress-core";
import { runClassifiedPlanMaintenance } from "../lib/trading-signals/ai-plan-dynamic-sync-core";
import { loadForecastSourcesForScope } from "../lib/trading-signals/forecast-read-scope-core";
import {
  buildRuntimeDeadlinePolicy,
  canStartMemberDeskSync,
  canStartNewEntry,
  finalizeRuntimeOwner,
  readAuthoritativeRuntimeExecutionControl,
  releaseOwnerOrThrow,
  resolveRuntimeLeaseSeconds,
  runNewEntryBeforeCutoff,
  runRuntimeStartupSafetySequence,
  shouldPrefetchLiveExecutionCounts,
} from "../lib/bitget/runtime-deadline-core";

const opportunityNowMs = 0;
const opportunityHint = (symbol: string, low: number, high: number, direction: "LONG" | "SHORT" | "NEUTRAL" = "LONG") => ({
  id: `${symbol}-${direction}`,
  symbol,
  direction,
  entryZoneLow: low,
  entryZoneHigh: high,
  forecastLockedAt: new Date(opportunityNowMs - 60_000).toISOString(),
  forecastValidFrom: new Date(opportunityNowMs - 60_000).toISOString(),
  forecastValidUntil: new Date(opportunityNowMs + 3_600_000).toISOString(),
  lastCheckedAt: new Date(opportunityNowMs - 30_000).toISOString(),
  updatedAt: new Date(opportunityNowMs - 30_000).toISOString(),
});
const opportunityQuote = (symbol: string, price: number) => ({
  symbol,
  price,
  capturedAt: new Date(opportunityNowMs - 10_000).toISOString(),
});

test("a fresh symbol nearest its locked weekly entry zone is scanned first", () => {
  assert.deepEqual(selectOpportunityAwareScanBatch({
    symbols: ["BTC", "ETH", "XAU"], maxItems: 1, nowMs: opportunityNowMs,
    hints: [opportunityHint("BTC", 90, 91), opportunityHint("ETH", 99.8, 100.2)],
    quotes: [opportunityQuote("BTC", 100), opportunityQuote("ETH", 100)],
  }), ["ETH"]);
});

test("a multi-symbol live pass scans the strongest full-pool opportunities instead of a blind slice", () => {
  const hints = [
    { ...opportunityHint("BTC", 99, 101), status: "WATCHING", planningConfidence: 55, conditionsMet: 2, conditionsTotal: 4 },
    { ...opportunityHint("ETH", 99, 101), status: "ARMED", planningConfidence: 70, conditionsMet: 4, conditionsTotal: 4 },
    { ...opportunityHint("LITE", 99, 101), status: "ARMED", planningConfidence: 65, conditionsMet: 3, conditionsTotal: 4 },
    { ...opportunityHint("XAU", 90, 91), status: "ARMED", planningConfidence: 80, conditionsMet: 4, conditionsTotal: 4 },
  ];
  const quotes = ["BTC", "ETH", "LITE", "XAU"].map((symbol) => opportunityQuote(symbol, 100));
  assert.deepEqual(selectOpportunityAwareScanBatch({
    symbols: ["BTC", "ETH", "LITE", "XAU"], maxItems: 2, nowMs: opportunityNowMs, hints, quotes,
  }), ["ETH", "LITE"]);
});

test("multi-symbol champion scheduling retains a mandatory fair rotation cycle", () => {
  const symbols = ["BTC", "ETH", "LITE", "XAU"];
  const hints = symbols.map((symbol, index) => ({
    ...opportunityHint(symbol, 99, 101),
    status: "ARMED",
    planningConfidence: 80 - index,
    conditionsMet: 4,
    conditionsTotal: 4,
  }));
  const quotes = symbols.map((symbol) => opportunityQuote(symbol, 100));
  assert.deepEqual(selectOpportunityAwareScanBatch({ symbols, maxItems: 2, nowMs: 4 * 60_000, hints, quotes }), ["BTC", "ETH"]);
  assert.deepEqual(selectOpportunityAwareScanBatch({ symbols, maxItems: 2, nowMs: 5 * 60_000, hints, quotes }), ["LITE", "XAU"]);
});

test("equal opportunity scores retain minute rotation", () => {
  const hints = [opportunityHint("BTC", 99, 101), opportunityHint("ETH", 99, 101), opportunityHint("XAU", 99, 101)];
  const quotes = [opportunityQuote("BTC", 100), opportunityQuote("ETH", 100), opportunityQuote("XAU", 100)];
  assert.deepEqual([0, 1, 2].map((offset) => selectOpportunityAwareScanBatch({
    symbols: ["BTC", "ETH", "XAU"], maxItems: 1, nowMs: opportunityNowMs + offset * 60_000, hints, quotes,
  })), [["BTC"], ["ETH"], ["XAU"]]);
});

test("a mandatory fair cycle prevents a permanent near-zone winner", () => {
  const symbols = ["BTC", "ETH", "XAU"];
  const hints = [opportunityHint("BTC", 99, 101), opportunityHint("ETH", 90, 91), opportunityHint("XAU", 80, 81)];
  const quotes = symbols.map((symbol) => opportunityQuote(symbol, 100));
  const fairCycle = [6, 7, 8].map((offset) => selectOpportunityAwareScanBatch({
    symbols, maxItems: 1, nowMs: opportunityNowMs + offset * 60_000, hints, quotes,
  })[0]);
  assert.deepEqual(fairCycle, symbols);
});

test("missing locks, stale quotes and conflicting weekly directions cannot promote a symbol", () => {
  const unlocked = { ...opportunityHint("ETH", 99, 101), forecastLockedAt: null };
  const stale = { ...opportunityQuote("XAU", 100), capturedAt: new Date(opportunityNowMs - 181_000).toISOString() };
  assert.deepEqual(selectOpportunityAwareScanBatch({
    symbols: ["BTC", "ETH", "XAU"], maxItems: 1, nowMs: opportunityNowMs,
    hints: [unlocked, opportunityHint("XAU", 99, 101)],
    quotes: [opportunityQuote("BTC", 100), opportunityQuote("ETH", 100), stale],
  }), ["BTC"]);
  assert.deepEqual(selectOpportunityAwareScanBatch({
    symbols: ["BTC", "ETH", "XAU"], maxItems: 1, nowMs: opportunityNowMs,
    hints: [{ ...opportunityHint("ETH", 99, 101), lastCheckedAt: new Date(opportunityNowMs - 31 * 60_000).toISOString() }],
    quotes: [opportunityQuote("ETH", 100)],
  }), ["BTC"]);
  assert.deepEqual(selectOpportunityAwareScanBatch({
    symbols: ["BTC", "ETH", "XAU"], maxItems: 1, nowMs: opportunityNowMs,
    hints: [opportunityHint("ETH", 99, 101), opportunityHint("ETH", 99, 101, "SHORT")],
    quotes: [opportunityQuote("ETH", 100)],
  }), ["BTC"]);
});

test("a never-resolving opportunity hint read falls back quickly and the scan continues", async () => {
  const started = Date.now();
  const selected = await selectOpportunityBatchWithinDeadline({
    symbols: ["BTC", "ETH"],
    maxItems: 1,
    nowMs: 0,
    quotes: [opportunityQuote("ETH", 100)],
    deadlineMs: started + 20,
    loadHints: () => new Promise(() => undefined),
  });
  assert.deepEqual(selected, ["BTC"]);
  assert.ok(Date.now() - started < 500);
  const events = [`scan:${selected[0]}`];
  assert.deepEqual(events, ["scan:BTC"]);
});

test("a failed management read starts no hint selection, maintenance write or order", async () => {
  let managementFailed = false;
  let hintCalls = 0;
  let writes = 0;
  let orders = 0;
  const round = await beginLiveScanRound({ symbols: ["BTC", "ETH"], maxItems: 1, nowMs: 0 }, {
    manage: async () => {
      try {
        throw new Error("authoritative position read failed");
      } catch {
        managementFailed = true;
        return { managed: 0 };
      }
    },
    canSelect: () => !managementFailed,
    select: async (fallback) => {
      hintCalls += 1;
      return fallback;
    },
  });
  if (!managementFailed) {
    writes += 1;
    orders += 1;
  }
  assert.deepEqual(round.selected, ["BTC"]);
  assert.equal(hintCalls, 0);
  assert.equal(writes, 0);
  assert.equal(orders, 0);
});

test("runtime deadline uses fake time to stop new entries while leaving a finalization reserve", () => {
  const policy = buildRuntimeDeadlinePolicy(new Date(285_000));
  assert.equal(policy.newEntryCutoffMs, 265_000);
  assert.equal(canStartNewEntry(policy, 264_999), true);
  assert.equal(canStartNewEntry(policy, 265_000), false);
  assert.equal(canStartMemberDeskSync(policy.absoluteDeadlineMs, 254_999), true);
  assert.equal(canStartMemberDeskSync(policy.absoluteDeadlineMs, 255_001), false);
});

test("a short serverless deadline also shortens the stale runtime lease", () => {
  assert.equal(resolveRuntimeLeaseSeconds(new Date(105_000), 0), 135);
  assert.equal(resolveRuntimeLeaseSeconds(new Date(10_000), 0), 40);
  assert.equal(resolveRuntimeLeaseSeconds(new Date(-1), 0), 30);
  assert.equal(resolveRuntimeLeaseSeconds(undefined, 0), 330);
  assert.equal(resolveRuntimeLeaseSeconds(new Date(600_000), 0), 330);
});

test("a slow preflight gate cannot move the request-anchored finalization cutoff", () => {
  const requestStartedAtMs = 0;
  const gateFinishedAtMs = 30_000;
  const policy = buildRuntimeDeadlinePolicy(new Date(requestStartedAtMs + 105_000));
  assert.equal(policy.absoluteDeadlineMs, 105_000);
  assert.equal(policy.newEntryCutoffMs, 85_000);
  assert.equal(canStartNewEntry(policy, gateFinishedAtMs), true);
  assert.equal(canStartNewEntry(policy, 85_000), false);
});

test("a new order lifecycle started before cutoff is fully awaited but no later order starts", async () => {
  let now = 99;
  const events: string[] = [];
  let finishOrder: (() => void) | undefined;
  const first = runNewEntryBeforeCutoff({
    cutoffMs: 100,
    now: () => now,
    run: async () => {
      events.push("order:start");
      await new Promise<void>((resolve) => { finishOrder = resolve; });
      events.push("order:audit-complete");
      return "confirmed";
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  now = 101;
  finishOrder?.();
  assert.deepEqual(await first, { started: true, value: "confirmed" });
  assert.deepEqual(await runNewEntryBeforeCutoff({ cutoffMs: 100, now: () => now, run: async () => "second" }), { started: false });
  assert.deepEqual(events, ["order:start", "order:audit-complete"]);
});

test("reserve finalization persists state and FINISH, skips cleanup, then releases owner", async () => {
  const events: string[] = [];
  const result = await finalizeRuntimeOwner({
    allowCleanup: false,
    persistState: async () => { events.push("state"); },
    persistFinish: async () => { events.push("FINISH"); },
    cleanup: async () => { events.push("cleanup"); },
    releaseOwner: async () => { events.push("release"); },
  });
  assert.deepEqual(events, ["state", "FINISH", "release"]);
  assert.deepEqual(result, { cleanupRan: false, finalizationPersisted: true });
});

test("optional cleanup failure cannot reopen a finished runtime or prevent owner release", async () => {
  const events: string[] = [];
  const result = await finalizeRuntimeOwner({
    allowCleanup: true,
    persistState: async () => { events.push("state"); },
    persistFinish: async () => { events.push("FINISH"); },
    cleanup: async () => { events.push("cleanup"); throw new Error("retention unavailable"); },
    releaseOwner: async () => { events.push("release"); },
  });
  assert.deepEqual(events, ["state", "FINISH", "cleanup", "release"]);
  assert.deepEqual(result, { cleanupRan: false, finalizationPersisted: true });
});

test("a first owner-release failure propagates and an outer finally retries exactly once", async () => {
  const events: string[] = [];
  let ownerReleased = false;
  let releaseCalls = 0;
  const releaseOwner = async () => {
    releaseCalls += 1;
    events.push(`release:${releaseCalls}`);
    if (releaseCalls === 1) throw new Error("temporary release failure");
    ownerReleased = true;
  };
  await assert.rejects(async () => {
    try {
      await finalizeRuntimeOwner({
        allowCleanup: false,
        persistState: async () => { events.push("state"); },
        persistFinish: async () => { events.push("FINISH"); },
        cleanup: async () => undefined,
        releaseOwner,
      });
    } finally {
      if (!ownerReleased) await releaseOwner();
    }
  }, /temporary release failure/);
  assert.equal(ownerReleased, true);
  assert.equal(releaseCalls, 2);
  assert.deepEqual(events, ["state", "FINISH", "release:1", "release:2"]);
});

test("successful finalization releases once, while FINISH failure is audited before release", async () => {
  let releases = 0;
  await finalizeRuntimeOwner({
    allowCleanup: false,
    persistState: async () => undefined,
    persistFinish: async () => undefined,
    cleanup: async () => undefined,
    releaseOwner: async () => { releases += 1; },
  });
  assert.equal(releases, 1);

  const events: string[] = [];
  await assert.rejects(finalizeRuntimeOwner({
    allowCleanup: false,
    persistState: async () => { events.push("state"); },
    persistFinish: async () => { events.push("FINISH:failed"); throw new Error("finish unavailable"); },
    cleanup: async () => undefined,
    onFinalizeErrorBeforeRelease: async () => { events.push("failure-audit"); events.push("failure-state"); },
    releaseOwner: async () => { events.push("release"); },
  }), /finish unavailable/);
  assert.deepEqual(events, ["state", "FINISH:failed", "failure-audit", "failure-state", "release"]);
});

test("two owner-release failures remain a route error and leave the lease to expire", async () => {
  let releaseCalls = 0;
  await assert.rejects(async () => {
    const releaseOwner = async () => { releaseCalls += 1; throw new Error(`release failed ${releaseCalls}`); };
    let ownerReleased = false;
    try {
      await finalizeRuntimeOwner({
        allowCleanup: false,
        persistState: async () => undefined,
        persistFinish: async () => undefined,
        cleanup: async () => undefined,
        releaseOwner: async () => { await releaseOwner(); ownerReleased = true; },
      });
    } finally {
      if (!ownerReleased) await releaseOwner();
    }
  }, /release failed 2/);
  assert.equal(releaseCalls, 2);
});

test("an owner-fenced release returning false is a failure, not a successful release", async () => {
  await assert.rejects(releaseOwnerOrThrow(async () => false), /RUNTIME_OWNER_RELEASE_NOT_CONFIRMED/);
  await assert.doesNotReject(releaseOwnerOrThrow(async () => true));
});

class MemoryLeaseStore implements RuntimeLeaseStore {
  owner: string | null = null;
  expiresAt = 0;
  now = 0;

  async tryAcquire(owner: string, leaseSeconds: number): Promise<boolean> {
    if (this.owner && this.expiresAt >= this.now) return false;
    this.owner = owner;
    this.expiresAt = this.now + leaseSeconds * 1000;
    return true;
  }

  async release(owner: string): Promise<boolean> {
    if (this.owner !== owner) return false;
    this.owner = null;
    this.expiresAt = 0;
    return true;
  }
}

test("a stale run cannot release a newer runtime lease", async () => {
  const store = new MemoryLeaseStore();
  assert.equal(await acquireRuntimeLease(store, "run-a", 330), true);
  store.now = 331_000;
  assert.equal(await acquireRuntimeLease(store, "run-b", 330), true);
  assert.equal(await releaseRuntimeLease(store, "run-a"), false);
  assert.equal(store.owner, "run-b");
  assert.equal(await acquireRuntimeLease(store, "run-c", 330), false);
  assert.equal(await releaseRuntimeLease(store, "run-b"), true);
  assert.equal(await acquireRuntimeLease(store, "run-c", 330), true);
});

test("one-symbol minute rotation covers the universe and all profiles share the same slot", () => {
  const symbols = ["BTC", "ETH", "GOOGL", "XAU"];
  const profileSelections = (minute: number) => ["INTRADAY", "SWING", "POSITION"]
    .map(() => selectRotatingScanBatch(symbols, 1, minute * 60_000));
  assert.deepEqual(profileSelections(0), [["BTC"], ["BTC"], ["BTC"]]);
  assert.deepEqual(profileSelections(1), [["ETH"], ["ETH"], ["ETH"]]);
  assert.deepEqual(profileSelections(2), [["GOOGL"], ["GOOGL"], ["GOOGL"]]);
  assert.deepEqual(profileSelections(3), [["XAU"], ["XAU"], ["XAU"]]);
  assert.deepEqual(profileSelections(4), [["BTC"], ["BTC"], ["BTC"]]);
});

test("rotation safely handles empty, singleton and partial final batches", () => {
  assert.deepEqual(selectRotatingScanBatch([], 1, 0), []);
  assert.deepEqual(selectRotatingScanBatch(["BTC"], 1, 99 * 60_000), ["BTC"]);
  assert.deepEqual(selectRotatingScanBatch(["A", "B", "C", "D", "E"], 2, 2 * 60_000), ["E"]);
});

test("persistent cursor covers the full universe despite 2-minute, 5-minute and locked-skip cadences", () => {
  const symbols = Array.from({ length: 18 }, (_, index) => `S${index}`);
  for (const cadenceMinutes of [1, 2, 5]) {
    let cursor = 0n;
    const observed = new Set<string>();
    for (let minute = 0; minute < cadenceMinutes * symbols.length; minute += cadenceMinutes) {
      const selected = selectPersistentCursorBatch(symbols, 1, cursor);
      cursor += BigInt(selected.length);
      selected.forEach((symbol) => observed.add(symbol));
    }
    assert.equal(observed.size, symbols.length, `cadence ${cadenceMinutes} must not starve symbols`);
  }

  let cursor = 0n;
  const afterLockedSkips: string[] = [];
  for (const cronMinute of [0, 1, 8, 9, 17, 25]) {
    if ([1, 8, 17].includes(cronMinute)) continue; // locked invocations never claim the cursor
    const selected = selectPersistentCursorBatch(symbols, 1, cursor);
    cursor += BigInt(selected.length);
    afterLockedSkips.push(selected[0] ?? "");
  }
  assert.deepEqual(afterLockedSkips, ["S0", "S1", "S2"]);
});

test("persistent cursor wraps partial batches without duplicates", () => {
  assert.deepEqual(selectPersistentCursorBatch(["A", "B", "C"], 2, 2n), ["C", "A"]);
  assert.deepEqual(selectPersistentCursorBatch(["A", "B", "C"], 1, -1n), ["C"]);
  assert.deepEqual(selectPersistentCursorBatch([], 2, 0n), []);
});

test("persistent cursor uses the stable allowlist when fresh membership churns", () => {
  const stable = ["A", "B", "C"];
  let cursor = 0n;
  const observed: string[] = [];
  for (let run = 0; run < 12; run += 1) {
    const fresh = new Set(run % 2 === 0 ? ["A", "B"] : ["B", "C"]);
    const claimedSlots = selectPersistentCursorBatch(stable, 1, cursor);
    cursor += BigInt(claimedSlots.length);
    observed.push(...claimedSlots.filter((symbol) => fresh.has(symbol)));
  }
  assert.ok(observed.includes("B"), "a continuously fresh symbol must not starve during membership churn");
  assert.deepEqual(new Set(observed), new Set(stable));
});

test("a long read fails closed at the shared deadline while the round can finish", async () => {
  let resolveRead: ((value: string) => void) | undefined;
  const longRead = new Promise<string>((resolve) => { resolveRead = resolve; });
  const started = Date.now();
  await assert.rejects(
    readWithinLiveScanDeadline(() => longRead, started + 20),
    LiveScanReadDeadlineError
  );
  assert.ok(Date.now() - started < 500, "deadline must finish the scheduling round promptly");
  // The abandoned operation is read-only; completing it later cannot submit an order.
  resolveRead?.("late-read-result");
});

test("an already exhausted read budget fails before starting another scan wait", async () => {
  let factoryCalls = 0;
  await assert.rejects(
    readWithinLiveScanDeadline(() => {
      factoryCalls += 1;
      return Promise.resolve("unused");
    }, 999, () => 1_000),
    LiveScanReadDeadlineError
  );
  assert.equal(factoryCalls, 0);
});

test("a non-cancellable read rejection after timeout is observed", async () => {
  let rejectLate: ((error: Error) => void) | undefined;
  const lateRead = new Promise<void>((_, reject) => { rejectLate = reject; });
  const unhandled: unknown[] = [];
  const listener = (reason: unknown) => { unhandled.push(reason); };
  process.on("unhandledRejection", listener);
  try {
    await assert.rejects(
      readWithinLiveScanDeadline(() => lateRead, Date.now() + 10),
      LiveScanReadDeadlineError
    );
    rejectLate?.(new Error("late market-data failure"));
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.deepEqual(unhandled, []);
  } finally {
    process.off("unhandledRejection", listener);
  }
});

test("production scheduling cores manage first, rotate one symbol and suppress writes after timeout", async () => {
  const events: string[] = [];
  let writes = 0;
  let orders = 0;
  let marks = 0;
  const round = await beginLiveScanRound({
    symbols: ["BTC", "ETH", "XAU"],
    maxItems: 1,
    nowMs: 60_000,
  }, {
    manage: async () => { events.push("manage"); return { managed: 1 }; },
    select: async (fallback) => { events.push("select"); return fallback; },
  });
  const symbol = round.selected[0];
  events.push(`commissioning:${symbol}`);
  events.push(`dynamic:${symbol}`);
  events.push(`INTRADAY:${symbol}`);
  const step = await runLiveScanSymbolStep(async () => {
    events.push(`SWING:${symbol}`);
    await readWithinLiveScanDeadline(
      () => new Promise<void>(() => undefined),
      Date.now() + 10
    );
    writes += 1;
    orders += 1;
  }, async () => {
    writes += 1;
  });
  if (!step.timedOut) marks += 1;
  assert.equal(step.timedOut, true);
  assert.deepEqual(round.selected, ["ETH"]);
  assert.deepEqual(events, [
    "manage",
    "select",
    "commissioning:ETH",
    "dynamic:ETH",
    "INTRADAY:ETH",
    "SWING:ETH",
  ]);
  assert.equal(writes, 0);
  assert.equal(orders, 0);
  assert.equal(marks, 0);
});

test("live plan maintenance turns an 80-row serial backlog into a bounded increment", async () => {
  const calls: number[] = [];
  const completed = await runBoundedSerialMaintenance({
    rows: Array.from({ length: 80 }, (_, index) => index),
    maxRows: 3,
    maintain: async (row) => { calls.push(row); },
  });
  assert.equal(completed, 3);
  assert.deepEqual(calls, [0, 1, 2]);
});

test("production progress reporter preserves the last completed stage and elapsed time", async () => {
  const events: Array<{ stage: string; elapsedMs: number }> = [];
  let clock = 1_000;
  const report = createStrategyProgressReporter({
    startedAtMs: clock,
    now: () => clock,
    publish: async (progress) => { events.push(progress); },
  });
  await report("ENGINE_START");
  clock = 1_125;
  await report("MANAGEMENT_COMPLETE");
  clock = 1_410;
  await report("PLAN_MAINTENANCE_COMPLETE");
  assert.deepEqual(events, [
    { stage: "ENGINE_START", elapsedMs: 0 },
    { stage: "MANAGEMENT_COMPLETE", elapsedMs: 125 },
    { stage: "PLAN_MAINTENANCE_COMPLETE", elapsedMs: 410 },
  ]);

  const telemetryFailure = createStrategyProgressReporter({
    startedAtMs: 0,
    publish: async () => { throw new Error("audit unavailable"); },
  });
  await assert.doesNotReject(telemetryFailure("ENGINE_START"));
});

test("runtime wall timing is independent from business now and shares one elapsed origin", async () => {
  const businessNow = new Date("2026-08-14T06:02:26.141Z");
  let wallClock = Date.parse("2026-08-14T06:03:11.565Z");
  const timing = captureWallClockRunTiming({ businessNow, wallNow: () => wallClock });
  assert.strictEqual(timing.businessNow, businessNow);
  assert.equal(timing.startedAt, "2026-08-14T06:03:11.565Z");

  const stages: Array<{ stage: string; elapsedMs: number }> = [];
  const report = createStrategyProgressReporter({
    startedAtMs: timing.startedAtMs,
    elapsedMs: timing.elapsedMs,
    publish: (progress) => { stages.push(progress); },
  });
  wallClock += 22_000;
  await report("MANAGEMENT_COMPLETE");
  wallClock -= 5_000;
  await report("PLAN_MAINTENANCE_COMPLETE");
  wallClock += 65_641;
  const finish = timing.finish();
  assert.deepEqual(stages, [
    { stage: "MANAGEMENT_COMPLETE", elapsedMs: 22_000 },
    { stage: "PLAN_MAINTENANCE_COMPLETE", elapsedMs: 22_000 },
  ]);
  assert.deepEqual(finish, {
    finishedAtMs: Date.parse("2026-08-14T06:04:34.206Z"),
    finishedAt: "2026-08-14T06:04:34.206Z",
    durationMs: 82_641,
  });
  assert.equal(businessNow.toISOString(), "2026-08-14T06:02:26.141Z");
});

test("maintenance failure blocks every post-engine order chain but still finalizes and releases owner", async () => {
  const audit: string[] = [];
  let planMaintenanceComplete = 0;
  let mirrorOrders = 0;
  let ownerReleases = 0;
  let engineFailure = false;
  try {
    await runClassifiedPlanMaintenance({
      rows: [{ id: "checkpoint", kind: "CHECKPOINT" as const }],
      classify: (row) => row.kind,
      writeMaterial: async () => undefined,
      writeCheckpoints: async () => { throw new Error("maintenance store unavailable"); },
    });
    planMaintenanceComplete += 1;
  } catch {
    engineFailure = true;
    audit.push("THREE_HORIZON_ERROR");
  }
  const gate = resolveRuntimeEngineFailureGate({ engineFailure, engineOk: null });
  if (gate.allowPostEngineOrders) mirrorOrders += 1;
  await finalizeRuntimeOwner({
    allowCleanup: false,
    persistState: async () => { audit.push("FAILED_STATE"); },
    persistFinish: async () => { audit.push("FINISH"); },
    cleanup: async () => undefined,
    releaseOwner: async () => { ownerReleases += 1; return true; },
  });
  assert.equal(planMaintenanceComplete, 0);
  assert.equal(mirrorOrders, 0);
  assert.equal(gate.runtimeOk, false);
  assert.deepEqual(audit, ["THREE_HORIZON_ERROR", "FAILED_STATE", "FINISH"]);
  assert.equal(ownerReleases, 1);
});

test("runtime startup reads only authoritative pause control and fails closed before engine or orders", async () => {
  const runtimeSource = readFileSync(resolve(process.cwd(), "lib/bitget/demo-runtime.ts"), "utf8");
  const startup = runtimeSource.slice(
    runtimeSource.indexOf("export async function runBitgetDemoServerRuntime"),
    runtimeSource.indexOf("export async function getBitgetLiveAdminDashboard")
  );
  assert.match(startup, /readControl: readRuntimeExecutionControl/);
  assert.doesNotMatch(startup, /before = await getBitgetRuntimeState\(now\)/);
  const preStart = startup.slice(0, startup.indexOf('action: "START"'));
  assert.doesNotMatch(preStart, /getBitgetMirrorSettings|ensureTradingV2Tables|ensureTradeSignalTables|readBitgetLiveExperimentStatus|todayDecisionStats|listEvents/);
  assert.match(runtimeSource, /adapter\.\$queryRaw<[\s\S]*SELECT paused, pause_reason[\s\S]*WHERE id = \$\{"default"\}/);
  assert.doesNotMatch(runtimeSource, /readRuntimeExecutionControl[\s\S]{0,500}\$queryRawUnsafe/);
  assert.match(startup, /RUNTIME_CONTROL_ERROR/);
  type LiveStatus = { active: boolean; stopped: boolean; completed: boolean };
  const runCase = async (readControl: () => Promise<{ paused: boolean; pauseReason: string }>) => {
    const calls: string[] = [];
    let newEntry = 0;
    let manageOnly = 0;
    let mirror = 0;
    let validation = 0;
    let riskReducingClose = 0;
    let openingRemoteWrites = 0;
    let executionCountPrefetches = 0;
    const result = await runRuntimeStartupSafetySequence<LiveStatus, { reduced: boolean }>({
      readControl: async () => { calls.push("control"); return readControl(); },
      onControlResolved: ({ controlError, policy }) => {
        calls.push(controlError ? "control:error" : "control:ok");
        if (shouldPrefetchLiveExecutionCounts({
          liveExperimentMode: true,
          forcedManageOnly: false,
          policy,
        })) executionCountPrefetches += 1;
      },
      syncLiveStatus: async ({ allowStart }) => {
        calls.push(`sync:${allowStart}`);
        return { active: allowStart, stopped: !allowStart, completed: false };
      },
      onLiveStatus: async () => { calls.push("status:audit"); },
      closeRiskExposure: async (status) => {
        calls.push("risk:close");
        if (status.stopped || status.completed) riskReducingClose += 1;
        return { reduced: true };
      },
    });
    if (result.policy.allowNewEntries) {
      newEntry += 1;
      openingRemoteWrites += 1;
      mirror += 1;
      validation += 1;
    } else if (result.policy.allowManageOnly) {
      manageOnly += 1;
    }
    return {
      result, calls, newEntry, manageOnly, mirror, validation,
      riskReducingClose, openingRemoteWrites,
      executionCountPrefetches,
    };
  };

  const active = await runCase(async () => ({ paused: false, pauseReason: "" }));
  assert.deepEqual(active.calls, ["control", "control:ok", "sync:true", "status:audit", "risk:close"]);
  assert.equal(active.newEntry, 1);
  assert.equal(active.riskReducingClose, 0);
  assert.equal(active.executionCountPrefetches, 1);

  const paused = await runCase(async () => ({ paused: true, pauseReason: "manual pause" }));
  assert.deepEqual(paused.calls, ["control", "control:ok", "sync:false", "status:audit", "risk:close"]);
  assert.equal(paused.manageOnly, 1);
  assert.equal(paused.newEntry, 0);
  assert.equal(paused.mirror, 0);
  assert.equal(paused.validation, 0);
  assert.equal(paused.openingRemoteWrites, 0);
  assert.equal(paused.riskReducingClose, 1, "risk-reducing close remains allowed while paused");
  assert.equal(paused.executionCountPrefetches, 0);

  for (const readControl of [
    async () => readAuthoritativeRuntimeExecutionControl(async () => []),
    async () => { throw new Error("control query failed"); },
  ]) {
    const unknown = await runCase(readControl);
    assert.deepEqual(unknown.calls, ["control", "control:error", "sync:false", "status:audit", "risk:close"]);
    assert.equal(unknown.result.policy.controlKnown, false);
    assert.equal(unknown.newEntry, 0);
    assert.equal(unknown.manageOnly, 0);
    assert.equal(unknown.mirror, 0);
    assert.equal(unknown.validation, 0);
    assert.equal(unknown.openingRemoteWrites, 0);
    assert.equal(unknown.riskReducingClose, 1, "unknown control cannot suppress an existing-position risk exit");
    assert.equal(unknown.executionCountPrefetches, 0);
    const audit: string[] = [];
    await finalizeRuntimeOwner({
      allowCleanup: false,
      persistState: async () => { audit.push("FAILED_STATE"); },
      persistFinish: async () => { audit.push("FINISH"); },
      cleanup: async () => undefined,
      releaseOwner: async () => { audit.push("RELEASE"); return true; },
    });
    assert.deepEqual(audit, ["FAILED_STATE", "FINISH", "RELEASE"]);
  }

  for (const invalid of [null, "false", 0, 1]) {
    await assert.rejects(
      readAuthoritativeRuntimeExecutionControl(async () => [
        { paused: invalid as unknown as boolean, pause_reason: "invalid" },
      ]),
      /RUNTIME_EXECUTION_CONTROL_INVALID_PAUSED/
    );
  }

  const activePolicy = active.result.policy;
  assert.equal(shouldPrefetchLiveExecutionCounts({ liveExperimentMode: false, forcedManageOnly: false, policy: activePolicy }), false);
  assert.equal(shouldPrefetchLiveExecutionCounts({ liveExperimentMode: true, forcedManageOnly: true, policy: activePolicy }), false);
});

test("single-symbol live forecast read skips the broad admin snapshot and runs bounded reads together", async () => {
  const calls: string[] = [];
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const resultPromise = loadForecastSourcesForScope({ requestedSymbols: ["mu", "MU"] }, {
    loadBroadBase: async () => { calls.push("broad"); return ["broad"]; },
    loadBoundedBase: async (symbols) => { calls.push(`base:${symbols.join(",")}`); await gate; return ["base"]; },
    loadDaily: async (symbols) => { calls.push(`daily:${symbols?.join(",")}`); await gate; return ["daily"]; },
    loadWeekly: async (symbols) => { calls.push(`weekly:${symbols?.join(",")}`); await gate; return ["weekly"]; },
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(calls, ["base:MU", "daily:MU", "weekly:MU"]);
  release?.();
  assert.deepEqual(await resultPromise, {
    base: ["base"], daily: ["daily"], weekly: ["weekly"], bounded: true,
  });
});

test("unscoped forecast consumers retain the broad snapshot path", async () => {
  const calls: string[] = [];
  await loadForecastSourcesForScope({}, {
    loadBroadBase: async () => { calls.push("broad"); return []; },
    loadBoundedBase: async () => { calls.push("bounded"); return []; },
    loadDaily: async () => [],
    loadWeekly: async () => [],
  });
  assert.deepEqual(calls, ["broad"]);
});
