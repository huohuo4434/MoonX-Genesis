import assert from "node:assert/strict";
import { test } from "node:test";
import { findTeacherPriorityLiuyaoSource, teacherSourceWithOverlap } from "../lib/data/teacher-priority-liuyao-20260821";
import { generateCoreMarketFromWeeklyPure } from "../lib/forecasts/daily-pipeline";
import { generateDailyFromWeekly } from "../lib/forecasts/weekly-to-daily";
const now = Date.parse("2026-09-05T00:00:00+08:00");
test("teacher selection requires formal publication available at the captured time", () => {
  assert.equal(findTeacherPriorityLiuyaoSource("BTC", "2026-09-07", Date.parse("2026-08-01")), null);
  assert.equal(findTeacherPriorityLiuyaoSource("BTC", "2026-09-07", NaN), null);
  assert.ok(findTeacherPriorityLiuyaoSource("BTC", "2026-09-07", now));
  assert.equal(findTeacherPriorityLiuyaoSource("BTC", "2026-09-11", now), null);
});
test("stage boundary is not extended and its full price/path survives daily derivation", () => {
  const row = generateCoreMarketFromWeeklyPure("BTC", "2026-09-07", "DRAFT", now)!;
  assert.match(row.sourceWeeklyForecastId, /BINGWU/);
  assert.equal(row.direction, "震荡上涨");
  assert.match(row.expectedPath, /8\.5|85,?000|8万/);
  assert.match(row.risks.join(" "), /2026-09-10/);
  assert.match(row.risks.join(" "), /先涨后跌/);
  const later = generateCoreMarketFromWeeklyPure("BTC", "2026-09-11", "DRAFT", now)!;
  assert.doesNotMatch(later.sourceWeeklyForecastId, /BINGWU/);
});

test("multi-month SOXL and SNDK stages do not collapse to a fabricated late-week direction", () => {
  for (const marketCode of ["SOXL", "SNDK"]) {
    const weekly = findTeacherPriorityLiuyaoSource(marketCode, "2026-09-08", now)!;
    assert.ok(weekly);
    const row = generateDailyFromWeekly({ weekly, forecastDate: "2026-09-08" });
    assert.equal(row.direction, weekly.weeklyDirection);
    assert.equal(row.expectedPath, weekly.weeklyPath);
  }
});
test("overlap explanation cannot mutate teacher, invent a same-window vote or include a future unpublished challenger", () => {
  const teacher = findTeacherPriorityLiuyaoSource("BTC", "2026-09-07", now)!;
  const before = structuredClone(teacher);
  const other = { ...teacher, id: "other", weeklyDirection: "先涨后跌", periodStart: "2026-09-07", periodEnd: "2026-09-13" };
  const result = teacherSourceWithOverlap(teacher, other, now)!;
  assert.equal(result.id, teacher.id); assert.equal(result.periodEnd, teacher.periodEnd);
  assert.ok(result.specialPatterns.includes("OVERLAPPING_LIUYAO_PATH_CONFLICT"));
  assert.deepEqual(teacher, before);
  assert.deepEqual(teacherSourceWithOverlap(teacher, { ...other, lockedAt: "2027-01-01" }, now), teacher);
});
