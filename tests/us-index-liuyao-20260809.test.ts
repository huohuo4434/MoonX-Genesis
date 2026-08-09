import test from "node:test";
import assert from "node:assert/strict";
import {
  listAllWeeklyAnalyses,
  listPublishedWeeklyAnalyses,
} from "@/lib/data/weekly-analysis";
import { listResearchRecords } from "@/lib/data/research-records";
import { US_INDEX_CYCLE_ADMIN_ROWS_20260809 } from "@/lib/data/us-index-liuyao-20260809";

const PRE_WEEK = new Date("2026-08-09T06:10:00.000Z"); // 14:10 Beijing, Sunday

test("SPX weekly V2 is the active formal bullish direction with zero technical direction vote", () => {
  const rows = listPublishedWeeklyAnalyses(PRE_WEEK);
  const spx = rows.find((r) => r.assetId === "sp500");
  assert.ok(spx);
  assert.equal(spx.id, "WEEKLY-SPX-20260810-V2");
  assert.equal(spx.overallDirection, "上涨");
  assert.equal(spx.version, 2);
  assert.equal(spx.basisWeights?.technical, 0);
  assert.equal(spx.basisWeights?.liuyao, 75);
  assert.equal(spx.probabilities.up + spx.probabilities.flat + spx.probabilities.down, 100);
  assert.ok(spx.sourceIds?.includes("EXTERNAL-WOLF-SPY-WEEKLY-20260809"));
  assert.deepEqual(spx.keySupport, []);
  assert.deepEqual(spx.keyResistance, []);
});

test("NDX weekly V2 separates bearish formal direction from the midweek rebound path", () => {
  const rows = listPublishedWeeklyAnalyses(PRE_WEEK);
  const ndx = rows.find((r) => r.assetId === "nasdaq-100");
  assert.ok(ndx);
  assert.equal(ndx.id, "WEEKLY-NDX-20260810-V2");
  assert.equal(ndx.overallDirection, "下跌");
  assert.match(ndx.weeklyPath, /周二或周三.*反弹/);
  assert.match(ndx.weeklyPath, /不把反弹改写成整周看涨/);
  assert.equal(ndx.basisWeights?.technical, 0);
  assert.ok(ndx.sourceIds?.includes("EXTERNAL-WOLF-QQQ-WEEKLY-20260809"));
});

test("previous SPX and NDX V1 records remain archived instead of being overwritten", () => {
  const rows = listAllWeeklyAnalyses();
  const spxV1 = rows.find((r) => r.id === "WEEKLY-SPX-20260810-V1" && r.status === "archived");
  const ndxV1 = rows.find((r) => r.id === "WEEKLY-NDX-20260810-V1" && r.status === "archived");
  assert.ok(spxV1);
  assert.ok(ndxV1);
});

test("new long-horizon US-index Liu Yao records are stored and the duplicate NDX 2027 cast is audit-only", async () => {
  const records = await listResearchRecords();
  const ids = new Set(records.map((r) => r.id));
  for (const id of [
    "ORACLE-SPX-OCT-20260809",
    "ORACLE-SPX-NOV-20260809",
    "ORACLE-SPX-DEC-20260809",
    "ORACLE-SPX-2027-20260809",
    "ORACLE-SPX-5Y-20260809",
    "ORACLE-NDX-OCT-20260809",
    "ORACLE-NDX-NOV-20260809",
    "ORACLE-NDX-DEC-20260809",
    "ORACLE-NDX-2027-FIRST-20260809",
    "ORACLE-NDX-2027-DUPLICATE-20260809",
    "ORACLE-NDX-5Y-20260809",
    "EXTERNAL-WOLF-SPY-WEEKLY-20260809",
    "EXTERNAL-WOLF-QQQ-WEEKLY-20260809",
    "EXTERNAL-WOLF-TSLA-WEEKLY-20260809",
  ]) assert.ok(ids.has(id), id);

  const duplicate = records.find((r) => r.id === "ORACLE-NDX-2027-DUPLICATE-20260809");
  assert.ok(duplicate);
  assert.equal(duplicate.consensusEligible, false);
  assert.equal(duplicate.humanReviewStatus, "pending-review");

  const wolf = records.find((r) => r.id === "EXTERNAL-WOLF-QQQ-WEEKLY-20260809");
  assert.ok(wolf);
  assert.equal(wolf.excludeFromLongTermConsensus, true);
  const tsla = records.find((r) => r.id === "EXTERNAL-WOLF-TSLA-WEEKLY-20260809");
  assert.ok(tsla);
  assert.equal(tsla.consensusEligible, false);
});

test("redacted stored research does not retain personal birth/name fields from screenshots", async () => {
  const records = (await listResearchRecords()).filter((r) => r.tags.includes("uploaded-20260809"));
  const serialized = JSON.stringify(records);
  assert.doesNotMatch(serialized, /1984年9月19日|1984-09-19|02:35|赵志伟/);
});

test("admin full-cycle gets Oct-Dec SPX/NDX rows with non-statistical direction labels", () => {
  assert.equal(US_INDEX_CYCLE_ADMIN_ROWS_20260809.length, 6);
  assert.equal(new Set(US_INDEX_CYCLE_ADMIN_ROWS_20260809.map((r) => r.id)).size, 6);
  assert.ok(US_INDEX_CYCLE_ADMIN_ROWS_20260809.every((r) => r.horizon === "MONTH"));
  assert.ok(US_INDEX_CYCLE_ADMIN_ROWS_20260809.every((r) => r.probabilityLabel.includes("非统计概率")));
});
