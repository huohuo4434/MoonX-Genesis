import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { MEMBER_SEPTEMBER_ROTATION_REPORT_20260826 as report, MEMBER_SEPTEMBER_ROTATION_REPORT_HISTORY as history } from "../lib/data/member-september-rotation-report-20260826";
import { MEMBER_SOURCE_CROSS_CHECK_20260904 as review } from "../lib/data/member-source-cross-check-20260901";
import { SOURCE_AUDIT_20260904_WU_QIMEN as audit } from "../lib/data/internal/source-audit-20260904-wu-qimen";

test("sources are traceable and weekly re-delivery adds no vote", () => {
  assert.equal(audit.files.length, 4);
  assert.ok(audit.files.every(([, hash]) => /^[A-F0-9]{64}$/.test(hash)));
  assert.equal(audit.weeklySourceId, "-9mrXSWF89Y");
  assert.equal(audit.weeklyAlreadyReviewedAt, "2026-09-03");
  assert.deepEqual(audit.weeklyWindow, { start: "2026-09-07", end: "2026-09-12" });
  assert.equal(audit.sourcePublishedAt, null);
  assert.equal(audit.policy.independentVoteIncrement, 0);
  assert.equal(audit.policy.consensusDeltaFromV5, 0);
  assert.equal(audit.policy.retrospectiveScoreEligible, false);
});

test("new report retains V5 history, direction and primary records", () => {
  const prior = history[3];
  assert.equal(report.revisionOf, prior.version);
  assert.ok(Date.parse(report.publishedAt) > Date.parse(prior.publishedAt));
  assert.deepEqual(report.primaryUpdate, prior.primaryUpdate);
  assert.deepEqual(report.assets.map((a) => [a.symbol, a.directionZh, a.directionEn]), prior.assets.map((a) => [a.symbol, a.directionZh, a.directionEn]));
  assert.equal(history.length, 4);
  assert.match(prior.assets[0].conclusionZh, /9月中下旬至10月初/);
  assert.doesNotMatch(prior.assets[0].conclusionZh, /21日前/);
  assert.match(report.assets[0].conclusionZh, /持续性有分歧.*21日前/);
});

test("priority timing is not a probability or an automatic trade", () => {
  assert.equal(audit.policy.priority, "HIGH_TIMING_REFERENCE");
  assert.equal(audit.policy.mayReverseLockedDirection, false);
  assert.equal(audit.policy.mayCreateFormalLevels, false);
  assert.equal(audit.policy.mayTriggerTrade, false);
  assert.ok(report.confidenceCalibration.items.every((x) => x.index === 4 && x.delta === 0));
  assert.match(report.confidenceCalibration.items[0].reasonZh, /不能推算为80%胜率/);
  assert.match(report.confidenceCalibration.items[0].reasonEn, /does not imply an 80% win rate/);
});

test("BTC day ambiguity and gold weak rebound are retained", () => {
  assert.match(review.rows[1].action, /未日、申日尚未指定哪一周/);
  assert.match(report.executionZh[1], /不能把未日、申日硬套成下周必跌/);
  assert.match(report.assets.find((a) => a.symbol === "GOLD")!.conclusionZh, /一至两周盘整或弱反弹.*有分歧/);
  assert.match(report.qimenMonthlyUpdate.summaryZh, /本次讲座未独立确认该日/);
  assert.match(report.qimenMonthlyUpdate.summaryEn, /not independently confirmed/);
  assert.ok(audit.exclusions.some((s) => s.includes("523000") && s.includes("intuition")));
});

test("stock-specific boundaries and retired coverage survive", () => {
  assert.equal(audit.policy.retiredCoverageRemainsRetired, true);
  assert.match(review.rows[0].official, /不以板块替代个股/);
  assert.match(review.rows[5].action, /不恢复日内、每日、每周预测或自动交易/);
  assert.match(review.rows[7].official, /已退出.*只摘记来源观点/);
  assert.ok(report.qimenMonthlyUpdate.items.some((i) => i.id === "AGRICULTURE-20260904" && /待独立复核/.test(i.relationshipZh)));
});

test("current member view is gated and wired to latest review without private evidence", () => {
  const page = readFileSync("app/member/sector-resonance/page.tsx", "utf8");
  const component = readFileSync("components/member/MemberSeptemberRotationReport.tsx", "utf8");
  assert.match(page, /memberSectorOutlook as crossCheck/);
  assert.ok(page.indexOf('gate.status === "MEMBERSHIP_REQUIRED"') < page.indexOf("{crossCheck.title}"));
  assert.match(page, /易老师判断/);
  assert.match(component, /本轮维持/);
  assert.match(component, /Updated Sep 4 · V6/);
  assert.doesNotMatch(`${page}${component}`, /source-audit-20260904-wu-qimen|submitOrder|createOrder/);
  assert.doesNotMatch(JSON.stringify({ report, review }), /吴老师|吳昌燁|丙午|金兔子|C:\\Users|714DF9A4/);
});
