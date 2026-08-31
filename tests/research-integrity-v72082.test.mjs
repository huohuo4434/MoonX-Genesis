// MOOX_V72082_RESEARCH_INTEGRITY_REGRESSION
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("daily direction classifier recognizes derived Liuyao vocabulary", () => {
  const s = read("lib/forecasts/daily-direction-family.ts");
  for (const token of ["震荡偏弱", "震荡偏强", "回落", "回撤", "回踩", "反抽", "探底回升", "先涨后跌"]) {
    assert.match(s, new RegExp(token));
  }
});

test("focus daily Liuyao derives from formal period source plus target-day Ganzhi", () => {
  const s = read("lib/data/conviction/focus-daily-policy-core.ts");
  assert.match(s, /focusAuthorityDerivedStep/);
  assert.match(s, /getDayGanzhi\(date\)/);
  assert.match(s, /relateGanzhiToWeeklyDirection\(day, authority\.direction\)/);
  assert.match(s, /authority\.dailyPath\?\.find/);
});

test("focus authority direction cannot be flipped by countertrend summary wording", () => {
  const s = read("lib/data/conviction/focus-daily-policy-core.ts");
  const explicit = s.indexOf("const explicit = classifyDailyDirection(forecast.direction)");
  const path = s.indexOf("const path = classifyDailyDirection(forecast.expectedPath)");
  assert.ok(explicit >= 0 && path > explicit);
});

test("realized action may revise only future focus rhythm", () => {
  const s = read("lib/data/conviction/focus-daily-policy-core.ts");
  assert.match(s, /input\.forecastDate <= input\.asOfDate/);
  assert.match(s, /今日涨幅提前兑现，未来节奏调整/);
  assert.match(s, /今日跌幅提前兑现，未来节奏调整/);
});

test("formal focus period is sufficient even when teacher did not publish daily rows", () => {
  const s = read("lib/data/conviction/focus-dossier-core.ts");
  assert.match(s, /Teacher-provided daily rows are[\s\S]*optional/);
  assert.match(s, /status: "READY"[\s\S]*missingDates: \[\]/);
  assert.doesNotMatch(s, /逐日资料待补齐/);
});

test("focus user interface no longer says Liuyao pending", () => {
  const a = read("lib/forecasts/focus-qimen-parallel.ts");
  const b = read("components/conviction/FocusQimenParallelPanel.tsx");
  assert.doesNotMatch(a, /六爻待补/);
  assert.doesNotMatch(b, /六爻待补/);
  assert.match(b, /六爻/);
  assert.match(b, /奇门/);
  assert.match(b, /当前节奏/);
});

test("core nine daily Liuyao includes target-day Ganzhi and is compared to Qimen daily-to-daily", () => {
  const weekly = read("lib/forecasts/weekly-to-daily.ts");
  const pipeline = read("lib/forecasts/daily-pipeline.ts");
  const access = read("lib/prediction-access-server.ts");
  assert.match(weekly, /`日判\$\{normalizeFormalDirection\(direction\)\}`/);
  assert.match(weekly, /地支\$\{day\.branchElement\}/);
  assert.match(pipeline, /applyQimenFirstToGeneratedDaily/);
  assert.match(pipeline, /liuyaoDirection: record\.direction/);
  assert.match(access, /pure\?\.liuyaoEvidence/);
  assert.match(access, /pure\?\.direction/);
});

test("all core9 and all 19 focus assets have 1H tactical target mappings", () => {
  const s = read("lib/market-data/intraday-chan-levels.ts");
  for (const key of ["BTC", "ETH", "SPX", "NDX", "WTI", "GOLD", "SILVER", "SHCOMP", "HSTECH"]) {
    assert.match(s, new RegExp(`\\b${key}\\b`));
  }
  for (const id of ["GANFENG-LITHIUM", "LIAN-TECH", "LEXIN-MEDICAL", "CXMT", "ASTEROID", "SANDISK", "NBIS", "MU", "HYPE", "SOL", "ETH", "BTC", "GOOGL", "MSFT", "TENCENT", "KINGSOFT-OFFICE", "TSLA", "LITE", "SPCX"]) {
    assert.match(s, new RegExp(`FOCUS:${id}`));
  }
});

test("4H structural levels are primary and transient failures are not cached as valid snapshots", () => {
  const s = read("lib/market-data/intraday-chan-levels.ts");
  const core = read("lib/market-data/chan-structural-levels-core.ts");
  assert.match(s, /GAOSHAN_CHAN_4H_PRIMARY/);
  assert.match(s, /timeframe: "4H"/);
  assert.match(core, /ACTIVE_CENTER/);
  assert.match(core, /confirmedFiveBarSwings/);
  assert.match(s, /timeoutMs: 3_200/);
  assert.match(s, /timeoutMs: 1_600/);
  assert.match(s, /loadRawSuccessful/);
  assert.match(s, /throw new Error\("INSUFFICIENT_STRUCTURAL_BARS"\)/);
  assert.match(s, /source: "UNAVAILABLE"/);
});

