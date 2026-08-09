import assert from "node:assert/strict";
import test from "node:test";

import { WEEKLY_ALPHA_CALENDAR_20260810, assertWeeklyAlphaCalendar20260810 } from "../lib/calendar/weekly-alpha-calendar";
import { WEEKLY_ALPHA_20260810_BASE } from "../lib/data/weekly-alpha-20260810";
import { TEACHER_FINANCE_LIUYAO_DOCTRINE } from "../lib/research/teacher-finance-liuyao";

test("Weekly Alpha 5 first issue has exactly five concentrated targets", () => {
  assert.equal(WEEKLY_ALPHA_20260810_BASE.entries.length, 5);
  assert.deepEqual(WEEKLY_ALPHA_20260810_BASE.entries.map((item) => item.slug), ["spcx", "btc", "msft", "googl", "sp500"]);
  assert.ok(WEEKLY_ALPHA_20260810_BASE.entries.every((item) => item.direction === "BULLISH"));
  assert.ok(!WEEKLY_ALPHA_20260810_BASE.entries.some((item) => item.slug === "hype" || item.slug === "sol"));
});

test("calendar publication gate locks Aug 10-16 to verified sexagenary dates", () => {
  assert.equal(assertWeeklyAlphaCalendar20260810(), true);
  assert.deepEqual(
    WEEKLY_ALPHA_CALENDAR_20260810.filter((item) => item.date >= "2026-08-10").map((item) => item.dayGanzhi),
    ["丙辰", "丁巳", "戊午", "己未", "庚申", "辛酉", "壬戌"]
  );
  assert.ok(WEEKLY_ALPHA_CALENDAR_20260810.every((item) => item.monthGanzhi === "丙申"));
  assert.ok(WEEKLY_ALPHA_CALENDAR_20260810.every((item) => item.xunKong === "子丑"));
});

test("teacher doctrine forbids hexagram-name direction voting and technical reversal", () => {
  const interpretation = TEACHER_FINANCE_LIUYAO_DOCTRINE.interpretationRules.join(" ");
  const technical = TEACHER_FINANCE_LIUYAO_DOCTRINE.technicalRules.join(" ");
  assert.match(interpretation, /不能看到/);
  assert.match(interpretation, /卦名/);
  assert.match(technical, /不拥有方向投票权/);
});
