import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  formalBatchReady,
  asiaBatchReady,
  usBatchReady,
  wtiBatchReady,
  isPublicTodayUnlocked,
  getBeijingClock,
  FORMAL_PUBLISH_LABEL,
  nextUpdateLabelForSymbol,
  ASIA_BATCH_KEYS,
  US_BATCH_KEYS,
  WTI_BATCH_KEYS,
} from "../lib/calendar/publish-windows.ts";

describe("publish windows", () => {
  test("formal batch after 20:00 BJ", () => {
    // 2026-07-28 19:59 BJ = 11:59 UTC
    const before = new Date("2026-07-28T11:59:00.000Z");
    const after = new Date("2026-07-28T12:00:00.000Z");
    assert.equal(formalBatchReady(before), false);
    assert.equal(formalBatchReady(after), true);
    assert.equal(asiaBatchReady(after), true);
    assert.equal(usBatchReady(before), false);
    assert.equal(wtiBatchReady(after), true);
  });

  test("all symbols share formal 20:00 label", () => {
    assert.equal(FORMAL_PUBLISH_LABEL, "每天北京时间 20:00");
    assert.equal(nextUpdateLabelForSymbol("WTI"), FORMAL_PUBLISH_LABEL);
    assert.equal(nextUpdateLabelForSymbol("SPX"), FORMAL_PUBLISH_LABEL);
    assert.equal(nextUpdateLabelForSymbol("BTC"), FORMAL_PUBLISH_LABEL);
  });

  test("public unlock at 08:00 BJ on forecast date", () => {
    const date = "2026-07-29";
    const before = new Date("2026-07-29T00:00:00.000Z"); // 08:00 BJ
    const earlier = new Date("2026-07-28T23:59:00.000Z"); // 07:59 BJ Jul 29
    assert.equal(isPublicTodayUnlocked(date, earlier), false);
    assert.equal(isPublicTodayUnlocked(date, before), true);
  });

  test("batch asset keys retained for ordering", () => {
    assert.deepEqual([...ASIA_BATCH_KEYS], ["BTC", "SSE", "HSTECH"]);
    assert.deepEqual([...US_BATCH_KEYS], ["SPX", "NDX", "GLD"]);
    assert.deepEqual([...WTI_BATCH_KEYS], ["WTI"]);
    assert.ok(getBeijingClock().date);
  });
});
