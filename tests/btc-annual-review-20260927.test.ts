import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { BTC_ANNUAL_MONTHS, BTC_ANNUAL_REVIEW_POLICY, BTC_ANNUAL_REVIEW_VERSION, btcAnnualReviewArchived } from "../lib/research/btc-annual-review-20260927.server";
const read = (p: string) => readFileSync(p, "utf8");
test("annual context never gains forecast or order authority", () => {
  assert.equal(BTC_ANNUAL_REVIEW_VERSION, "btc-annual-20260927-v1");
  assert.deepEqual(BTC_ANNUAL_REVIEW_POLICY, { mode: "RESEARCH_ONLY", modifiesLockedForecasts: false, executionAuthority: false, sourceAsset: "BTC", probability: null, hitRate: null, consensusStars: null });
});
test("two unranked source windows and three non-source monthly paths", () => {
  assert.deepEqual(BTC_ANNUAL_MONTHS.filter(r => r.origin === "TEACHER_WINDOW").map(r => r.month), ["2026-09", "2027-01"]);
  assert.equal(BTC_ANNUAL_MONTHS.length, 5);
  assert.match(BTC_ANNUAL_MONTHS[4].zh, /谁更高尚未确定/);
  assert.match(BTC_ANNUAL_MONTHS[0].watchZh, /不把9月已经发生/);
});
test("expiry archives context without extending forecasts", () => {
  assert.equal(btcAnnualReviewArchived(Date.parse("2026-09-27T00:00Z")), false);
  assert.equal(btcAnnualReviewArchived(Date.parse("2027-03-01T00:00:00+08:00")), true);
});
test("rendering is server-only and cannot fetch or write trading data", () => {
  const view = read("components/research/BtcAnnualReview20260927.tsx");
  assert(view.startsWith('import "server-only"'));
  assert(!/use client|lib\/bitget|lib\/trading-signals|prisma|fetch\(/.test(view));
  for (const text of ["原卦只针对BTC", "精确节气边界", "低点预测不准", "不向自动交易发送信号", "本次未做完整行情回测"]) assert(view.includes(text), text);
});
test("all new content stays behind existing membership and device gates", () => {
  for (const route of ["monthly", "annual-outlook"]) {
    const s = read(`app/member/${route}/page.tsx`);
    assert(s.indexOf("<BtcAnnualReview20260927 ") > s.indexOf('if (gate.status === "DEVICE_REQUIRED")'));
    assert(s.includes('gate.status === "MEMBERSHIP_REQUIRED"'));
  }
  assert.match(read("app/member/page.tsx"), /active \? <BtcAnnualReview20260927/);
  assert(read("app/member/annual-outlook/page.tsx").includes("<BtcAnnualWindowAmendment"));
});
