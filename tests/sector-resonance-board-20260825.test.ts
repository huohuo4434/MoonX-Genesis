import test from "node:test";
import assert from "node:assert/strict";
import { buildSectorResonanceBoard, SECTOR_RESONANCE_GROUP_ORDER } from "../lib/data/conviction/sector-resonance-board";
import { listNbisPeriodForecasts } from "../lib/data/conviction/nbis-liuyao-20260811";
import { listSandiskPeriodForecasts } from "../lib/data/conviction/sandisk-forecasts";

test("板块共振独立模块覆盖全部21个重点品种和本周至10月初六周", () => {
  const board = buildSectorResonanceBoard();
  assert.equal(board.rows.length, 21);
  assert.equal(board.weeks.length, 6);
  assert.equal(board.weeks[0]?.start, "2026-08-24");
  assert.equal(board.weeks[0]?.badge, "本周");
  assert.equal(board.weeks[1]?.badge, "下周");
  assert.deepEqual([...new Set(board.rows.map((row) => row.group))], SECTOR_RESONANCE_GROUP_ORDER);

  const required = ["CXMT", "INTC", "SNDK", "LITE", "MU", "NBIS", "MSFT", "TSLA", "SPX", "NDX", "GOLD", "SILVER", "WTI"];
  for (const symbol of required) assert.ok(board.rows.some((row) => row.symbol === symbol), `missing ${symbol}`);
  assert.ok(board.rows.every((row) => row.cells.length === board.weeks.length));
});

test("完整周卦与上级周期背景分开，背景不计入板块共振", () => {
  const board = buildSectorResonanceBoard();
  const mu = board.rows.find((row) => row.symbol === "MU");
  assert.ok(mu);
  assert.equal(mu.cells[1]?.sourceKind, "MONTHLY_CONTEXT");

  const semiconductorNext = board.summaries.find((item) => item.group === "半导体 / AI基础设施" && item.weekStart === "2026-08-31");
  assert.ok(semiconductorNext);
  assert.equal(semiconductorNext.exact, 5, "MU上级周期背景不得冒充第六张完整周卦");
});

test("闪迪同周期分歧保留且既有阶段卦略优先，NBIS与美股指数新周卦均已接入", () => {
  const board = buildSectorResonanceBoard();
  const sandisk = board.rows.find((row) => row.symbol === "SNDK");
  assert.equal(sandisk?.cells[1]?.direction, "先涨后跌");
  assert.equal(sandisk?.cells[1]?.forecastId, "SNDK-W5-20260831-V2");

  const nbis = board.rows.find((row) => row.symbol === "NBIS");
  assert.deepEqual(nbis?.cells.slice(1).map((cell) => cell.direction), ["震荡下跌", "先跌后涨", "震荡上涨", "先涨后跌", "震荡上涨"]);

  const spx = board.rows.find((row) => row.symbol === "SPX");
  const ndx = board.rows.find((row) => row.symbol === "NDX");
  assert.ok(spx?.cells.every((cell) => cell.sourceKind === "WEEKLY"));
  assert.ok(ndx?.cells.every((cell) => cell.sourceKind === "WEEKLY"));

  assert.ok(listNbisPeriodForecasts().some((item) => item.id === "NBIS-W8-20260928-V1"));
  assert.ok(listSandiskPeriodForecasts().some((item) => item.id === "SNDK-W9-20260928-V1"));
});
