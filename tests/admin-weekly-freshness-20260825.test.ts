import assert from "node:assert/strict";
import test from "node:test";
import { getConvictionWeeklyFreshnessOverview } from "../lib/data/conviction/admin-weekly-freshness.ts";

test("admin weekly freshness recognizes every weekly subtype and verified source chart", () => {
  const summary = getConvictionWeeklyFreshnessOverview(
    new Date("2026-08-25T20:00:00+08:00"),
  );

  assert.equal(summary.current, summary.total);
  assert.equal(summary.expired, 0);
  assert.equal(summary.missing, 0);
  assert.deepEqual(summary.affectedAssets, []);
});
