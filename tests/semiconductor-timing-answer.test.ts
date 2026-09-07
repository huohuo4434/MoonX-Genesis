import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { SemiconductorTimingAnswer } from "../components/member/SemiconductorTimingAnswer";

test("dated bilingual answer owns timing error without backdating success", () => {
  const zh = renderToStaticMarkup(React.createElement(SemiconductorTimingAnswer, { en: false }));
  const en = renderToStaticMarkup(React.createElement(SemiconductorTimingAnswer, { en: true }));
  assert.match(zh, /时间判断偏晚/);
  assert.match(zh, /不能算作日期精准命中/);
  assert.match(zh, /9月8日恢复交易/);
  assert.match(zh, /不等于提前见顶/);
  assert.match(en, /timing deviation, not a precise-date hit/);
  assert.match(en, /trading resumes Sep 8/);
  assert.doesNotMatch(en, /[\u4e00-\u9fff]/);
  assert.match(zh, /SEMI-TIMING-20260907-V1/);
});
test("member gates precede note on both pages; presentation has no execution hooks", () => {
  for (const file of ["app/member/key-dates/page.tsx", "app/member/sector-resonance/page.tsx"]) {
    const page = readFileSync(file, "utf8");
    for (const gate of ['gate.status === "LOGIN_REQUIRED"', 'gate.status === "MEMBERSHIP_REQUIRED"', 'gate.status === "DEVICE_REQUIRED"']) assert.ok(page.indexOf(gate) > -1 && page.indexOf(gate) < page.indexOf("<SemiconductorTimingAnswer"));
  }
  assert.doesNotMatch(readFileSync("components/member/SemiconductorTimingAnswer.tsx", "utf8"), /fetch\(|process\.env|lib\/bitget|lib\/trading-signals|submitOrder|createOrder/);
});
