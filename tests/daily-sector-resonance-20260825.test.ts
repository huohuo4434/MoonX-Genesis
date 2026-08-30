import test from "node:test";
import assert from "node:assert/strict";
import { buildDailySectorCell, buildDailySectorResonanceBoard } from "../lib/data/conviction/daily-sector-resonance";
import type { SectorResonanceCell } from "../lib/data/conviction/sector-resonance-board";

function weeklyCell(direction: string, markerDate = "2026-08-27"): SectorResonanceCell {
  return {
    direction,
    sourceKind: "WEEKLY",
    sourceLabel: "完整周卦",
    summary: "测试周路径",
    forecastId: "TEST-WEEK",
    timingMarkers: direction.includes("先") ? [{ date: markerDate, label: "8/27 转折观察", sourceLabel: "周卦路径", strength: "DERIVED" }] : [],
    liuyaoDetail: null,
  };
}

test("逐日板块共振覆盖六周42天和全部22个重点品种", () => {
  const board = buildDailySectorResonanceBoard();
  assert.equal(board.weeks.length, 6);
  assert.equal(board.weeks.flatMap((week) => week.days).length, 42);
  assert.equal(board.rows.length, 22);
  assert.ok(board.rows.every((row) => row.cells.length === 42));
  assert.ok(board.summaries.some((item) => item.group === "加密资产" && item.date === "2026-08-29" && item.covered > 0));
});

test("先涨后跌按转折窗拆成转折前、关键日和转折后，不制造日卦", () => {
  const cell = weeklyCell("先涨后跌");
  const before = buildDailySectorCell({ assetId: "btc", date: "2026-08-26", weeklyCell: cell });
  const turn = buildDailySectorCell({ assetId: "btc", date: "2026-08-27", weeklyCell: cell });
  const after = buildDailySectorCell({ assetId: "btc", date: "2026-08-28", weeklyCell: cell });
  assert.deepEqual([before.side, turn.side, after.side], ["BULL", "NEUTRAL", "BEAR"]);
  assert.deepEqual([before.state, turn.state, after.state], ["BULL", "TURN", "BEAR"]);
  assert.match(turn.sourceLabel, /转折窗/u);
  assert.doesNotMatch(JSON.stringify([before, turn, after]), /日卦/u);
});

test("休市、月卦路径和缺少数据都不计入逐日共振，但月卦路径不再误报待补", () => {
  const closed = buildDailySectorCell({ assetId: "intel", date: "2026-08-29", weeklyCell: weeklyCell("上涨") });
  assert.equal(closed.state, "CLOSED");
  assert.equal(closed.counted, false);

  const context: SectorResonanceCell = { ...weeklyCell("上涨"), sourceKind: "MONTHLY_CONTEXT", sourceLabel: "月度背景" };
  const monthly = buildDailySectorCell({ assetId: "btc", date: "2026-08-29", weeklyCell: context });
  assert.equal(monthly.state, "NEUTRAL");
  assert.equal(monthly.counted, false);
  assert.equal(monthly.label, "月卦上涨");
  assert.doesNotMatch(monthly.summary, /待补/u);

  const missingContext: SectorResonanceCell = { ...weeklyCell("待补"), sourceKind: "MISSING", sourceLabel: "待补完整周卦" };
  const missing = buildDailySectorCell({ assetId: "btc", date: "2026-08-29", weeklyCell: missingContext });
  assert.equal(missing.state, "MISSING");
  assert.equal(missing.counted, false);
  assert.match(missing.summary, /不从年卦或月卦硬拆/u);
});

test("传统市场周末整板块显示休市，加密资产周末继续形成共振", () => {
  const board = buildDailySectorResonanceBoard();
  const us = board.summaries.find((item) => item.group === "美股指数" && item.date === "2026-08-29");
  const crypto = board.summaries.find((item) => item.group === "加密资产" && item.date === "2026-08-29");
  assert.equal(us?.status, "CLOSED");
  assert.notEqual(crypto?.status, "CLOSED");
  assert.ok((crypto?.covered ?? 0) >= 2);
});
