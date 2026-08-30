import assert from "node:assert/strict";
import test from "node:test";

import {
  BTC_SEPTEMBER_WEEKLY_FORECASTS_20260831,
  BTC_SEPTEMBER_WEEKLY_SOURCE_META_20260831,
} from "../lib/data/conviction/btc-september-weekly-20260831";
import { getConvictionWeeklyFreshnessOverview } from "../lib/data/conviction/admin-weekly-freshness";
import { listStaticFocusForecasts } from "../lib/data/conviction/focus-static-forecast-registry";
import { buildSectorResonanceBoard } from "../lib/data/conviction/sector-resonance-board";

const LABELS = [
  "月令六亲流派（主判）",
  "动爻节奏流派（复核）",
  "用神强弱流派（复核）",
  "卦象取形流派（复核）",
];

test("BTC四张未来周卦保留原始日期并在8月31日首次锁定", () => {
  assert.equal(BTC_SEPTEMBER_WEEKLY_FORECASTS_20260831.length, 4);
  assert.deepEqual(BTC_SEPTEMBER_WEEKLY_SOURCE_META_20260831.map((row) => row.sourceFile), [
    "BTC/8.31-9.6.jpg",
    "BTC/9.7-9.14.jpg",
    "BTC/9.15-9.21.jpg",
    "BTC/9.22-9.29.jpg",
  ]);
  assert.deepEqual(BTC_SEPTEMBER_WEEKLY_FORECASTS_20260831.map((row) => [row.forecastType, row.periodStart, row.periodEnd]), [
    ["WEEK_5", "2026-08-31", "2026-09-06"],
    ["WEEK_6", "2026-09-07", "2026-09-14"],
    ["WEEK_7", "2026-09-15", "2026-09-21"],
    ["WEEK_8", "2026-09-22", "2026-09-29"],
  ]);
  assert.ok(BTC_SEPTEMBER_WEEKLY_FORECASTS_20260831.every((row) => row.lockedAt === "2026-08-31T07:35:00+08:00"));
  assert.ok(BTC_SEPTEMBER_WEEKLY_FORECASTS_20260831.every((row) => row.status === "published" && row.validationStatus === "UNVERIFIED"));
});

test("BTC周卦按四个匿名流派对比且不掩盖分歧", () => {
  assert.deepEqual(BTC_SEPTEMBER_WEEKLY_FORECASTS_20260831.map((row) => row.direction), [
    "先涨后跌",
    "先涨后跌",
    "震荡下跌",
    "先跌后涨",
  ]);
  for (const row of BTC_SEPTEMBER_WEEKLY_FORECASTS_20260831) {
    assert.deepEqual(row.methodViews?.map((view) => view.label), LABELS);
    assert.doesNotMatch(JSON.stringify(row.methodViews), /丙午|狼叔|万里|秋六爻/);
  }
  assert.deepEqual(BTC_SEPTEMBER_WEEKLY_FORECASTS_20260831[1]?.methodViews?.map((view) => view.direction), [
    "先涨后跌",
    "先涨后跌",
    "震荡上涨",
    "先涨后跌",
  ]);
  assert.equal(BTC_SEPTEMBER_WEEKLY_FORECASTS_20260831[1]?.consensusStars, 3);
  assert.ok(BTC_SEPTEMBER_WEEKLY_FORECASTS_20260831[2]?.methodViews?.every((view) => view.direction === "震荡下跌"));
  assert.equal(BTC_SEPTEMBER_WEEKLY_FORECASTS_20260831[2]?.consensusStars, 4);
});

test("BTC新周卦接入统一注册表、板块共振和后台新鲜度", () => {
  const ids = new Set(listStaticFocusForecasts("btc").map((row) => row.id));
  for (const row of BTC_SEPTEMBER_WEEKLY_FORECASTS_20260831) assert.equal(ids.has(row.id), true);

  const btc = buildSectorResonanceBoard().rows.find((row) => row.symbol === "BTC");
  assert.ok(btc);
  assert.deepEqual(btc.cells.slice(1, 5).map((cell) => cell.sourceKind), Array(4).fill("WEEKLY"));
  assert.deepEqual(btc.cells.slice(1, 5).map((cell) => cell.direction), [
    "先涨后跌",
    "先涨后跌",
    "震荡下跌",
    "先跌后涨",
  ]);

  const freshness = getConvictionWeeklyFreshnessOverview(new Date("2026-08-31T08:00:00+08:00"));
  assert.equal(freshness.affectedAssets.includes("BTC"), false);
  assert.equal(freshness.current, freshness.total);
  assert.equal(freshness.expired, 0);
  assert.equal(freshness.missing, 0);
});
