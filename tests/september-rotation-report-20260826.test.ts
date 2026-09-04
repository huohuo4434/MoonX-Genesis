import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { bingwuCrossAssetRotation20260825Records } from "../lib/data/bingwu-cross-asset-rotation-20260825";
import {
  MEMBER_SEPTEMBER_ROTATION_REPORT_20260826 as report,
  MEMBER_SEPTEMBER_ROTATION_REPORT_HISTORY as reportHistory,
} from "../lib/data/member-september-rotation-report-20260826";
import { QIMEN_CYCLE_PATTERN_SOURCE_20260901 as cyclePattern } from "../lib/data/qimen-cycle-pattern-source-20260901";
import { SOURCE_AUDIT_20260902 as sourceAudit } from "../lib/data/internal/source-audit-20260902";
import { SOURCE_AUDIT_20260902_WU_QIMEN as wuQimenAudit } from "../lib/data/internal/source-audit-20260902-wu-qimen";
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

test("new Qimen cross-check publishes V6 without rewriting V2 through V5", () => {
  assert.equal(report.version, "SEP_ROTATION_REPORT_20260904_V6");
  assert.equal(report.revisionOf, "SEP_ROTATION_REPORT_20260902_V5");
  assert.equal(reportHistory[0]?.version, "SEP_ROTATION_REPORT_20260826_V2");
  assert.equal(reportHistory[1]?.version, "SEP_ROTATION_REPORT_20260902_V3");
  assert.equal(reportHistory[2]?.version, "SEP_ROTATION_REPORT_20260902_V4");
  assert.equal(reportHistory[3]?.version, "SEP_ROTATION_REPORT_20260902_V5");
  assert.equal(reportHistory[3]?.confidenceCalibration.items[0]?.delta, 1);
  assert.equal(report.confidenceCalibration.sourceState, "FULL_TRANSCRIPT_AND_VISIBLE_CHART");
  assert.deepEqual(
    report.confidenceCalibration.items.map((item) => [item.id, item.index, item.max, item.delta]),
    [
      ["BTC-SEPTEMBER-PATH", 4, 5, 0],
      ["TECH-SEPTEMBER-ROTATION", 4, 5, 0],
      ["GOLD-SEPTEMBER-PATH", 4, 5, 0],
      ["WTI-SPECIAL-PATH", 4, 5, 0],
    ],
  );
  assert.match(report.confidenceCalibration.metricZh, /不是胜率/);
  assert.match(report.confidenceCalibration.unchangedZh, /不修改已锁定预测/);
  assert.match(report.confidenceCalibration.unchangedZh, /不产生自动交易权限/);
});

test("Sep 8-Oct 8 Qimen evidence adds a Sep 27 risk window and honest conflict weighting", () => {
  assert.deepEqual(report.qimenMonthlyUpdate.riskWindow, {
    start: "2026-09-21",
    end: "2026-09-29",
    focusDate: "2026-09-27",
    actionZh: "保护利润 / 不追高",
    actionEn: "Protect gains / avoid chasing",
    noteZh: "上中旬若受政策或议息消息推动冲高，21日后转入防守；27日前后只视为风险中心候选，不是机械做空日。",
    noteEn: "If policy or rate headlines lift markets in early/mid September, turn defensive after Sep 21. Sep 27 is a candidate risk center, not an automatic short date.",
  });
  const items = Object.fromEntries(report.qimenMonthlyUpdate.items.map((item) => [item.id, item]));
  assert.equal(items["GLOBAL-RISK-20260927"]?.relationship, "ALIGNED");
  assert.equal(items["BTC-20260908-1008-QIMEN"]?.relationship, "PARTIAL");
  assert.match(items["BTC-20260908-1008-QIMEN"]?.conclusionZh ?? "", /多空双杀.*10月至11月/);
  assert.equal(items["TECH-20260908-1008-QIMEN"]?.relationship, "CONFLICTED");
  assert.match(items["TECH-20260908-1008-QIMEN"]?.usageZh ?? "", /5\/5下调到4\/5/);
  assert.equal(items["GOLD-20260908-1008-QIMEN"]?.relationship, "ALIGNED");
  assert.match(items["GOLD-20260908-1008-QIMEN"]?.conclusionZh ?? "", /4000—4100.*4100—4300/);
  assert.match(items["WTI-20260908-1008-QIMEN"]?.usageZh ?? "", /不恢复原油日预测、周预测、历史验证或自动交易/);
  assert.match(report.confidenceCalibration.unchangedZh, /奇门只调整时机与研究信心/);
  assert.match(report.confidenceCalibration.unchangedZh, /不产生自动交易权限/);
});

test("new Qimen transcript and frames are hash locked and remain non-executable", () => {
  assert.equal(wuQimenAudit.files.length, 3);
  assert.ok(wuQimenAudit.files.every(([, hash]) => /^[A-F0-9]{64}$/.test(hash)));
  assert.equal(wuQimenAudit.policy.authority, "MONTHLY_QIMEN_TIMING_AUXILIARY");
  assert.equal(wuQimenAudit.policy.mayReverseLockedDirection, false);
  assert.equal(wuQimenAudit.policy.mayCreateFormalLevels, false);
  assert.equal(wuQimenAudit.policy.mayTriggerTrade, false);
  assert.equal(wuQimenAudit.policy.retiredCoverageRemainsRetired, true);
});

