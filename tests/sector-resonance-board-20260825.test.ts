import test from "node:test";
import assert from "node:assert/strict";
import { buildSectorResonanceBoard, buildSectorTimingMarkers, SECTOR_RESONANCE_GROUP_ORDER } from "../lib/data/conviction/sector-resonance-board";
import { listNbisPeriodForecasts } from "../lib/data/conviction/nbis-liuyao-20260811";
import { listSandiskPeriodForecasts } from "../lib/data/conviction/sandisk-forecasts";
import { extractMemberLiuyaoRelations } from "../lib/research/member-liuyao-detail";

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
  assert.ok(board.rows.every((row) => Array.isArray(row.monthKeyWeeks)));
  assert.ok(board.rows.every((row) => "annualLiuyaoDetail" in row && "monthlyLiuyaoDetail" in row));
  assert.ok(board.rows.every((row) => row.cells.every((cell) => "liuyaoDetail" in cell)));
  assert.ok(board.rows.every((row) => row.annualDirection));
});

test("板块页可展开年、月、周卦，并且不把系统发布时间冒充起卦时间", () => {
  const board = buildSectorResonanceBoard();
  const intel = board.rows.find((row) => row.symbol === "INTC");
  assert.ok(intel?.annualLiuyaoDetail);
  assert.match(intel.annualLiuyaoDetail.primaryHexagram, /归妹/u);
  assert.ok(intel.annualLiuyaoDetail.keyMoments.some((item) => /9月/u.test(item.label)));
  assert.ok(intel.monthlyLiuyaoDetail);
  assert.ok(intel.cells.filter((cell) => cell.sourceKind === "WEEKLY").every((cell) => cell.liuyaoDetail?.horizon === "WEEK"));
  assert.equal("publishedAt" in intel.annualLiuyaoDetail, false);
  assert.equal("lockedAt" in intel.annualLiuyaoDetail, false);
  const memberCopy = JSON.stringify({ annual: intel.annualLiuyaoDetail, monthly: intel.monthlyLiuyaoDetail, weekly: intel.cells.map((cell) => cell.liuyaoDetail) });
  assert.doesNotMatch(memberCopy, /老师|用户|AI/iu);
});

test("标普与纳指9月月卦、长鑫新年卦和9月月卦均进入板块详情", () => {
  const board = buildSectorResonanceBoard();
  const spx = board.rows.find((row) => row.symbol === "SPX");
  const ndx = board.rows.find((row) => row.symbol === "NDX");
  const cxmt = board.rows.find((row) => row.symbol === "CXMT");
  assert.match(spx?.monthlyLiuyaoDetail?.primaryHexagram ?? "", /水泽节/u);
  assert.match(spx?.monthlyLiuyaoDetail?.structureNote ?? "", /风泽中孚.*山雷颐.*分歧/u);
  assert.match(ndx?.monthlyLiuyaoDetail?.primaryHexagram ?? "", /兑为泽/u);
  assert.match(cxmt?.annualLiuyaoDetail?.primaryHexagram ?? "", /地火明夷/u);
  assert.match(cxmt?.annualLiuyaoDetail?.changingHexagram ?? "", /震为雷/u);
  assert.match(cxmt?.monthlyLiuyaoDetail?.primaryHexagram ?? "", /山雷颐/u);
  assert.equal(cxmt?.monthlyLiuyaoDetail?.periodLabel, "2026-09-01—2026-09-30月卦");
});

test("六亲和生克标签只从已录入原盘证据抽取", () => {
  const relations = extractMemberLiuyaoRelations([
    "妻财申金临应，子孙辰土持世，兄弟午火发动化官鬼酉金；酉月妻财得令。",
  ]);
  assert.ok(relations.some((item) => item.label.startsWith("财爻")));
  assert.ok(relations.some((item) => item.label.startsWith("子孙")));
  assert.ok(relations.some((item) => item.label.startsWith("兄弟")));
  assert.ok(relations.some((item) => item.label.startsWith("官鬼")));
  assert.ok(relations.some((item) => item.label.startsWith("动变")));
  assert.ok(relations.some((item) => item.label.startsWith("旺衰")));
  assert.deepEqual(extractMemberLiuyaoRelations(["只有卦名，没有六亲原盘。"]), []);
});

test("周格优先显示明确关键日，没有明确日时只生成有来源标识的观察窗", () => {
  const exact = buildSectorTimingMarkers({
    assetId: "btc",
    direction: "先涨后跌",
    periodStart: "2026-08-24",
    periodEnd: "2026-08-30",
    keyDates: [{ date: "2026-08-27", type: "阶段高点", label: "阶段高点候选", source: "LIUYAO" }],
  });
  assert.deepEqual(exact, [{ date: "2026-08-27", label: "8/27 阶段高点候选", sourceLabel: "六爻明确", strength: "EXACT" }]);

  const derived = buildSectorTimingMarkers({ assetId: "intel", direction: "先跌后涨", periodStart: "2026-08-31", periodEnd: "2026-09-06" });
  assert.equal(derived.length, 1);
  assert.equal(derived[0]?.sourceLabel, "周卦路径");
  assert.match(derived[0]?.label ?? "", /转强观察/u);
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