test("homepage uses streamed 4H-first levels and highlights only successful previous verdicts", () => {
  const s = read("components/home/HomeLandingBoard.tsx");
  assert.match(s, /HomeIntradayLevelPair/);
  assert.match(s, /item\.forecastDate < todayKey/);
  assert.match(s, /FULL_HIT/);
  assert.match(s, /PARTIAL_HIT/);
  assert.doesNotMatch(s, /new Set\(\["HIT", "FULL_HIT", "PARTIAL_HIT", "MISS"\]\)/);
  assert.match(s, /上一交易日命中案例/);
  assert.match(s, /首页只展示命中与部分命中；未命中与全部样本请查看公开验证/);
  assert.match(s, /href="\/verification"/);
  assert.doesNotMatch(s, /近期表现较稳的3个市场/);
});

test("beginner guide follows source-locked Liu Yao and Qimen governance", () => {
  const s = read("app/guide/page.tsx");
  assert.match(s, /有效的周／阶段六爻锁定短中期方向/);
  assert.match(s, /两者一致时提高信心/);
  assert.match(s, /不一致时并列展示并降低信心/);
  assert.match(s, /奇门不覆盖已经锁定的六爻方向/);
  assert.doesNotMatch(s, /奇门先判方向、六爻辅助/);
});

test("anonymous mobile homepage explains the product before member-only tools", () => {
  const home = read("components/home/HomeLandingBoard.tsx");
  const mobile = read("components/home/HomeMobileAppView.tsx");
  assert.match(home, /<main id="moonx-view"/);
  assert.doesNotMatch(home, /id="daily-board"/);
  assert.match(mobile, /if \(!canViewDaily\)/);
  assert.match(mobile, /九大市场每日方向研究/);
  assert.match(mobile, /预测先锁定，结果再公开验证/);
  assert.match(mobile, /免费注册看今日/);
  assert.match(mobile, /查看公开验证/);
  assert.match(mobile, /研究不是一句涨或跌/);
  assert.match(mobile, /先看方向/);
  assert.match(mobile, /再等确认/);
  assert.match(mobile, /最后守失效/);
});

test("focus detail uses client-safe 4H-first cards and never imports server-only loader into the client graph", () => {
  const s = read("components/conviction/FocusDossierPanel.tsx");
  const live = read("components/conviction/FocusIntradayTechnicalCards.tsx");
  const api = read("app/api/member/intraday-levels/route.ts");
  assert.match(s, /FocusIntradayTechnicalCards/);
  assert.match(live, /^"use client";/);
  assert.match(live, /\/api\/member\/intraday-levels/);
  assert.doesNotMatch(live, /intraday-chan-levels/);
  assert.match(live, /当日支撑/);
  assert.match(live, /当日压力/);
  assert.match(live, /失效位/);
  assert.match(api, /import "server-only"/);
  assert.match(api, /getIntradayTechnicalLevels/);
  assert.match(api, /getMemberDevicePageAccess/);
  assert.doesNotMatch(s, /<Suspense/);
  assert.doesNotMatch(s, /周期确认：/);
});

test("member daily prioritizes 4H structural levels for all core forecasts", () => {
  const s = read("lib/forecasts/member-daily-live-levels.ts");
  assert.match(s, /getIntradayTechnicalLevelMap/);
  assert.match(s, /headline levels come from the 4H center\/segment/);
  assert.match(s, /live && live\.source !== "UNAVAILABLE"/);
});

test("research integrity audit covers 9 core plus active focus and today plus next dual views", () => {
  const s = read("lib/research-integrity/audit.ts");
  assert.match(s, /RESEARCH_INTEGRITY_V2_20260819/);
  assert.match(s, /const CORE9 = \[/);
  assert.match(s, /ACTIVE_STATIC_FOCUS_ASSET_IDS\.map/);
  assert.match(s, /nextAuthority/);
  assert.match(s, /todayLiuyao/);
  assert.match(s, /todayQimen/);
  assert.match(s, /nextLiuyao/);
  assert.match(s, /nextQimen/);
});

test("freshness self-heal checks runtime focus daily coverage not only static cards", () => {
  const s = read("lib/automation/content-freshness.ts");
  assert.match(s, /readFocusRuntimeDailyCoverage/);
  assert.match(s, /codes\.length \* dates\.length/);
  assert.match(s, /runFocusWeekRouteHandler/);
  assert.match(s, /buildResearchIntegrityAudit/);
});

test("core site health requires both Liuyao and Qimen evidence", () => {
  const s = read("lib/admin/site-health.ts");
  assert.match(s, /row\.liuyaoEvidence\?\.trim\(\)/);
  assert.match(s, /row\.qimenEvidence\?\.trim\(\)/);
  assert.match(s, /完整六爻\+奇门双观点/);
});

console.log("MOOX V7.20.8.2 RESEARCH INTEGRITY 1H DUAL REGRESSION PASSED");
