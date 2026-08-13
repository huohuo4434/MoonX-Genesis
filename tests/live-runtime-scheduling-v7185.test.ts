import test from "node:test";
import assert from "node:assert/strict";
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
  selectRotatingScanBatch,
} from "../lib/trading-signals/live-scan-rotation-core";
import {
  createStrategyProgressReporter,
  runBoundedSerialMaintenance,
} from "../lib/trading-signals/strategy-runtime-progress-core";
import { loadForecastSourcesForScope } from "../lib/trading-signals/forecast-read-scope-core";

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
