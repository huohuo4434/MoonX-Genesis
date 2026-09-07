import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CryptoTechnicalReview } from "../components/member/CryptoTechnicalReview";
import { cryptoReviewState, cryptoTechnicalReview20260907 as review } from "../lib/presentation/crypto-technical-review-20260907";

test("research cannot change directions, scores or trading authority", () => {
  assert.equal(review.status, "RESEARCH_ONLY");
  assert.equal(review.officialDirectionMutation, false);
  assert.equal(review.tradingAuthority, false);
  assert.equal(review.confidenceDelta, 0);
  assert.equal(review.retrospectiveScoreEligible, false);
  assert.deepEqual(review.assets.map(a => a.symbol), ["BTC", "ETH", "ZEC"]);
});
test("dated presentation does not leak into earlier or later periods", () => {
  assert.equal(cryptoReviewState(Date.parse(review.recordedAt) - 1), "upcoming");
  assert.equal(cryptoReviewState(Date.parse(review.recordedAt)), "active");
  assert.equal(cryptoReviewState(Date.parse(review.reviewAfter) - 1), "active");
  assert.equal(cryptoReviewState(Date.parse(review.reviewAfter)), "archive");
  assert.equal(cryptoReviewState(NaN), "archive");
});
test("levels are source references; ETH horizon and ZEC unknowns remain visible", () => {
  assert.match(review.note.zh, /非实时行情或委托价/);
  assert.match(review.assets[0].levels[0].zh, /81,500.*82,800.*83,000—85,000/);
  assert.match(review.assets[0].levels[1].zh, /76,150.*70,000—72,000.*67,000/);
  assert.match(review.assets[1].condition.zh, /不是本周必达/);
  assert.match(review.assets[1].disagreement.en, /not full agreement/);
  assert.equal(review.assets[2].levels.length, 0);
  assert.match(review.assets[2].disagreement.zh, /未独立核实/);
});
test("Chinese and English markup is usable, expiry archives instead of rewriting", () => {
  const props = { nowMs: Date.parse(review.recordedAt), en: false };
  const zh = renderToStaticMarkup(React.createElement(CryptoTechnicalReview, props));
  const en = renderToStaticMarkup(React.createElement(CryptoTechnicalReview, { ...props, en: true }));
  assert.match(zh, /加密技术观察/);
  assert.match(en, /Crypto technical watch/);
  assert.doesNotMatch(en, /分歧|回踩|研究补充/);
  assert.match(zh, /id="crypto-technical-watch"/);
  assert.match(renderToStaticMarkup(React.createElement(CryptoTechnicalReview, { ...props, nowMs: Date.parse(review.reviewAfter) })), /^<details.*历史参考/);
  assert.equal(renderToStaticMarkup(React.createElement(CryptoTechnicalReview, { ...props, nowMs: 0 })), "");
});
test("member gate stays before rendering and no execution hooks are introduced", () => {
  const page = readFileSync("app/member/key-dates/page.tsx", "utf8");
  assert.ok(page.indexOf('if (gate.status === "MEMBERSHIP_REQUIRED")') < page.indexOf("<CryptoTechnicalReview"));
  assert.ok(page.indexOf('if (gate.status === "DEVICE_REQUIRED")') < page.indexOf("<CryptoTechnicalReview"));
  for (const path of ["components/member/CryptoTechnicalReview.tsx", "lib/presentation/crypto-technical-review-20260907.ts"]) {
    assert.doesNotMatch(readFileSync(path, "utf8"), /submitOrder|createOrder|lib\/bitget|lib\/trading-signals|process\.env|fetch\(/);
  }
});
