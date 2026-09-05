import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { HorizonReadingNav } from "../components/member/HorizonReadingNav";
import { buildMemberKeyDateRadar } from "../lib/data/member-key-date-radar";
import { buildSectorResonanceBoard } from "../lib/data/conviction/sector-resonance-board";
import { buildDailySectorResonanceBoard } from "../lib/data/conviction/daily-sector-resonance";
import { isRetiredPredictionSymbol } from "../lib/prediction-scope";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

test("month/week/day links explain different holding horizons in both languages", () => {
  const zh = renderToStaticMarkup(React.createElement(HorizonReadingNav, { active: "WEEK" }));
  for (const text of ["一个月内", "一周内", "一天内", "年度高低位", "72小时", "30—90分钟", 'aria-current="page"']) assert.ok(zh.includes(text));
  const en = renderToStaticMarkup(React.createElement(HorizonReadingNav, { en: true }));
  assert.doesNotMatch(en, /[\u4e00-\u9fff]/);
  for (const path of ["monthly", "weekly", "daily"]) assert.ok(en.includes(`/en/member/${path}`));
});

test("retired markets stay out of current weekly and daily boards, not the archive", () => {
  const current = buildSectorResonanceBoard("2026-09-05");
  assert.ok(current.rows.length > 0);
  assert.equal(current.rows.some((row) => isRetiredPredictionSymbol(row.symbol)), false);
  const daily = buildDailySectorResonanceBoard(current);
  assert.equal(daily.rows.some((row) => isRetiredPredictionSymbol(row.symbol)), false);
  assert.ok(buildSectorResonanceBoard("2026-08-31").rows.some((row) => isRetiredPredictionSymbol(row.symbol)));
  const radar = buildMemberKeyDateRadar("2026-09-05");
  assert.equal(radar.some((row) => row.level === "WEEK" && isRetiredPredictionSymbol(row.symbol)), false);
  assert.ok(radar.some((row) => row.level === "MONTH" && isRetiredPredictionSymbol(row.symbol)), "long-cycle research remains available");
});

test("reading navigation is wired and old cycle labels removed from active entry points", () => {
  assert.match(readFileSync("app/member/page.tsx", "utf8"), /<MemberChannelContent/);
  for (const path of ["components/member/MemberChannelContent.tsx", "app/member/daily/page.tsx", "components/member/MemberWeeklyPage.tsx", "components/member/MemberMonthlyPage.tsx"]) {
    assert.match(readFileSync(path, "utf8"), /<HorizonReadingNav/);
  }
  for (const path of ["components/member/MemberWeeklyPage.tsx", "app/member/weekly-report/page.tsx"]) assert.doesNotMatch(readFileSync(path, "utf8"), /九大|Nine core/);
  for (const path of ["lib/presentation/strategy-center.ts", "lib/trading-signals/member-desk-persisted-plan-core.ts", "lib/trading-signals/three-horizon-strategy.ts", "components/live-trading/MemberLiveTradingClient.tsx"]) assert.doesNotMatch(readFileSync(path, "utf8"), /1[—～–-]7天|30分钟—8小时/);
});
