import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { buildMemberKeyDateRadar } from "../lib/data/member-key-date-radar";
import {
  buildSectorKeyDateWindows,
  selectCurrentAndNextSectorWeeks,
} from "../lib/data/conviction/sector-key-date-overview";
import { buildSectorResonanceBoard } from "../lib/data/conviction/sector-resonance-board";

test("板块页首屏固定同时选择本周与下周，而不是只显示当前所选标签", () => {
  const board = buildSectorResonanceBoard();
  const weeks = selectCurrentAndNextSectorWeeks(board.weeks, "2026-08-30");
  assert.deepEqual(weeks.map((week) => week.start), ["2026-08-24", "2026-08-31"]);
  assert.deepEqual(weeks.map((week) => week.badge), ["本周", "下周"]);
  assert.equal(selectCurrentAndNextSectorWeeks(board.weeks, "2026-08-01")[0]?.start, "2026-08-24");
  assert.equal(selectCurrentAndNextSectorWeeks(board.weeks, "2026-12-01")[0]?.start, "2026-09-28");
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
  assert.match(page, /本周＋下周关键日/);
  assert.match(page, /href="\/member\/key-dates"/);
  assert.match(nav, /memberNav\.keyDates/);
  assert.match(nav, /footer\.memberKeyDates/);
});
