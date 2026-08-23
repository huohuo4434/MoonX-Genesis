import assert from "node:assert/strict";
import test from "node:test";
import { listStaticFocusForecasts } from "../lib/data/conviction/focus-static-forecast-registry";

function latestByType(assetId: "btc" | "eth" | "hype", type: string) {
  return listStaticFocusForecasts(assetId)
    .filter((forecast) => forecast.forecastType === type && forecast.status === "published")
    .sort((left, right) => right.version - left.version || right.publishedAt.localeCompare(left.publishedAt))[0];
}

test("BTC September revision preserves history and publishes Liuyao-Qimen resonance", () => {
  const rows = listStaticFocusForecasts("btc");
  const latest = latestByType("btc", "MONTH_1");
  assert.equal(latest?.id, "BTC-SEP-20260823-V3");
  assert.equal(latest?.periodStart, "2026-09-01");
  assert.equal(latest?.direction, "先涨后跌");
  assert.equal(latest?.consensusStars, 4);
  assert.ok(latest?.methodViews?.some((view) => /六爻/.test(view.label)));
  assert.ok(latest?.methodViews?.some((view) => /奇门/.test(view.label)));
  assert.match(latest?.keyDates?.[0]?.note ?? "", /不是.*最终最高点|不代表.*最终最高点/);
  assert.ok(rows.some((forecast) => forecast.id === "BTC-M1-20260801-V2"), "locked August record must remain");
});

test("ETH September revision narrows the path and does not fabricate Qimen resonance", () => {
  const rows = listStaticFocusForecasts("eth");
  const latest = latestByType("eth", "MONTH_1");
  assert.equal(latest?.id, "ETH-YOU-20260823-V2");
  assert.equal(latest?.direction, "先涨后跌");
  assert.equal(latest?.consensusStars, 2);
  assert.ok(latest?.methodViews?.every((view) => !/奇门/.test(view.label)));
  assert.match(latest?.consensusLabel ?? "", /奇门证据缺失/);
  assert.ok(rows.some((forecast) => forecast.id === "ETH-M1-20260801-V1"), "locked August record must remain");
});

test("HYPE V7 keeps the prior autumn record and expands September into weekly phases", () => {
  const rows = listStaticFocusForecasts("hype");
  const latest = latestByType("hype", "MONTH_3");
  assert.equal(latest?.id, "HYPE-AUTUMN-20260823-V7");
  assert.equal(latest?.calendarMonthPath?.[0]?.direction, "先涨后跌");
  assert.match(latest?.expectedPath ?? "", /9月7日至13日.*转弱/);
  assert.match(latest?.expectedPath ?? "", /虚拉后再回落/);
  assert.ok(latest?.methodViews?.every((view) => !/奇门/.test(view.label)));
  assert.ok(rows.some((forecast) => forecast.id === "HYPE-AUTUMN-20260901-V6"), "locked V6 must remain");
});

test("member-facing revision labels do not reveal external teacher identities", () => {
  for (const assetId of ["btc", "eth", "hype"] as const) {
    const latest = latestByType(assetId, assetId === "hype" ? "MONTH_3" : "MONTH_1");
    const text = JSON.stringify(latest);
    assert.doesNotMatch(text, /金兔子|秉武|吴昌烨|狼叔/);
  }
});
