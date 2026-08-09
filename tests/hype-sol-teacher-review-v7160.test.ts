import assert from "node:assert/strict";
import test from "node:test";

import {
  HYPE_TEACHER_REVIEW_FORECASTS_20260809,
  SOL_TEACHER_REVIEW_FORECASTS_20260809,
  listHypePeriodForecasts20260809,
  listSolPeriodForecasts20260809,
} from "../lib/data/conviction/hype-sol-20260809";

function latestByType(rows: ReturnType<typeof listHypePeriodForecasts20260809>, type: string) {
  return rows.filter((item) => item.forecastType === type).sort((a, b) => b.version - a.version || b.publishedAt.localeCompare(a.publishedAt))[0];
}

test("HYPE teacher review preserves old audit and promotes V4", () => {
  const rows = listHypePeriodForecasts20260809();
  assert.ok(rows.some((item) => item.id === "HYPE-W2-20260809-V3"));
  assert.equal(latestByType(rows, "WEEK_2")?.id, "HYPE-W2-20260809-V4");
  assert.equal(latestByType(rows, "WEEK_3")?.id, "HYPE-W3-20260817-V4");
  assert.equal(latestByType(rows, "WEEK_4")?.id, "HYPE-W4-20260823-V4");
  assert.ok(HYPE_TEACHER_REVIEW_FORECASTS_20260809.every((item) => item.methodViews?.some((view) => view.weight === 0 && /不投方向/.test(view.label))));
});

test("SOL remains a full watchlist asset and teacher-reviewed versions are latest", () => {
  const rows = listSolPeriodForecasts20260809();
  assert.ok(rows.some((item) => item.id === "SOL-W1-20260809-V1"));
  assert.equal(latestByType(rows, "WEEK")?.id, "SOL-W1-20260809-V2");
  assert.equal(latestByType(rows, "WEEK_2")?.id, "SOL-W2-20260817-V2");
  assert.equal(latestByType(rows, "WEEK_3")?.id, "SOL-W3-20260824-V2");
  assert.equal(latestByType(rows, "MONTH_1")?.id, "SOL-M1-20260809-V2");
  assert.ok(SOL_TEACHER_REVIEW_FORECASTS_20260809.every((item) => item.methodViews?.some((view) => view.weight === 0 && /不投方向/.test(view.label))));
});

test("HYPE and SOL reviewed records keep technical analysis out of direction voting", () => {
  for (const row of [...HYPE_TEACHER_REVIEW_FORECASTS_20260809, ...SOL_TEACHER_REVIEW_FORECASTS_20260809]) {
    assert.ok(row.methodViews?.every((view) => !/技术/.test(view.label) || view.weight === 0));
  }
});
