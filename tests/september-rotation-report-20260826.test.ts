import assert from "node:assert/strict";
import test from "node:test";
import { bingwuCrossAssetRotation20260825Records } from "../lib/data/bingwu-cross-asset-rotation-20260825";
import { MEMBER_SEPTEMBER_ROTATION_REPORT_20260826 as report } from "../lib/data/member-september-rotation-report-20260826";
import { listResearchRecords } from "../lib/data/research-records";

test("teacher cycle records preserve the three distinct source conclusions", () => {
  assert.equal(bingwuCrossAssetRotation20260825Records.length, 3);

  const soxl = bingwuCrossAssetRotation20260825Records.find((record) => record.symbol === "SOXL");
  const btc = bingwuCrossAssetRotation20260825Records.find((record) => record.symbol === "BTC");
  const gold = bingwuCrossAssetRotation20260825Records.find((record) => record.symbol === "GOLD");

  assert.equal(soxl?.direction, "bullish");
  assert.match(soxl?.summary.zhCN ?? "", /9月7日至10月7日.*强势/);
  assert.match(soxl?.risks?.[1]?.zhCN ?? "", /不覆盖纳指100/);

  assert.equal(btc?.direction, "slightly-bullish");
  assert.deepEqual(btc?.resistances, [80000, 85000]);
  assert.match(btc?.summary.zhCN ?? "", /9月10日前趋势仍向上/);
  assert.match(btc?.summary.zhCN ?? "", /不是统计模型概率/);
  assert.match(btc?.invalidation?.zhCN ?? "", /站稳8\.5万美元/);

  assert.equal(gold?.direction, "neutral");
  assert.match(gold?.summary.zhCN ?? "", /9月7日前.*上行空间/);
  assert.match(gold?.summary.zhCN ?? "", /跌幅不会很大/);
  assert.equal(gold?.targets, undefined, "conversational price examples must not become formal targets");
});
test("member report labels the idea as relative rotation rather than guaranteed zero-sum causality", () => {
  assert.match(report.conclusionZh, /相对强弱/);
  assert.match(report.conclusionZh, /不是.*必然跌/);
  assert.match(report.inferenceZh, /跨资产推演/);
  assert.match(report.inferenceZh, /也可能短期同涨/);
  assert.match(report.resonanceZh, /时间跨度不一致/);
  assert.match(report.resonanceZh, /跨周期部分共振/);
});

test("member report exposes a concrete time map and does not leak teacher identities", () => {
  assert.equal(report.assets.length, 3);
  assert.equal(report.phases.length, 4);
  assert.ok(report.phases.some((phase) => phase.periodZh === "9月7日—9月14日"));
  assert.ok(report.assets.find((asset) => asset.symbol === "BTC")?.windowZh.includes("9月9日至11日"));

  const memberFacing = JSON.stringify(report);
  assert.doesNotMatch(memberFacing, /丙午|吴昌烨|狼叔|金兔子/);
  assert.doesNotMatch(memberFacing, /AI生成|人工智能生成/);
});

test("new records are wired into the research loader exactly once and remain non-executable", async () => {
  const records = await listResearchRecords();
  for (const expected of bingwuCrossAssetRotation20260825Records) {
    assert.equal(records.filter((record) => record.id === expected.id).length, 1);
    assert.equal(expected.publicSourceLabel.zhCN, "核心六爻研究");
    assert.equal(expected.accessLevel, "member");
    assert.equal(expected.visibility, "internal");
    assert.ok(expected.tags.includes("no-auto-trade"));
  }
});