test("Sep 2 source batch keeps Liu Yao primary, Qimen bounded and Bazi method-only", () => {
  const items = Object.fromEntries(report.primaryUpdate.items.map((item) => [item.id, item]));
  assert.equal(items["STAR50-202609"]?.authority, "PRIMARY");
  assert.match(items["STAR50-202609"]?.conclusionZh ?? "", /9月7日前偏低.*9月7日后缓慢走高/);
  assert.match(items["STAR50-202609"]?.conclusionZh ?? "", /涨幅和后劲可能有限/);
  assert.match(items["FED-202609"]?.conclusionZh ?? "", /9月加息概率不高/);
  assert.match(items["WTI-202609-THREE-MONTH"]?.boundaryZh ?? "", /不恢复原油日预测、周预测或历史验证/);
  assert.match(items["BTC-2027-150K"]?.conclusionZh ?? "", /不支持突破15万美元/);
  assert.match(items["BTC-2027-150K"]?.boundaryZh ?? "", /不提高或降低2026年9月/);
  assert.equal(items["SPCX-20260915-QIMEN"]?.authority, "AUXILIARY");
  assert.match(items["SPCX-20260915-QIMEN"]?.boundaryZh ?? "", /不确定与重问/);
  assert.match(items["SPCX-20260915-QIMEN"]?.boundaryZh ?? "", /不生成正式点位或交易权限/);
  assert.ok(report.primaryUpdate.methodLearningZh.some((item) => /一卦多问或连续重问要主动降权/.test(item)));
  assert.ok(report.primaryUpdate.methodLearningZh.some((item) => /不能冒充三个独立票源/.test(item)));
  assert.equal(sourceAudit.policy.primaryFramework, "COMPLETE_LIUYAO");
  assert.equal(sourceAudit.policy.auxiliaryFramework, "BOUNDED_QIMEN");
  assert.equal(sourceAudit.policy.baziUse, "METHOD_LEARNING_ONLY");
  assert.equal(sourceAudit.policy.mayTriggerTrade, false);
  assert.equal(sourceAudit.files.length, 16);
  assert.ok(sourceAudit.files.every(([, hash]) => /^[A-F0-9]{64}$/.test(hash)));
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
  assert.doesNotMatch(memberFacing, /丙午|吴昌烨|吴老师|狼叔|金兔子/);
  assert.doesNotMatch(memberFacing, /AI生成|人工智能生成/);
});

test("monthly page puts the concise conclusion and trading plan before supporting research", () => {
  const reportSource = fs.readFileSync(path.join(process.cwd(), "components/member/MemberSeptemberRotationReport.tsx"), "utf8");
  const pageSource = fs.readFileSync(path.join(process.cwd(), "components/member/MemberMonthlyPage.tsx"), "utf8");

  assert.ok(reportSource.indexOf("data-monthly-action-summary") < reportSource.indexOf("report.assets.map"));
  assert.match(reportSource, /<details[\s\S]*展开确认与失效条件/);
  assert.match(reportSource, /data-qimen-monthly-update-20260902/);
  const keyDateSource = fs.readFileSync(path.join(process.cwd(), "app/member/key-dates/page.tsx"), "utf8");
  assert.match(keyDateSource, /data-global-risk-window-20260927/);
  assert.match(keyDateSource, /9月27日前后 · 全市场风险中心候选/);
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
  assert.equal(cyclePattern.analysisLoop.length, 10);
  assert.match(cyclePattern.analysisLoop[0]?.detailZh ?? "", /高周期只定环境/);
  assert.match(cyclePattern.analysisLoop[6]?.detailZh ?? "", /产品专属用神或问题盘/);
  assert.match(cyclePattern.analysisLoop[7]?.detailZh ?? "", /不生成价格点位/);
  assert.match(cyclePattern.analysisLoop[9]?.detailZh ?? "", /完整闭合K线/);
  assert.ok(cyclePattern.misuseGuardsZh.some((item) => /不能反转锁定方向/.test(item)));
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
  assert.equal(cyclePattern.materials.length, 66);
  assert.ok(cyclePattern.materials.every((item) => /^[A-F0-9]{64}$/.test(item.sha256)));
  assert.equal(cyclePattern.materials.filter((item) => item.period === "SEPTEMBER_2026").length, 6);
  assert.equal(cyclePattern.materials.filter((item) => item.period === "TEACHING_WORKFLOW").length, 7);
  assert.equal(cyclePattern.materials.filter((item) => item.kind === "TRANSCRIPT" && /6月/.test(item.fileName)).length, 2, "duplicate supplied June transcript paths remain auditable");
  assert.ok(Date.parse(cyclePattern.forwardScoreFrom) > Date.parse(cyclePattern.receivedAt));

  const component = fs.readFileSync(path.join(process.cwd(), "components/member/MemberSeptemberRotationReport.tsx"), "utf8");
  const publicCopy = `${cyclePattern.publicLabelZh}${cyclePattern.september2026.sourceConclusionZh}${component}`;
  assert.match(component, /data-cycle-pattern-crosscheck/);
  assert.match(component, /data-cycle-pattern-method-loop/);
  assert.doesNotMatch(publicCopy, /王老师|王子瑜|吴老师|金兔子/);
  assert.doesNotMatch(publicCopy, /可自动下单|提高交易权限/);
});

test("historical monthly lessons remain an unscored method casebook", () => {
  assert.equal(cyclePattern.historicalCasebook.length, 7);
  assert.deepEqual(cyclePattern.historyPolicy.retrospectivePeriods, [
    "2025-12",
    "2026-01",
    "2026-03",
    "2026-04",
    "2026-05",
    "2026-06",
    "2026-07",
  ]);
  assert.ok(cyclePattern.historicalCasebook.every((item) => item.scoreStatus === "UNSCORED_RETROSPECTIVE"));
  assert.match(cyclePattern.historyPolicy.reasonZh, /不补计历史命中率/);
  assert.doesNotMatch(JSON.stringify(cyclePattern.historicalCasebook), /命中率|成功率|自动下单/);
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

