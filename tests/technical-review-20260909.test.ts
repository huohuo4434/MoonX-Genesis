import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TechnicalReview20260909, TechnicalReview20260909Link } from "../components/member/TechnicalReview20260909";
import { technicalReview20260909 as review, technicalReviewState } from "../lib/presentation/technical-review-20260909";

test("dated research never grants direction, score or execution authority", () => {
  assert.equal(review.status, "RESEARCH_ONLY");
  assert.equal(review.officialDirectionMutation, false);
  assert.equal(review.tradingAuthority, false);
  assert.equal(review.confidenceDelta, 0);
  assert.equal(review.retrospectiveScoreEligible, false);
  for (const path of ["lib/presentation/technical-review-20260909.ts", "components/member/TechnicalReview20260909.tsx"]) {
    assert.doesNotMatch(readFileSync(path, "utf8"), /lib\/bitget|lib\/trading-signals|submitOrder|createOrder|process\.env|fetch\(/);
  }
});

test("references preserve venue, instrument, source quality and unknown values", () => {
  const btc = review.assets.find(a => a.symbol === "BTC")!;
  assert.match(btc.market, /Bitstamp/);
  assert.equal(btc.support, "78,928 → 74,201–74,937");
  assert.match(btc.caution.zh, /83,500.*未明确交易场所/);
  assert.equal(review.assets.find(a => a.symbol === "SNDK")!.basis, "text");
  assert.equal(review.assets.find(a => a.symbol === "SNDK")!.support, "—");
  assert.match(review.assets.find(a => a.symbol === "MU")!.caution.en, /different horizons/);
  assert.match(review.assets.find(a => a.symbol === "QQQ")!.caution.en, /not NDX/);
  assert.equal(review.assets.find(a => a.symbol === "ZEC")!.resistance, "—");
  assert.doesNotMatch(JSON.stringify(review), /855000|726000|742074937/);
});

test("calendar corrections link to primary sources", () => {
  assert.match(review.events[0].en, /Thursday, Sep 10/);
  assert.equal(new URL(review.events[0].url).hostname, "investor.oracle.com");
  assert.match(review.events[1].en, /Sep 15–16/);
  assert.equal(new URL(review.events[1].url).hostname, "www.federalreserve.gov");
});

test("dated rendering hides before capture and archives instead of deleting", () => {
  const at = Date.parse(review.recordedAt), end = Date.parse(review.reviewAfter);
  assert.equal(technicalReviewState(at - 1), "upcoming");
  assert.equal(technicalReviewState(at), "active");
  assert.equal(technicalReviewState(end - 1), "active");
  assert.equal(technicalReviewState(end), "archive");
  assert.equal(technicalReviewState(NaN), "archive");
  const render = (en: boolean, nowMs: number) => renderToStaticMarkup(React.createElement(TechnicalReview20260909, { en, nowMs }));
  assert.equal(render(false, at - 1), "");
  assert.match(render(false, at), /压力到了怎么办/);
  const en = render(true, at);
  assert.match(en, /Trading around resistance/);
  assert.match(en, /Text reference/);
  assert.doesNotMatch(en, /[\u4e00-\u9fff]/);
  assert.match(render(false, end), /^<details.*历史参考/);
  assert.match(renderToStaticMarkup(React.createElement(TechnicalReview20260909Link, { en: true, nowMs: at })), /href="\/en\/member\/key-dates#technical-review-20260909"/);
  assert.equal(renderToStaticMarkup(React.createElement(TechnicalReview20260909Link, { en: false, nowMs: end })), "");
});

test("all three entry points remain behind existing membership and device gates", () => {
  for (const path of ["app/member/key-dates/page.tsx", "app/member/daily/page.tsx", "app/member/sector-resonance/page.tsx"]) {
    const page = readFileSync(path, "utf8");
    const renderAt = page.indexOf("<TechnicalReview20260909");
    assert.ok(renderAt > 0);
    for (const gate of ['gate.status === "MEMBERSHIP_REQUIRED"', 'gate.status === "DEVICE_REQUIRED"']) {
      assert.ok(page.indexOf(gate) >= 0 && page.indexOf(gate) < renderAt, `${path}: ${gate}`);
    }
  }
});
