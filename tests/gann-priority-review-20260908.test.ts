import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GannPriorityReview } from "../components/member/GannPriorityReview";
import { gannReviewAssets, gannReviewRecords, gannReviewState, GANN_REVIEW_RECORDED_AT, GANN_REVIEW_EXPIRES_AT } from "../lib/research/gann-review-20260908";
import { sourceReviewPriority, researchReviewQueue } from "../lib/research/source-review-priority";
import { listResearchRecords } from "../lib/data/research-records";
import { isResearchRecordEligibleForDirectionVote } from "../lib/research/weighted-research-vote";
import { isPublicResearchRecord } from "../lib/research/visibility";

test("13 separate assets are consumed by the real record store, not a sidecar", async () => {
  const records = await listResearchRecords();
  assert.equal(gannReviewAssets.length, 13);
  for (const row of gannReviewRecords) {
    assert.ok(records.some(record => record.id === row.id));
    assert.equal(sourceReviewPriority(row), 2);
    assert.equal(isResearchRecordEligibleForDirectionVote(row), false);
    assert.equal(isPublicResearchRecord(row), false);
    assert.equal(row.supports, undefined);
    assert.equal(row.targets, undefined);
    assert.ok(Date.parse(row.ingestedAt!) > Date.parse(row.sourcePublishedAt!));
  }
  assert.ok(!gannReviewAssets.some(a => ["SPX", "TSLA", "HYPE", "ASTEROID"].includes(a.symbol)));
});

test("review order prioritizes core teacher then BTCTW0 without changing records or unknown-source order", () => {
  const base = gannReviewRecords[0];
  const teacher = { ...base, id: "teacher", sourceProfileId: "core-liuyao-cycle", internalSourceRef: "" };
  const other = { ...base, id: "other", sourceProfileId: "other", internalSourceRef: "" };
  const wolf = { ...other, id: "wolf" };
  const input = [other, base, wolf, teacher];
  assert.deepEqual(researchReviewQueue(input, new Date(GANN_REVIEW_RECORDED_AT)).map(r => r.id), [teacher.id, base.id, other.id, wolf.id]);
  assert.equal(input[0], other);
  assert.equal(researchReviewQueue(input, new Date(0)).length, 0);
  assert.equal(researchReviewQueue(input, new Date(GANN_REVIEW_EXPIRES_AT)).length, 0);
  assert.equal(researchReviewQueue(input, new Date(NaN)).length, 0);
});

test("forward-only display expires into explicit archive", () => {
  const start = Date.parse(GANN_REVIEW_RECORDED_AT);
  const end = Date.parse(GANN_REVIEW_EXPIRES_AT);
  assert.equal(gannReviewState(start - 1), "upcoming");
  assert.equal(gannReviewState(start), "active");
  assert.equal(gannReviewState(end - 1), "active");
  assert.equal(gannReviewState(end), "archive");
  assert.equal(gannReviewState(NaN), "archive");
  const render = (en: boolean, nowMs = start, compact = false) => renderToStaticMarkup(React.createElement(GannPriorityReview, { en, nowMs, compact }));
  assert.equal(render(false, start - 1), "");
  assert.match(render(false, end), /^<details.*历史参考/);
  assert.match(render(true), /Current leg vs. larger cycle/);
  assert.doesNotMatch(render(true), /[\u4e00-\u9fff]/);
  assert.doesNotMatch(render(false), /BTCTW0|丙午|彼得兔|sourceProfile/);
  assert.match(render(true, start, true), /href="\/en\/member\/gann#time-price-review"/);
  assert.equal((render(false, start, true).match(/<article/g) ?? []).length, 6);
  assert.equal((render(false).match(/<article/g) ?? []).length, 13);
});

test("conditions and conflicting horizons survive the concise presentation", () => {
  const sndk = gannReviewAssets.find(a => a.symbol === "SNDK")!;
  assert.match(sndk.longer.zhCN, /不是无条件持有期/);
  assert.match(gannReviewAssets.find(a => a.symbol === "ETH")!.longer.en, /not an outright long-term bearish/);
  assert.match(gannReviewAssets.find(a => a.symbol === "SPCX")!.response.zhCN, /暂不作为下单价/);
});

test("auth gates precede private rendering; inbox is read-only and reports errors distinctly", () => {
  for (const path of ["app/member/gann/page.tsx", "app/member/sector-resonance/page.tsx"]) {
    const page = readFileSync(path, "utf8");
    assert.ok(page.indexOf('if (gate.status === "DEVICE_REQUIRED")') < page.indexOf("<GannPriorityReview"));
    assert.ok(page.indexOf('MEMBERSHIP_REQUIRED') < page.indexOf("<GannPriorityReview"));
  }
  const inbox = readFileSync("lib/research/priority-source-inbox.server.ts", "utf8");
  assert.ok(inbox.indexOf('await requireAdminOrRedirect') < inbox.indexOf('prisma.$queryRaw'));
  assert.match(inbox, /available: false/);
  assert.match(inbox, /LIMIT 20/);
  assert.doesNotMatch(inbox, /INSERT|UPDATE|DELETE|executeRaw|lib\/bitget/);
  const admin = readFileSync("app/admin/intelligence/page.tsx", "utf8");
  assert.match(admin, /researchReviewQueue\(records\)/);
  assert.match(admin, /getPrioritySourceInbox\(\)/);
});
