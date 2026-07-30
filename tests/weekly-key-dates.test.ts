import test from "node:test";
import assert from "node:assert/strict";
import { expandBranchSignalToWeeklyKeyDates } from "../lib/calendar/weekly-key-dates";

test("teacher branch signals are published as exact Gregorian dates", () => {
  const dates = expandBranchSignalToWeeklyKeyDates({
    startDate: "2026-08-01",
    endDate: "2026-08-16",
    branches: ["亥", "卯", "未"],
    expectedEffect: "上涨",
    source: "QIMEN",
    label: "奇门提示的上涨窗口",
    confidence: 70,
  });
  assert.deepEqual(
    dates.map((d) => d.date),
    ["2026-08-01", "2026-08-05", "2026-08-09", "2026-08-13"]
  );
  assert.ok(dates.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.date)));
});
