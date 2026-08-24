import test from "node:test";
import assert from "node:assert/strict";
import { listStaticFocusForecasts } from "../lib/data/conviction/focus-static-forecast-registry";
import {
  SEPTEMBER_SECTOR_COMPARISON_20260824,
  SEPTEMBER_WEEKLY_REVISIONS_20260824,
} from "../lib/data/conviction/september-weekly-revisions-20260824";

test("2026-08-24 source review stores 24 independent weekly charts plus the Intel September month chart", () => {
  const weekly = SEPTEMBER_WEEKLY_REVISIONS_20260824.filter((row) => row.forecastType.startsWith("WEEK"));
  const month = SEPTEMBER_WEEKLY_REVISIONS_20260824.filter((row) => row.forecastType === "MONTH_1");
  assert.equal(weekly.length, 24);
  assert.equal(month.length, 1);
  assert.equal(SEPTEMBER_WEEKLY_REVISIONS_20260824.length, 25);
  assert.equal(month[0]?.id, "INTC-SEP-20260824-V2");
  assert.equal(month[0]?.direction, "先涨后跌");
  assert.equal(month[0]?.calendarMonthPath?.length, 5);
});

test("all new records preserve source and method boundaries", () => {
  for (const row of SEPTEMBER_WEEKLY_REVISIONS_20260824) {
    assert.equal(row.status, "published");
    assert.equal(row.validationStatus, "UNVERIFIED");
    assert.match(row.ichingEvidence.notes, /用户.*本人排盘|来源为用户本人排盘/u);
    assert.doesNotMatch(row.ichingEvidence.notes, /老师原卦预测/u);
    assert.ok(row.methodViews?.some((view) => view.weight === 0 && /奇门/u.test(view.label)));
    assert.equal(row.supportLevels.length, 0);
    assert.equal(row.resistanceLevels.length, 0);
  }
});

test("new weekly horizons are reachable through the static focus registry", () => {
  const expected = new Map([
    ["cxmt", "CXMT-W8-20260928-V1"],
    ["googl", "GOOGL-W8-20260928-V1"],
    ["asteroid", "ASTEROID-W9-20260928-V1"],
    ["sol", "SOL-W8-20260928-V1"],
    ["intel", "INTC-W5-20260928-V1"],
  ] as const);
  for (const [assetId, id] of expected) {
    assert.ok(listStaticFocusForecasts(assetId).some((row) => row.id === id), `${assetId} must include ${id}`);
  }
});

test("sector comparison keeps independent weekly evidence separate from monthly decomposition", () => {
  assert.equal(SEPTEMBER_SECTOR_COMPARISON_20260824.length, 11);
  assert.equal(SEPTEMBER_SECTOR_COMPARISON_20260824.find((row) => row.asset === "SOL")?.basis, "独立周卦");
  assert.equal(SEPTEMBER_SECTOR_COMPARISON_20260824.find((row) => row.asset === "BTC")?.basis, "月度路线拆分");
  assert.deepEqual(
    SEPTEMBER_SECTOR_COMPARISON_20260824.find((row) => row.asset === "Intel")?.periods.slice(-2),
    ["震荡下跌", "下跌"],
  );
  assert.deepEqual(
    SEPTEMBER_SECTOR_COMPARISON_20260824.find((row) => row.asset === "太空狗")?.periods.slice(-2),
    ["上涨", "震荡上涨"],
  );
});
