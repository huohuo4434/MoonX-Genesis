import test from "node:test";
import assert from "node:assert/strict";
import { listMonthlyMarketCycles } from "@/lib/data/monthly-market-outlook";
import { listResearchRecords } from "@/lib/data/research-records";
import {
  buildWeeklyMarketSlots,
  listAllPublishedWeeklyAnalyses,
  toWeeklyMemberView,
} from "@/lib/data/weekly-analysis";

const SOURCE_PREFIX = "QIMEN-ROTATION-POST-20260823";

test("rotation post is stored as anonymous research without inventing chart levels", async () => {
  const records = (await listResearchRecords()).filter((item) => item.id.startsWith(SOURCE_PREFIX));
  assert.equal(records.length, 4);
  assert.deepEqual(
    records.map((item) => item.assetId).sort(),
    ["bitcoin", "gold", "nasdaq-100", "silver"]
  );

  for (const record of records) {
    assert.equal(record.framework, "macro");
    assert.equal(record.consensusEligible, false);
    assert.equal(record.visibility, "internal");
    assert.equal(record.sourcePublishedAt, null);
    assert.equal(record.sourcePublishedAtVerified, false);
    assert.equal(record.supports, undefined);
    assert.equal(record.resistances, undefined);
    assert.equal(record.targets, undefined);
    assert.equal(record.turningWindows, undefined);
    assert.doesNotMatch(record.publicSourceLabel.zhCN, /吴|老师真实姓名|网站相关/);
  }
});

test("BTC V6 keeps the Liu-Yao weekly direction and adds only the unconfirmed-reversal warning", () => {
  const btc = buildWeeklyMarketSlots(new Date("2026-08-23T19:00:00+08:00"))
    .filter((slot) => slot.kind === "published")
    .map((slot) => slot.analysis)
    .find((item) => item.assetId === "bitcoin");

  assert.equal(btc?.id, "WEEKLY-BTC-20260824-V6");
  assert.equal(btc?.overallDirection, "探底回升");
  assert.match(btc?.weeklyPath ?? "", /24日至25日先下探.*26日02:24 UTC后修复/);
  assert.match(btc?.weeklyPath ?? "", /反转尚未确认.*不是新奇门盘/);
  assert.equal(btc?.basisWeights.liuyao, 90);
  assert.equal(btc?.basisWeights.qimen, 10);
  assert.equal(btc?.basisWeights.macro, 0);
  assert.equal(btc?.probabilities.up, 39);
  assert.equal(btc?.confidence, 78);

  const full = listAllPublishedWeeklyAnalyses().find((item) => item.id === "WEEKLY-BTC-20260824-V6");
  assert.ok(full);
  const memberJson = JSON.stringify(toWeeklyMemberView(full));
  assert.doesNotMatch(memberJson, /吴昌|02_奇门遁甲老师|网站相关|QIMEN-ROTATION-POST/);
  assert.match(memberJson, /板块轮动|資產輪動|资产轮动/);
});

test("the external gold view remains disagreement evidence and does not overwrite September Liu-Yao", async () => {
  const goldResearch = (await listResearchRecords()).find(
    (item) => item.id === `${SOURCE_PREFIX}-GOLD`
  );
  const septemberGold = listMonthlyMarketCycles()
    .find((cycle) => cycle.id === "2026-09")
    ?.items.find((item) => item.assetId === "gold");

  assert.equal(goldResearch?.direction, "slightly-bullish");
  assert.equal(goldResearch?.consensusEligible, false);
  assert.equal(septemberGold?.direction, "震荡下跌");
  assert.match(septemberGold?.path ?? "", /先承压.*修复/);
});

test("rotation research has no direct trading integration", () => {
  const weekly = listAllPublishedWeeklyAnalyses().find(
    (item) => item.id === "WEEKLY-BTC-20260824-V6"
  );
  assert.match(weekly?.confirmation ?? "", /不直接触发实盘/);
  assert.doesNotMatch(JSON.stringify(weekly), /Bitget|LIVE1000|executeOrder|placeOrder/);
});
