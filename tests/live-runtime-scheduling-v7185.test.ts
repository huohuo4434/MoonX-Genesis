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
  selectRotatingScanBatch,
} from "../lib/trading-signals/live-scan-rotation-core";

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
    "commissioning:ETH",
    "dynamic:ETH",
    "INTRADAY:ETH",
    "SWING:ETH",
  ]);
  assert.equal(writes, 0);
  assert.equal(orders, 0);
  assert.equal(marks, 0);
});
