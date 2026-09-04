import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { buildMemberKeyDateRadar } from "../lib/data/member-key-date-radar";
import {
  buildSectorKeyDateWindows,
  selectCurrentAndNextSectorWeeks,
  labelSectorWeeks,
} from "../lib/data/conviction/sector-key-date-overview";
import { buildSectorResonanceBoard } from "../lib/data/conviction/sector-resonance-board";

test("板块页首屏固定同时选择本周与下周，而不是只显示当前所选标签", () => {
  const board = buildSectorResonanceBoard();
  const weeks = selectCurrentAndNextSectorWeeks(board.weeks, "2026-08-30");
  assert.deepEqual(weeks.map((week) => week.start), ["2026-08-24", "2026-08-31"]);
  assert.deepEqual(weeks.map((week) => week.badge), ["本周", "下周"]);
  const septemberWeeks = selectCurrentAndNextSectorWeeks(board.weeks, "2026-09-03");
  assert.deepEqual(septemberWeeks.map((week) => week.start), ["2026-08-31", "2026-09-07"]);
  assert.deepEqual(septemberWeeks.map((week) => week.badge), ["本周", "下周"]);
  assert.deepEqual(selectCurrentAndNextSectorWeeks(board.weeks, "2026-08-01"), []);
  assert.deepEqual(selectCurrentAndNextSectorWeeks(board.weeks, "2026-12-01"), []);
});

test("日周标签随北京时间滚动，不受数据截止日或历史选中周影响", async () => {
  const { buildDailySectorResonanceBoard } = await import("../lib/data/conviction/daily-sector-resonance");
  for (const [today, current, next] of [
    ["2026-09-04", "2026-08-31", "2026-09-07"],
    ["2026-09-06", "2026-08-31", "2026-09-07"],
    ["2026-09-07", "2026-09-07", "2026-09-14"],
    ["2026-10-04", "2026-09-28", undefined],
    ["2026-10-05", undefined, undefined],
  ]) {
    const board = buildSectorResonanceBoard(today);
    const daily = buildDailySectorResonanceBoard(board);
    for (const weeks of [board.weeks, daily.weeks]) {
      assert.equal(weeks.find((week) => week.badge === "本周")?.start, current, today);
      assert.equal(weeks.find((week) => week.badge === "下周")?.start, next, today);
    }
    assert.equal(board.asOf, "2026-09-03", "research cutoff must not be rewritten to today");
  }
  const weeks = buildSectorResonanceBoard("2026-09-04").weeks;
  assert.deepEqual(labelSectorWeeks(weeks, "invalid").map((week) => week.badge), Array(6).fill(null));
  assert.equal(weeks[1].badge, "本周", "labeling must not mutate the input");
  const weeklyView = readFileSync(join(process.cwd(), "components/conviction/SectorResonanceBoard.tsx"), "utf8");
  assert.doesNotMatch(weeklyView, /week\.start === selectedWeekStart|currentIndex/);
  assert.match(weeklyView, /week\.badge/);
  const page = readFileSync(join(process.cwd(), "app/member/sector-resonance/page.tsx"), "utf8");
  assert.match(page, /timeZone: "Asia\/Hong_Kong"/);
  assert.match(page, /buildSectorResonanceBoard\(today\)/);
  assert.match(page, /week\.start === params\.week/);
});

test("板块关键日摘要覆盖本周与下周且只包含板块页重点标的", () => {
  const board = buildSectorResonanceBoard();
  const windows = buildSectorKeyDateWindows({
    weeks: board.weeks,
    rows: board.rows,
    keyDates: buildMemberKeyDateRadar("2026-08-30"),
    asOfDate: "2026-08-30",
  });
  assert.equal(windows.length, 2);
  assert.ok(windows[0]?.items.some((item) => item.assetId === "btc" && item.focusDate === "2026-08-30"));
  assert.ok(windows[1]?.items.some((item) => item.assetId === "sandisk" && item.action === "TOP_EXIT_WATCH"));
  assert.ok(windows[1]?.items.some((item) => item.assetId === "tsla" && item.action === "BOTTOM_WATCH"));
  const boardAssets = new Set(board.rows.map((row) => row.assetId));
  assert.ok(windows.every(({ week, items }) => items.every((item) =>
    boardAssets.has(item.assetId)
    && item.focusDate >= week.start
    && item.focusDate <= week.end
    && item.focusDate >= "2026-08-30"
  )));
});

test("板块页面和会员频道都恢复关键日入口并明确展示下周", () => {
  const page = readFileSync(join(process.cwd(), "app/member/sector-resonance/page.tsx"), "utf8");
  const nav = readFileSync(join(process.cwd(), "config/member-channel-navigation.ts"), "utf8");
  assert.match(page, /下周板块预报/);
  assert.match(page, /value: item\.label/);
  assert.match(page, /facts=\{panel\.facts\}/);
  assert.match(page, /本周＋下周关键日/);
  assert.match(page, /href="\/member\/key-dates"/);
  assert.match(nav, /memberNav\.keyDates/);
  assert.match(nav, /footer\.memberKeyDates/);
});
