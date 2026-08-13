import test from "node:test";
import assert from "node:assert/strict";
import {
  acquireRuntimeLease,
  releaseRuntimeLease,
  type RuntimeLeaseStore,
} from "../lib/bitget/runtime-lease-core";
import { selectRotatingScanBatch } from "../lib/trading-signals/live-scan-rotation-core";

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
