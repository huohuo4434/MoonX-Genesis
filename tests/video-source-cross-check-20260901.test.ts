import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { EXTERNAL_ANALYST_VIEWPOINTS_20260901 } from "../lib/data/external-analyst-viewpoints-20260901";
import {
  MEMBER_SOURCE_CROSS_CHECK_20260901,
  MEMBER_SOURCE_CROSS_CHECK_AUDIT_20260902,
  MEMBER_SOURCE_CROSS_CHECK_AUDIT_20260903,
} from "../lib/data/member-source-cross-check-20260901";
import { TEACHER02_LIUYAO_20260901 } from "../lib/data/teacher02-liuyao-20260901";
import { assessExternalViewpointCard, findDuplicateExternalViewpoints } from "../lib/research/external-viewpoint-card-core";

test("September 1 videos stay research only and preserve traceable conditions", () => {
  assert.equal(EXTERNAL_ANALYST_VIEWPOINTS_20260901.length, 9);
  assert.equal(findDuplicateExternalViewpoints(EXTERNAL_ANALYST_VIEWPOINTS_20260901).length, 0);
  const assessed = EXTERNAL_ANALYST_VIEWPOINTS_20260901.map(assessExternalViewpointCard);
  assert.ok(assessed.every((item) => item.accepted));
  assert.ok(assessed.every((item) => !item.forwardScoreEligible && item.tradingEligible === false));
  assert.ok(EXTERNAL_ANALYST_VIEWPOINTS_20260901.every((item) => item.status === "NOTE_ONLY" && item.consensusEligible === false));
  const eth = EXTERNAL_ANALYST_VIEWPOINTS_20260901.find((item) => item.id === "qiaoqiao-eth-pullback-levels-20260901");
  assert.deepEqual(eth?.supports, [2350, 2300, 2150, 2000]);
  assert.deepEqual(eth?.resistances, [2500]);
  const spx = EXTERNAL_ANALYST_VIEWPOINTS_20260901.find((item) => item.id === "rino-spx-cta-levels-20260901");
  assert.deepEqual(spx?.supports, [7620, 7356, 6884]);
});

test("mid-window Liuyao revision only covers the remaining dates and cannot rewrite history", () => {
  assert.equal(TEACHER02_LIUYAO_20260901.length, 2);
  for (const record of TEACHER02_LIUYAO_20260901) {
    assert.equal(record.forecastStart, "2026-09-02");
    assert.equal(record.forecastEnd, "2026-09-04");
    assert.equal(record.consensusEligible, false);
    assert.equal(record.verificationEligibility, "provisional");
    assert.ok(record.tags.includes("no-retroactive-edit"));
    assert.ok(record.tags.includes("no-auto-trade"));
  }
  assert.match(TEACHER02_LIUYAO_20260901.find((item) => item.assetId === "gold")?.summary.zhCN ?? "", /不回填8月31日与9月1日/);
  assert.match(TEACHER02_LIUYAO_20260901.find((item) => item.assetId === "silver")?.summary.zhCN ?? "", /基本一致/);
});

