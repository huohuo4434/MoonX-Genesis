import test from "node:test";
import assert from "node:assert/strict";
import { normalizePlainDirection, PLAIN_DIRECTIONS } from "../lib/forecasts/plain-direction";
import { deriveWeeklyDailyCards, normalizeWeeklyPeriods } from "../lib/forecasts/watchlist-weekly-derived";

test("plain direction vocabulary converts jargon", () => {
  assert.equal(normalizePlainDirection("整固"), "震荡");
  assert.equal(normalizePlainDirection("修复上行"), "震荡上涨");
  assert.equal(normalizePlainDirection("探底回升"), "先跌后涨");
  assert.equal(normalizePlainDirection("冲高回落"), "先涨后跌");
  assert.deepEqual(PLAIN_DIRECTIONS, ["上涨", "震荡上涨", "先跌后涨", "震荡", "先涨后跌", "震荡下跌", "下跌"]);
});

test("US stock weekly derivation excludes weekend", () => {
  const cards = deriveWeeklyDailyCards({ slug: "nbis", period: { periodStart: "2026-08-17", periodEnd: "2026-08-23", direction: "先跌后涨" } });
  assert.equal(cards.length, 5);
  assert.equal(cards.some((card) => /2026-08-2[23]/.test(card.date)), false);
});

test("crypto weekly derivation keeps seven natural days", () => {
  const cards = deriveWeeklyDailyCards({ slug: "asteroid", period: { periodStart: "2026-08-17", periodEnd: "2026-08-23", direction: "震荡上涨" } });
  assert.equal(cards.length, 7);
});

test("period reflection does not require daily hexagram", () => {
  const periods = normalizeWeeklyPeriods([{ periodStart: "2026-08-17", periodEnd: "2026-08-23", direction: "整固" }]);
  assert.equal(periods.length, 1);
  assert.equal(periods[0]?.direction, "震荡");
});

test("heterogeneous Promise.allSettled loaders do not use an unsafe generic type predicate", async () => {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const root = process.cwd();
  for (const rel of [
    "app/api/cron/watchlist-weekly-daily/route.ts",
    "app/api/moox/tomorrow-view/route.ts",
  ]) {
    const text = await fs.readFile(path.join(root, rel), "utf8");
    assert.ok(!text.includes("item is PromiseFulfilledResult<unknown>"));
    assert.match(text, /if\s*\(\s*item\.status\s*===\s*["']fulfilled["']\s*\)\s*sources\.push\(item\.value\)/);
  }
});
