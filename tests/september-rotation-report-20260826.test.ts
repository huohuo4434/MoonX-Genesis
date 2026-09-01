import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { bingwuCrossAssetRotation20260825Records } from "../lib/data/bingwu-cross-asset-rotation-20260825";
import { MEMBER_SEPTEMBER_ROTATION_REPORT_20260826 as report } from "../lib/data/member-september-rotation-report-20260826";
import { QIMEN_CYCLE_PATTERN_SOURCE_20260901 as cyclePattern } from "../lib/data/qimen-cycle-pattern-source-20260901";
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
  assert.equal(report.assets.length, 4);
  assert.equal(report.phases.length, 4);
  assert.ok(report.phases.some((phase) => phase.periodZh === "9月7日—9月14日"));
  assert.ok(report.assets.find((asset) => asset.symbol === "BTC")?.windowZh.includes("9月9日至11日"));
  const eth = report.assets.find((asset) => asset.symbol === "ETH");
  assert.equal(eth?.directionZh, "先涨后跌");
  assert.match(eth?.conclusionZh ?? "", /中下旬.*偏弱/);
  assert.ok(report.phases.every((phase) => Boolean(phase.ethZh) && Boolean(phase.ethEn)));

  const memberFacing = JSON.stringify(report);
  assert.doesNotMatch(memberFacing, /丙午|吴昌烨|狼叔|金兔子/);
  assert.doesNotMatch(memberFacing, /AI生成|人工智能生成/);
});

test("monthly page puts the concise conclusion and trading plan before supporting research", () => {
  const reportSource = fs.readFileSync(path.join(process.cwd(), "components/member/MemberSeptemberRotationReport.tsx"), "utf8");
  const pageSource = fs.readFileSync(path.join(process.cwd(), "components/member/MemberMonthlyPage.tsx"), "utf8");

  assert.ok(reportSource.indexOf("data-monthly-action-summary") < reportSource.indexOf("report.assets.map"));
  assert.match(reportSource, /<details[\s\S]*展开确认与失效条件/);
  assert.ok(pageSource.indexOf("<MemberSeptemberRotationReport") < pageSource.indexOf("cycleResearchOverlays.length"));
  assert.equal((pageSource.match(/Expected path|运行路径/g) ?? []).length, 0, "monthly cards must not repeat the path twice");
});

test("cycle-pattern school stays separate from object-yongshen and directional-palace methods", () => {
  assert.equal(cyclePattern.publicLabelZh, "周期格局流派");
  assert.match(cyclePattern.method.differsFromObjectYongshenZh, /具体产品用神/);
  assert.match(cyclePattern.method.differsFromDirectionalPalaceZh, /上涨、下跌、震荡三类结果宫/);
  assert.equal(cyclePattern.method.authority, "MONTHLY_ENVIRONMENT_AND_TIMING_ONLY");
  assert.equal(cyclePattern.method.maySetOfficialDirection, false);
  assert.equal(cyclePattern.method.mayChangeAssetConfidence, false);
  assert.equal(cyclePattern.method.mayTriggerTrade, false);
});

test("September cycle agreement raises only research climate confidence", () => {
  assert.equal(cyclePattern.september2026.relationshipToMoox, "PARTIAL_RESONANCE");
  assert.equal(cyclePattern.september2026.researchConfidenceBefore, "MEDIUM");
  assert.equal(cyclePattern.september2026.researchConfidenceAfter, "MEDIUM_HIGH");
  assert.equal(cyclePattern.september2026.assetDirectionChange, "NONE");
  assert.equal(cyclePattern.september2026.officialForecastChange, "NONE");
  assert.equal(cyclePattern.september2026.tradingAuthority, false);
  assert.match(cyclePattern.september2026.confidenceScopeZh, /各品种正式方向、概率和点位不变/);
  assert.match(cyclePattern.historyPolicy.reasonZh, /不补计历史命中率/);
});

test("all supplied cycle-pattern materials are hash locked and the public card hides identities", () => {
  assert.equal(cyclePattern.materials.length, 23);
  assert.ok(cyclePattern.materials.every((item) => /^[A-F0-9]{64}$/.test(item.sha256)));
  assert.equal(cyclePattern.materials.filter((item) => item.period === "SEPTEMBER_2026").length, 6);
  assert.ok(Date.parse(cyclePattern.forwardScoreFrom) > Date.parse(cyclePattern.receivedAt));

  const component = fs.readFileSync(path.join(process.cwd(), "components/member/MemberSeptemberRotationReport.tsx"), "utf8");
  const publicCopy = `${cyclePattern.publicLabelZh}${cyclePattern.september2026.sourceConclusionZh}${component}`;
  assert.match(component, /data-cycle-pattern-crosscheck/);
  assert.doesNotMatch(publicCopy, /王老师|王子瑜|吴老师|金兔子/);
  assert.doesNotMatch(publicCopy, /可自动下单|提高交易权限/);
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

