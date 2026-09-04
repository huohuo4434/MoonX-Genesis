import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { hasLiveHorizonConflict } from "../lib/presentation/bitget-live-status";

test("cross-horizon disagreement uses only currently validated LONG and SHORT coverage", () => {
  for (const [states, expected] of [
    [["LONG", "SHORT", "MISSING"], true],
    [["LONG", "LONG", "LONG"], false],
    [["SHORT", "SHORT", "PENDING"], false],
    [["LONG", "EXPIRED", "PENDING"], false],
    [["MISSING", "EXPIRED", "PENDING"], false],
    [[], false],
  ] as const) {
    const rows = states.map((coverageState) => ({ coverageState }));
    const original = JSON.stringify(rows);
    assert.equal(hasLiveHorizonConflict(rows), expected);
    assert.equal(JSON.stringify(rows), original);
  }
});

test("admin shows conflict and actual forecast validity without calling it a position or exit deadline", () => {
  const component = readFileSync("components/admin/BitgetDemoClient.tsx", "utf8");
  assert.match(component, /hasLiveHorizonConflict\(item.horizons\)/);
  assert.match(component, /这是预测计划，不是实际持仓/);
  assert.match(component, /预测有效期（北京时间）/);
  assert.match(component, /time\(horizon.forecastValidFrom, "Asia\/Shanghai"\)/);
  assert.match(component, /time\(horizon.forecastValidUntil, "Asia\/Shanghai"\)/);
});
