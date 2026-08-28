import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  canonicalConvictionForecastHorizon,
  canonicalPredictionAssetId,
} from "../lib/forecasts/canonical-forecast-adapter-core";
import { listStaticFocusForecasts } from "../lib/data/conviction/focus-static-forecast-registry";
import { selectFormallyLockedForecast } from "../lib/trading-signals/formal-forecast-lock-core";

const nowMs = Date.parse("2026-08-28T12:00:00+08:00");

function select(assetId: Parameters<typeof listStaticFocusForecasts>[0], horizon: "WEEK" | "MONTH", today: string) {
  const rows = listStaticFocusForecasts(assetId)
    .filter((row) => canonicalConvictionForecastHorizon(row) === horizon);
  return selectFormallyLockedForecast({ rows, today, nowMs, score: (row) => row.version });
}

test("live trade symbols resolve to the same canonical focus asset ids as member research", () => {
  assert.deepEqual(
    ["INTC", "LITE", "MU", "NBIS", "SOL", "TENCENT", "TSLA"].map((symbol) => canonicalPredictionAssetId(symbol)),
    ["intel", "lite", "mu", "nbis", "sol", "tencent", "tsla"],
  );
  assert.equal(canonicalPredictionAssetId("SOLUSDT"), "sol");
});

test("current focus coverage preserves missing and sideways weekly authority instead of inventing trades", () => {
  assert.equal(select("intel", "WEEK", "2026-08-28"), null, "INTC 8/31 week is still future");
  assert.equal(select("intel", "MONTH", "2026-08-28")?.id, "INTC-0822-0831-20260822-V1");
  assert.equal(select("lite", "WEEK", "2026-08-28")?.id, "LITE-W2-20260824-V1");
  assert.equal(select("mu", "WEEK", "2026-08-28")?.id, "MU-W4-20260824-V1");
  assert.equal(select("nbis", "WEEK", "2026-08-28")?.direction, "震荡");
  assert.equal(select("sol", "WEEK", "2026-08-28")?.id, "SOL-W3-20260824-V3");
  assert.equal(select("tencent", "WEEK", "2026-08-28")?.id, "TENCENT-W3-20260824-V2");
  assert.equal(select("tsla", "WEEK", "2026-08-28")?.id, "TSLA-W2-20260824-V2");
});

test("legacy TSLA weekly rows stay immutable but normalize to WEEK without polluting MONTH", () => {
  for (const [today, expectedId] of [
    ["2026-09-14", "TSLA-W5-20260914-V1"],
    ["2026-09-21", "TSLA-W6-20260921-V1"],
    ["2026-09-28", "TSLA-W7-20260928-V1"],
  ] as const) {
    assert.equal(select("tsla", "WEEK", today)?.id, expectedId);
    assert.notEqual(select("tsla", "MONTH", today)?.id, expectedId);
  }
});

test("production readers use the pure canonical adapter", () => {
  const trader = readFileSync("lib/trading-signals/prediction-auto-trader.ts", "utf8");
  const fullCycle = readFileSync("lib/admin/full-cycle-control.ts", "utf8");
  assert.match(trader, /canonicalPredictionAssetId\(normalized\)/);
  assert.match(fullCycle, /canonicalConvictionForecastHorizon\(item\)/);
  assert.match(fullCycle, /ACTIVE_STATIC_FOCUS_ASSET_IDS\.flatMap/);
});
