import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { hasMarketStructureEvidence, weeklyReportActions } from "../lib/presentation/member-conclusion-summaries";

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("shared conclusion-first panel keeps the answer, actions and optional evidence in one compact contract", () => {
  const source = read("components/member/ConclusionFirstPanel.tsx");
  assert.match(source, /data-conclusion-first="1"/);
  assert.match(source, /facts\.map/);
  assert.match(source, /actions\.map/);
  assert.match(source, /<details/);
  assert.match(source, /overflow-x-auto/);
  assert.match(source, /headingLevel/);
});

test("core member columns expose conclusion-first markers", () => {
  for (const file of [
    "app/member/daily/page.tsx",
    "app/member/alpha-feed/page.tsx",
    "app/member/sector-resonance/page.tsx",
    "app/member/weekly-report/page.tsx",
    "app/member/market-structure/page.tsx",
    "app/member/early-altcoin-radar/page.tsx",
    "components/research/AnnualForecastRoadmap2026.tsx",
    "components/conviction/MemberStockResearchDashboard.tsx",
    "components/conviction/MemberRecommendationList.tsx",
    "components/signals/MemberTradingSignals.tsx",
    "components/research/BtcEthCycleComparison.tsx",
    "components/member/StrategyCenterPage.tsx",
  ]) {
    assert.match(read(file), /ConclusionFirstPanel/, file);
  }
  assert.match(read("components/member/MemberWeeklyPage.tsx"), /data-conclusion-first="1"/);
  assert.match(read("components/member/MemberSeptemberRotationReport.tsx"), /data-conclusion-first="1"/);
  assert.match(read("components/member/AiTradingDeskClient.tsx"), /data-conclusion-first="1"/);
  assert.match(read("app/member/technical-methods/page.tsx"), /data-conclusion-first="1"/);
});

test("supporting status, history and charts appear after the current conclusion", () => {
  const daily = read("app/member/daily/page.tsx");
  assert.ok(daily.indexOf("title={todayPublished.length") < daily.indexOf('<StatusCard label="今日预测"'));

  const weekly = read("components/member/MemberWeeklyPage.tsx");
  const fullPage = weekly.slice(weekly.indexOf("export function MemberWeeklyFullPage"));
  assert.ok(fullPage.indexOf("<WeeklyAtAGlance") < fullPage.indexOf("<MetaHeader"));
  assert.ok(weekly.indexOf("published.map") < weekly.indexOf("展开版本变化与修订原因"));

  const alpha = read("app/member/alpha-feed/page.tsx");
  assert.ok(alpha.indexOf('title={en ? "Current multi-view balance"') < alpha.indexOf('en ? "Data freshness"'));

  const strategy = read("components/member/StrategyCenterPage.tsx");
  assert.ok(strategy.indexOf("<ConclusionFirstPanel") < strategy.indexOf("{snapshot.dataNotice}"));

  const stock = read("components/conviction/MemberStockResearchDashboard.tsx");
  assert.ok(stock.indexOf("<ConclusionFirstPanel") < stock.indexOf("<AnnualCard view={selected.annual}"));

  const sector = read("app/member/sector-resonance/page.tsx");
  assert.ok(sector.indexOf("<ConclusionFirstPanel") < sector.indexOf('<Link href="/member/annual-outlook"'));

  const crypto = read("components/conviction/MemberRecommendationList.tsx");
  assert.ok(crypto.indexOf("<ConclusionFirstPanel") < crypto.indexOf('<div className="grid gap-4 lg:grid-cols-2">'));

  const signals = read("components/signals/MemberTradingSignals.tsx");
  assert.ok(signals.indexOf("<ConclusionFirstPanel") < signals.indexOf("展开星级、共识、状态与风险说明"));

  const cycle = read("components/research/BtcEthCycleComparison.tsx");
  assert.ok(cycle.indexOf("<ConclusionFirstPanel") < cycle.indexOf('<section className="grid gap-4 lg:grid-cols-2">'));

  const weeklyReport = read("app/member/weekly-report/page.tsx");
  assert.ok(weeklyReport.indexOf("<ConclusionFirstPanel") < weeklyReport.indexOf("本周优先关注"));

  const marketStructure = read("app/member/market-structure/page.tsx");
  assert.ok(marketStructure.indexOf("<ConclusionFirstPanel") < marketStructure.indexOf("<table"));

  const altcoinRadar = read("app/member/early-altcoin-radar/page.tsx");
  assert.ok(altcoinRadar.indexOf("<ConclusionFirstPanel") < altcoinRadar.indexOf("<table"));

  const technicalMethods = read("app/member/technical-methods/page.tsx");
  assert.ok(technicalMethods.indexOf('data-conclusion-first="1"') < technicalMethods.indexOf("<ChanStructureChart"));
});

test("new conclusion-first pages keep one page-level heading", () => {
  for (const file of [
    "app/member/weekly-report/page.tsx",
    "app/member/market-structure/page.tsx",
    "app/member/early-altcoin-radar/page.tsx",
  ]) {
    assert.match(read(file), /headingLevel="h1"/, file);
  }
  assert.match(read("app/member/technical-methods/page.tsx"), /<h1/);
});

test("market structure does not call fixed placeholder rows valid evidence", () => {
  const empty = {
    price: null,
    chanConfirmation: null,
    chanInvalidation: null,
    fundingRate: null,
    openInterest: null,
    longShortRatio: null,
  };
  assert.equal(hasMarketStructureEvidence(empty), false);
  assert.equal(hasMarketStructureEvidence({ ...empty, fundingRate: 0 }), true);
  assert.equal(hasMarketStructureEvidence({ ...empty, price: 100 }), true);
});

test("weekly report empty state never asks members to inspect a missing lead asset", () => {
  const emptyActions = weeklyReportActions(false).join("\n");
  assert.doesNotMatch(emptyActions, /首要标的/);
  assert.match(emptyActions, /等待本周审核完成/);
  assert.match(weeklyReportActions(true).join("\n"), /首要标的/);
});

test("member-facing conclusion panels do not claim to be AI-generated", () => {
  const combined = [
    read("components/member/ConclusionFirstPanel.tsx"),
    read("app/member/daily/page.tsx"),
    read("app/member/alpha-feed/page.tsx"),
    read("app/member/sector-resonance/page.tsx"),
    read("components/research/AnnualForecastRoadmap2026.tsx"),
  ].join("\n");
  assert.doesNotMatch(combined, /AI生成|人工智能生成/);
});
