import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SeptemberThreeMarketReview } from "../components/member/SeptemberThreeMarketReview";
import { septemberThreeMarketReview as rows, septemberReviewState, SEPTEMBER_REVIEW_RECORDED_AT as start, SEPTEMBER_REVIEW_EXPIRES_AT as end } from "../lib/presentation/september-three-market-review";
import { bingwuReviewRecords } from "../lib/research/bingwu-review-20260908";
import { listResearchRecords } from "../lib/data/research-records";
import { sourceReviewPriority } from "../lib/research/source-review-priority";
import { isResearchRecordEligibleForDirectionVote } from "../lib/research/weighted-research-vote";
import { isPublicResearchRecord } from "../lib/research/visibility";
import { getMemberSectorOutlook, memberSeptemberOutlook, memberSeptemberEditorialHistory } from "../lib/presentation/member-september-outlook";
import { memberSeptemberOutlook as prior } from "../lib/presentation/member-september-outlook-20260906";

test("all three supplied assets are in the priority research store without trading or scoring authority", async () => {
  const store = await listResearchRecords();
  assert.deepEqual(bingwuReviewRecords.map(r => r.symbol), ["BTC", "NDX", "WTI"]);
  for (const r of bingwuReviewRecords) {
    assert.ok(store.some(v => v.id === r.id));
    assert.equal(sourceReviewPriority(r), 1);
    assert.equal(isResearchRecordEligibleForDirectionVote(r), false);
    assert.equal(isPublicResearchRecord(r), false);
    assert.equal(r.verificationEligibility, "provisional");
    assert.equal(r.sourcePublishedAtVerified, false);
    assert.equal(r.forecastStart, "2026-09-08");
    assert.equal(r.targets, undefined);
    assert.equal(r.resistances, undefined);
    assert.equal(r.editorialConfidence, 0);
  }
});

test("forward window hides before review and archives at expiry", () => {
  assert.equal(septemberReviewState(Date.parse(start) - 1), "upcoming");
  assert.equal(septemberReviewState(Date.parse(start)), "active");
  assert.equal(septemberReviewState(Date.parse(end)), "archive");
  assert.equal(septemberReviewState(NaN), "archive");
  const render = (en: boolean, nowMs = Date.parse(start)) => renderToStaticMarkup(React.createElement(SeptemberThreeMarketReview, { en, nowMs }));
  assert.equal(render(false, 0), "");
  assert.match(render(true), /USD 87,000/);
  assert.match(render(true), /USD 98/);
  assert.doesNotMatch(render(true), /[\u4e00-\u9fff]/);
  assert.doesNotMatch(render(false), /丙午|BTCTW0|sourceProfile|internalSource|独家原创/);
  assert.equal((render(false).match(/<article/g) ?? []).length, 3);
  assert.match(render(false, Date.parse(end)), /^<details.*历史参考/);
});

test("deadlines, instrument separation and conditional ceilings survive concise copy", () => {
  assert.match(rows[0].detailZh, /9月10日前的8.5万.*月底的8.7万/);
  assert.match(rows[0].responseZh, /不是必达目标/);
  assert.match(rows[1].responseZh, /不等于闪迪/);
  assert.match(rows[2].detailZh, /短暂触及.*不能算成绝不触及/);
  assert.match(rows[2].detailZh, /尚未核准具体合约/);
  assert.match(rows[2].responseZh, /不恢复日周预测或自动交易/);
});

test("E1, original directions and numerical scores are not rewritten", () => {
  assert.equal(memberSeptemberEditorialHistory[0], prior);
  assert.equal(prior.editorialVersion, "20260906-E1");
  assert.equal(memberSeptemberOutlook.editorialVersion, "20260908-E2");
  assert.deepEqual(memberSeptemberOutlook.assets, prior.assets);
  assert.deepEqual(memberSeptemberOutlook.confidenceItems, prior.confidenceItems);
  assert.match(getMemberSectorOutlook(false).rows[3].outlook, /逐步走低/);
  assert.doesNotMatch(JSON.stringify(getMemberSectorOutlook(true)), /[\u4e00-\u9fff]/);
  assert.equal(getMemberSectorOutlook(true).rows.length, getMemberSectorOutlook(false).rows.length);
});

test("member gates precede rendering and internal source metadata stays out of the view", () => {
  for (const path of ["app/member/monthly/page.tsx", "app/member/sector-resonance/page.tsx"]) {
    const source = readFileSync(path, "utf8");
    assert.ok(source.indexOf('gate.status === "DEVICE_REQUIRED"') < source.indexOf("<SeptemberThreeMarketReview"));
    assert.ok(source.indexOf("MEMBERSHIP_REQUIRED") < source.indexOf("<SeptemberThreeMarketReview"));
  }
  assert.doesNotMatch(readFileSync("components/member/SeptemberThreeMarketReview.tsx", "utf8"), /lib\/research|internalSourceRef|rawSource/);
  assert.match(readFileSync("components/member/MemberMonthlyPage.tsx", "utf8"), /data-original-monthly-record/);
});
