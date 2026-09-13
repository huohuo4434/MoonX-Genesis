import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { WU_LIQUIDITY_REVIEW_20260913 as review } from "../lib/research/wu-liquidity-review-20260913";

test("dated source addendum cannot set direction, confidence or execution", () => {
  assert.equal(review.classification, "RESEARCH_ONLY");
  assert.equal(review.directionOverride, false);
  assert.equal(review.confidenceChange, 0);
  assert.equal(review.executionImpact, "NONE");
  assert.equal(review.source.videoId, "ghriN1BWfxc");
  assert.equal(review.evidence.length, 5);
  assert.equal(review.supersedes, "wu-liquidity-20260913-v1");
  assert.match(review.evidence[2].finding, /整体倾向维持利率/);
  assert.match(review.evidence[2].finding, /原声尚未核听/);
  assert.match(review.en.detail, /aligning with September's no-hike thesis/);
  assert.match(review.zh.summary, /9月28日/);
  assert.match(review.en.summary, /early November/);
  assert.equal(review.zh.rows.length, review.en.rows.length);
  assert.match(review.zh.rows[2][1], /不自动跟随科技股看空/);
});

test("member entry points use one localized component, existing locked risk prior unchanged", () => {
  for (const file of ["components/member/MemberOperationDesk.tsx", "app/member/monthly/page.tsx", "app/member/weekly-report/page.tsx"]) {
    assert.match(readFileSync(file, "utf8"), /<TechnologyLiquidityRiskReview en=\{en\}/);
  }
  const prior = readFileSync("lib/research/october-2026-flash-crash-risk.ts", "utf8");
  assert.match(prior, /2026-08-20T06:43:00\+08:00/);
  assert.match(prior, /const WINDOW_END = "2026-10-31"/);
  assert.doesNotMatch(prior, /WU_LIQUIDITY/);
});
