import test from "node:test";
import assert from "node:assert/strict";
import { encodeDeskCache, decodeDeskCache } from "../lib/presentation/desk-cache-codec";

test("multi-megabyte snapshot fits cache without losing Unicode, history or risk fields", async () => {
  const value = { syncStatus: "PARTIAL", lastSyncedAt: "2026-09-12T09:00:00Z", executionAllowed: false,
    plans: Array.from({ length: 1500 }, (_, i) => ({ id: String(i), version: i, stop: 98.123456789,
      triggerRule: "等确认，禁止追价；风险上限不变。".repeat(100), events: [{ status: "CANCELLED", detail: "历史保留" }] })) };
  assert.ok(Buffer.byteLength(JSON.stringify(value)) > 4_715_495);
  const packed = await encodeDeskCache(value);
  assert.ok(Buffer.byteLength(JSON.stringify(packed)) < 1_900_000);
  assert.deepEqual(await decodeDeskCache(packed), value);
});

test("empty and null values round trip; damaged cache rejects", async () => {
  for (const value of [null, {}, { publishedPlans: [], enabled: false }]) {
    assert.deepEqual(await decodeDeskCache(await encodeDeskCache(value)), value);
  }
  await assert.rejects(decodeDeskCache("corrupt"));
});
