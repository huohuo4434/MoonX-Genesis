import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  asiaBatchReady,
  usBatchReady,
  wtiBatchReady,
  isPublicTodayUnlocked,
  getBeijingClock,
  ASIA_BATCH_KEYS,
  US_BATCH_KEYS,
  WTI_BATCH_KEYS,
} from "../lib/calendar/publish-windows.ts";

describe("publish windows", () => {
  test("asia batch after 18:30 BJ", () => {
    // 2026-07-28 18:29 BJ = 10:29 UTC
    const before = new Date("2026-07-28T10:29:00.000Z");
    const after = new Date("2026-07-28T10:30:00.000Z");
    assert.equal(asiaBatchReady(before), false);
    assert.equal(asiaBatchReady(after), true);
  });

  test("us batch after 06:30 BJ", () => {
    const before = new Date("2026-07-28T22:29:00.000Z"); // 06:29 BJ Jul 29
    const after = new Date("2026-07-28T22:30:00.000Z"); // 06:30 BJ Jul 29
    assert.equal(usBatchReady(before), false);
    assert.equal(usBatchReady(after), true);
  });

  test("wti batch after 05:30 BJ", () => {
    const before = new Date("2026-07-28T21:29:00.000Z"); // 05:29 BJ Jul 29
    const after = new Date("2026-07-28T21:30:00.000Z"); // 05:30 BJ Jul 29
    assert.equal(wtiBatchReady(before), false);
    assert.equal(wtiBatchReady(after), true);
  });

  test("public unlock at 08:00 BJ on forecast date", () => {
    const date = "2026-07-29";
    const before = new Date("2026-07-29T00:00:00.000Z"); // 08:00 BJ
    const earlier = new Date("2026-07-28T23:59:00.000Z"); // 07:59 BJ Jul 29
    assert.equal(isPublicTodayUnlocked(date, earlier), false);
    assert.equal(isPublicTodayUnlocked(date, before), true);
  });

  test("batch asset keys", () => {
    assert.deepEqual([...ASIA_BATCH_KEYS], ["BTC", "SSE", "HSTECH"]);
    assert.deepEqual([...US_BATCH_KEYS], ["SPX", "NDX", "GLD"]);
    assert.deepEqual([...WTI_BATCH_KEYS], ["WTI"]);
    assert.ok(getBeijingClock().date);
  });
});
