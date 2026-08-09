import assert from "node:assert/strict";
import test from "node:test";
import {
  HYPE_DUAL_TEACHER_FINAL_20260810,
  SOL_DUAL_TEACHER_FINAL_20260810,
  HYPE_UPDATED_VISIBLE_PERIOD_ORDER,
  SOL_VISIBLE_PERIOD_ORDER,
  listHypePeriodForecasts20260809,
  listSolPeriodForecasts20260809,
} from "../lib/data/conviction/hype-sol-20260809";

function latestByType(rows: ReturnType<typeof listHypePeriodForecasts20260809>, type: string) {
  return rows.filter((item) => item.forecastType === type && item.status === "published")
    .sort((a, b) => b.version - a.version || b.publishedAt.localeCompare(a.publishedAt))[0];
}

test("HYPE all member-visible tabs have a published body", () => {
  const rows = listHypePeriodForecasts20260809();
  for (const type of HYPE_UPDATED_VISIBLE_PERIOD_ORDER) assert.ok(latestByType(rows, type), `HYPE ${type} must publish`);
  assert.equal(latestByType(rows, "WEEK_2")?.direction, "震荡下跌");
  assert.equal(latestByType(rows, "WEEK_3")?.direction, "先跌后涨");
  assert.equal(latestByType(rows, "WEEK_4")?.direction, "上涨");
  assert.equal(latestByType(rows, "MONTH_1")?.direction, "震荡上涨");
  assert.equal(latestByType(rows, "MONTH_3")?.direction, "震荡");
  assert.equal(latestByType(rows, "YEAR_3")?.direction, "震荡上涨");
  assert.ok(rows.some((item) => item.id === "HYPE-W2-20260809-V4"), "old teacher-review record remains auditable");
});

test("HYPE Sep-Dec path is explicitly 9 weak / 10 strong / 11 weak / 12 weak", () => {
  const row = latestByType(listHypePeriodForecasts20260809(), "MONTH_3");
  assert.equal(row?.id, "HYPE-AUTUMN-20260901-V6");
  assert.deepEqual(row?.calendarMonthPath?.map((m) => m.direction), ["震荡下跌", "上涨", "下跌", "震荡下跌"]);
});

test("SOL all member-visible tabs have a published body", () => {
  const rows = listSolPeriodForecasts20260809();
  for (const type of SOL_VISIBLE_PERIOD_ORDER) assert.ok(latestByType(rows, type), `SOL ${type} must publish`);
  assert.equal(latestByType(rows, "WEEK")?.direction, "震荡上涨");
  assert.equal(latestByType(rows, "WEEK_2")?.direction, "冲高回落");
  assert.equal(latestByType(rows, "WEEK_3")?.direction, "上涨");
  assert.equal(latestByType(rows, "MONTH_1")?.direction, "上涨");
  assert.equal(latestByType(rows, "YEAR_1")?.direction, "震荡下跌");
  assert.equal(latestByType(rows, "YEAR_3")?.direction, "震荡上涨");
  assert.ok(rows.some((item) => item.id === "SOL-W1-20260809-V2"), "old SOL teacher-review remains auditable");
});

test("SOL Sep-Dec path keeps October repair and November as strongest risk month", () => {
  const row = latestByType(listSolPeriodForecasts20260809(), "MONTH_3");
  assert.equal(row?.id, "SOL-AUTUMN-20260901-V3");
  assert.deepEqual(row?.calendarMonthPath?.map((m) => m.direction), ["震荡下跌", "上涨", "下跌", "震荡下跌"]);
  assert.match(row?.calendarMonthPath?.[2]?.riskNote ?? "", /快速下杀|冲击/);
});

test("two-teacher publication contains both teacher methods and no technical direction vote", () => {
  for (const row of [...HYPE_DUAL_TEACHER_FINAL_20260810, ...SOL_DUAL_TEACHER_FINAL_20260810]) {
    assert.equal(row.status, "published");
    assert.ok(row.methodViews && row.methodViews.length >= 2);
    assert.ok(row.methodViews.some((v) => /老师01/.test(v.label)));
    assert.ok(row.methodViews.some((v) => /老师02/.test(v.label)));
    assert.ok(row.methodViews.every((v) => !/技术/.test(v.label)));
  }
});
