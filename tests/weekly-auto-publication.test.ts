import assert from "node:assert/strict";
import test from "node:test";
import { SOURCE_LOCKED_AUTO_WEEKLY_PUBLICATIONS } from "@/lib/data/source-locked-weekly-auto-publications";
import { buildWeeklyPublicSummary, listPublishedWeeklyAnalyses } from "@/lib/data/weekly-analysis";
import { buildAdminCycleGapSummary } from "@/lib/admin/admin-home-operations";

const targetNow = new Date("2026-08-29T12:00:00+08:00");

test("all nine core markets publish automatically for the Aug 31 week", () => {
  const rows = listPublishedWeeklyAnalyses(targetNow);
  assert.equal(rows.length, 9);
  assert.deepEqual(new Set(rows.map((item) => item.assetId)), new Set([
    "bitcoin", "eth", "sp500", "nasdaq-100", "shanghai-composite", "hang-seng",
    "gold", "silver", "wti-crude",
  ]));
  const summary = buildWeeklyPublicSummary(targetNow);
  assert.equal(summary.publishedCount, 9);
  assert.equal(summary.coverageCount, 9);
});

test("automatic publications are source locked before the target week", () => {
  const rows = SOURCE_LOCKED_AUTO_WEEKLY_PUBLICATIONS.filter((item) =>
    item.weekStart === "2026-08-31" && item.weekEnd === "2026-09-06"
  );
  assert.equal(rows.length, 6);
  for (const row of rows) {
    assert.equal(row.status, "published");
    assert.equal(row.originalLocked, true);
    assert.ok(row.sourceIds?.length);
    assert.ok(row.sourceOpinions?.length);
    assert.ok(Date.parse(row.publishedAt) < Date.parse(`${row.weekStart}T00:00:00+08:00`));
  }
});

test("BTC preserves teacher priority and weekly conflict instead of hiding either source", () => {
  const btc = SOURCE_LOCKED_AUTO_WEEKLY_PUBLICATIONS.find((item) => item.id === "AUTO-WEEKLY-BTC-20260831-V1");
  assert.ok(btc);
  assert.equal(btc.overallDirection, "震荡上涨");
  assert.equal(btc.sourceOpinions?.length, 2);
  assert.match(btc.weeklyPath, /周初.*回踩.*中后段.*震荡上行/);
  assert.match(btc.basisWeights?.note ?? "", /分歧不隐藏/);
});

test("evidence-only rows do not fabricate moving lines", () => {
  const sh = SOURCE_LOCKED_AUTO_WEEKLY_PUBLICATIONS.find((item) => item.assetId === "shanghai-composite");
  const hk = SOURCE_LOCKED_AUTO_WEEKLY_PUBLICATIONS.find((item) => item.assetId === "hang-seng");
  assert.equal(sh?.overallDirection, "震荡");
  assert.equal(hk?.overallDirection, "震荡下跌");
  assert.match(sh?.weeklyPath ?? "", /没有动爻，不补造/);
  assert.match(hk?.risks?.join(" ") ?? "", /尚未结构化到逐爻字段/);
});

test("the Sep 7 preparation week has no remaining source-backed cycle gaps", () => {
  const summary = buildAdminCycleGapSummary(targetNow);
  assert.equal(summary.weeklyStart, "2026-09-07");
  assert.equal(summary.weeklyEnd, "2026-09-13");
  assert.equal(summary.taskCount, 0);
  assert.deepEqual(summary.items, []);
});

test("BTC Sep 7 report keeps both locked sources and does not invent a daily hexagram", () => {
  const btc = SOURCE_LOCKED_AUTO_WEEKLY_PUBLICATIONS.find((item) => item.id === "AUTO-WEEKLY-BTC-20260907-V1");
  assert.ok(btc);
  assert.equal(btc.weekStart, "2026-09-07");
  assert.equal(btc.weekEnd, "2026-09-13");
  assert.equal(btc.overallDirection, "震荡上涨");
  assert.equal(btc.sourceOpinions?.length, 2);
  assert.match(btc.basisWeights?.note ?? "", /不补造日卦/);
  assert.match(btc.risks?.join(" ") ?? "", /原始覆盖至9月14日/);
});