test("member cross-check is anonymous, conclusion-first, and never imports trading code", () => {
  assert.deepEqual(MEMBER_SOURCE_CROSS_CHECK_20260901.rows.map((row) => row.asset), ["黄金", "白银", "纳指", "半导体", "特斯拉", "亚马逊", "比特币", "以太坊", "标普500", "谷歌", "闪迪", "原油"]);
  assert.equal(MEMBER_SOURCE_CROSS_CHECK_20260901.rows.find((row) => row.asset === "黄金")?.relation, "部分一致");
  assert.equal(MEMBER_SOURCE_CROSS_CHECK_20260901.rows.find((row) => row.asset === "白银")?.relation, "一致");
  const memberData = readFileSync(resolve(process.cwd(), "lib/data/member-source-cross-check-20260901.ts"), "utf8");
  const memberPage = readFileSync(resolve(process.cwd(), "app/member/sector-resonance/page.tsx"), "utf8");
  assert.doesNotMatch(memberData, /狼叔|乔乔|视野环球|RINO|NaNa|NANA|博主/);
  assert.doesNotMatch(`${memberData}\n${memberPage}`, /lib\/trading-signals|lib\/bitget|submitOrder|createOrder/);
  assert.match(memberPage, /memberSectorOutlook as crossCheck/);
  assert.match(memberPage, /row\.levels/);
  assert.equal(MEMBER_SOURCE_CROSS_CHECK_20260901.rows.find((row) => row.asset === "闪迪")?.relation, "需要修正节奏");
  assert.deepEqual(MEMBER_SOURCE_CROSS_CHECK_20260901.rows.find((row) => row.asset === "闪迪")?.levels, ["第一承接 1,413—1,435", "第二观察 1,268", "第三观察 1,084", "转强观察 9月7日以后"]);
  assert.equal(MEMBER_SOURCE_CROSS_CHECK_20260901.rows.find((row) => row.asset === "半导体")?.relation, "一致");
  assert.match(MEMBER_SOURCE_CROSS_CHECK_20260901.rows.find((row) => row.asset === "半导体")?.review ?? "", /9月7—12日.*高波动上扬/u);
  assert.match(MEMBER_SOURCE_CROSS_CHECK_20260901.rows.find((row) => row.asset === "半导体")?.action ?? "", /9月14—20日.*9月21日前/u);
  assert.match(MEMBER_SOURCE_CROSS_CHECK_20260901.rows.find((row) => row.asset === "原油")?.official ?? "", /取消日内、每日和每周/);
});

test("September 3 Qimen chart only calibrates timing and cannot trigger trades", () => {
  assert.equal(MEMBER_SOURCE_CROSS_CHECK_AUDIT_20260903.sourcePublishedAt, null);
  assert.equal(MEMBER_SOURCE_CROSS_CHECK_AUDIT_20260903.sourceRecordedAt, "2026-09-03T11:00:00+08:00");
  assert.equal(MEMBER_SOURCE_CROSS_CHECK_AUDIT_20260903.sourceTimeVerified, true);
  assert.equal(MEMBER_SOURCE_CROSS_CHECK_AUDIT_20260903.applicableFrom, "2026-09-07");
  assert.equal(MEMBER_SOURCE_CROSS_CHECK_AUDIT_20260903.status, "TIMING_REVIEW");
  assert.equal(MEMBER_SOURCE_CROSS_CHECK_AUDIT_20260903.consensusEligible, false);
  assert.equal(MEMBER_SOURCE_CROSS_CHECK_AUDIT_20260903.tradingEligible, false);
  assert.match(MEMBER_SOURCE_CROSS_CHECK_AUDIT_20260903.boundary, /不能改写已锁定六爻方向.*不直接产生交易权限/u);
});

test("September 2 source is auditable but adds no formal vote or trading authority", () => {
  assert.equal(MEMBER_SOURCE_CROSS_CHECK_AUDIT_20260902.sourcePublishedAt, null);
  assert.equal(MEMBER_SOURCE_CROSS_CHECK_AUDIT_20260902.sourceTimeVerified, false);
  assert.equal(MEMBER_SOURCE_CROSS_CHECK_AUDIT_20260902.applicableFrom, "2026-09-03");
  assert.equal(MEMBER_SOURCE_CROSS_CHECK_AUDIT_20260902.status, "NOTE_ONLY");
  assert.equal(MEMBER_SOURCE_CROSS_CHECK_AUDIT_20260902.consensusEligible, false);
  assert.equal(MEMBER_SOURCE_CROSS_CHECK_AUDIT_20260902.tradingEligible, false);
  assert.match(MEMBER_SOURCE_CROSS_CHECK_AUDIT_20260902.boundary, /没有提供可独立核验的新卦盘/);
});
