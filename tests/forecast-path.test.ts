import assert from "node:assert/strict";
import test from "node:test";
import { forecastGeometry, forecastPaths, type ForecastPath } from "../lib/presentation/forecast-path";
import { buildMemberKeyDateRadar, keyDateChartForecasts } from "../lib/data/member-key-date-radar";
import type { OfficialDirection } from "../lib/forecasts/formal-direction";
import { readFileSync } from "node:fs";

const asOf = "2026-09-06";
const items = buildMemberKeyDateRadar(asOf);
const records = keyDateChartForecasts(items, Date.parse(`${asOf}T01:00:00Z`));
const paths = forecastPaths(items, records, asOf);
const find = (asset: string, level = "MONTH") => paths.find(p => p.assetId === asset && p.level === level)!;

test("BTC canonical asset resolves to dated published monthly rise/pullback, no numeric target", () => {
  const btc = find("btc");
  assert.equal(btc.id, "BTC-SEP-20260823-V3");
  const chart = forecastGeometry(btc, asOf);
  assert.equal(chart.mode, "DATED");
  assert.equal(chart.anchor?.focusDate, "2026-09-10");
  assert.deepEqual(chart.points.map(p => p.value), [0, 1, 0]);
  assert.equal("targetPrice" in chart, false);
});
test("SNDK strength start is not an invented low; holiday observation is September 8", () => {
  const chart = forecastGeometry(find("sandisk"), asOf);
  assert.equal(chart.anchor?.kind, "strength");
  assert.equal(chart.anchor?.focusDate, "2026-09-07");
  assert.equal(chart.anchor?.nextSessionDate, "2026-09-08");
  assert.deepEqual(chart.points.map(p => p.value), [0, 0, 1]);
  assert.equal(chart.points[1]!.x, 2 / 24);
});
test("derived weekly date is not a calendar turning point", () => {
  const chart = forecastGeometry(find("btc", "WEEK"), asOf);
  assert.equal(chart.mode, "SEQUENCE");
  assert.equal(chart.anchor, null);
});
test("all seven official directions have finite unitless phase geometry", () => {
  for (const direction of ["上涨", "震荡上涨", "先跌后涨", "震荡", "先涨后跌", "震荡下跌", "下跌"] as OfficialDirection[]) {
    const chart = forecastGeometry({ ...find("btc"), direction, windows: [] }, asOf);
    assert.equal(chart.mode, "SEQUENCE");
    assert.ok(chart.points.every(p => Number.isFinite(p.value) && p.x >= 0 && p.x <= 1));
  }
});
test("expired, draft, unknown and display-conflicting records cannot produce a curve", () => {
  assert.deepEqual(forecastPaths(items, records.map(r => ({ ...r, status: "draft" })), asOf), []);
  assert.deepEqual(forecastPaths(items, records.map(r => ({ ...r, direction: "待复核" })), asOf), []);
  assert.deepEqual(forecastPaths(items, records.map(r => ({ ...r, periodEnd: "2026-08-31" })), asOf), []);
  const btc = records.filter(r => r.id === "BTC-SEP-20260823-V3");
  assert.deepEqual(forecastPaths(items, btc.map(r => ({ ...r, direction: "下跌" })), asOf), []);
  assert.equal(keyDateChartForecasts(items, Date.parse("2020-01-01")).length, 0);
});
test("month-only data cannot masquerade as a weekly curve", () => {
  const result = forecastPaths(items.map(i => ({ ...i, level: "WEEK" })), records.filter(r => r.forecastType.startsWith("MONTH")), asOf);
  assert.equal(result.length, 0);
});
test("past high remains past, does not reset to another future rise", () => {
  const laterItems = buildMemberKeyDateRadar("2026-09-12");
  const laterPaths = forecastPaths(laterItems, keyDateChartForecasts(laterItems, Date.parse("2026-09-12")), "2026-09-12");
  const btc = laterPaths.find(p => p.id === "BTC-SEP-20260823-V3")!;
  assert.ok(btc);
  const chart = forecastGeometry(btc, "2026-09-12");
  assert.equal(chart.anchor?.focusDate, "2026-09-10");
  assert.deepEqual(chart.points.map(p => p.value), [0, -1]);
});
test("multiple explicit candidate turns do not get silently cherry-picked", () => {
  const base = find("btc");
  const other = { ...base.windows[0]!, focusDate: "2026-09-20" };
  assert.equal(forecastGeometry({ ...base, windows: [...base.windows, other] }, asOf).mode, "SEQUENCE");
});
test("source records and radar stay immutable and geometry deterministic", () => {
  const before = JSON.stringify({ items, records });
  assert.deepEqual(forecastPaths(items, records, asOf), paths);
  for (const path of paths) assert.deepEqual(forecastGeometry(path, asOf), forecastGeometry(path, asOf));
  assert.equal(JSON.stringify({ items, records }), before);
});
test("forecast panel is independent of quote availability and labels illustrative axis bilingually", () => {
  const source = readFileSync("components/member/KeyDatePriceChart.tsx", "utf8");
  assert.ok(source.indexOf("<ForecastPathPanel") < source.indexOf("{data ? <>"));
  const panel = readFileSync("components/member/ForecastPathPanel.tsx", "utf8");
  assert.match(panel, /横轴不是具体日期/);
  assert.match(panel, /Not a calendar axis/);
  assert.match(panel, /no price scale/);
  assert.match(panel, /原发布记录不变/);
});
