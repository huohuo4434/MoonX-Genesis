import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { XU_REVIEW_DAYS, XU_REVIEW_POLICY, XU_REVIEW_VERSION, xuReviewContext } from "../lib/research/us-equity-xu-review-20260925.server";
const read = (path: string) => readFileSync(path, "utf8");

test("dated research cannot authorize execution or replace locked forecasts", () => {
  assert.equal(XU_REVIEW_VERSION, "us-equity-xu-20260925-v1");
  assert.deepEqual(XU_REVIEW_POLICY, { mode: "RESEARCH_ONLY", modifiesLockedForecasts: false, executionAuthority: false });
});
test("22 US equity dates, including Columbus Day but never weekends", () => {
  const dates = XU_REVIEW_DAYS.map(row => row.date);
  assert.equal(dates.length, 22);
  assert.equal(new Set(dates).size, 22);
  assert.equal(dates[0], "2026-10-08");
  assert.equal(dates.at(-1), "2026-11-06");
  assert(dates.includes("2026-10-12"));
  for (const date of dates) assert(![0, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay()));
  assert.deepEqual(dates, [...dates].sort());
});
test("future coverage, NYC date boundary, DST and expiry fail closed", () => {
  assert.equal(xuReviewContext(Date.parse("2026-09-25T01:00Z")).phase, "upcoming");
  assert.equal(xuReviewContext(Date.parse("2026-10-08T03:59Z")).today, null);
  assert.equal(xuReviewContext(Date.parse("2026-10-08T04:00Z")).today?.date, "2026-10-08");
  assert.equal(xuReviewContext(Date.parse("2026-11-02T04:30Z")).date, "2026-11-01");
  assert.equal(xuReviewContext(Date.parse("2026-11-02T05:00Z")).today?.date, "2026-11-02");
  assert.equal(xuReviewContext(Date.parse("2026-11-07T04:59Z")).phase, "active");
  assert.equal(xuReviewContext(Date.parse("2026-11-07T05:00Z")).phase, "archive");
});
test("divergence and rebounds survive the bearish user baseline", () => {
  const divergent = XU_REVIEW_DAYS.find(row => row.date === "2026-10-14")!;
  assert.notEqual(divergent.spy.zh, divergent.qqq.zh);
  assert.match(divergent.caution!.zh, /分化/);
  assert.match(XU_REVIEW_DAYS.find(row => row.date === "2026-10-28")!.spy.zh, /反弹/);
  const view = read("components/member/UsEquityXuReview.tsx");
  for (const phrase of ["震荡下跌", "震荡偏涨", "收益率回落", "非独立日卦", "不接入自动交易", "转录部分高低点冲突", "QQQ仅收到周级对照"]) assert(view.includes(phrase), phrase);
  assert(!/(?:胜率|概率|命中率)\s*[:：]?\s*\d/.test(view));
});
test("server-only content has no client/API/trading dependency", () => {
  for (const path of ["components/member/UsEquityXuReview.tsx", "lib/research/us-equity-xu-review-20260925.server.ts"]) {
    const source = read(path);
    assert(source.startsWith('import "server-only"'));
    assert(!/use client|lib\/bitget|lib\/trading-signals|prisma|fetch\(/.test(source));
  }
});
test("member gate precedes every render; both research branches are covered", () => {
  for (const route of ["daily", "key-dates", "monthly"]) {
    const source = read(`app/member/${route}/page.tsx`);
    const gateEnd = source.indexOf('if (gate.status === "DEVICE_REQUIRED")');
    const renders = [...source.matchAll(/<UsEquityXuReview /g)];
    assert.equal(renders.length, route === "monthly" ? 1 : 2);
    for (const render of renders) assert(render.index! > gateEnd && gateEnd > 0);
    assert(source.includes('gate.status === "LOGIN_REQUIRED"'));
    assert(source.includes('gate.status === "MEMBERSHIP_REQUIRED"'));
  }
  assert.match(read("app/member/page.tsx"), /active \? <UsEquityXuReview/);
});
