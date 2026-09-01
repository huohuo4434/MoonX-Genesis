import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  WEEKLY_CORE_MARKETS,
  PUBLISHED_WEEKLY_ANALYSES,
  INTERNAL_WEEKLY_ANALYSES,
} from "../lib/data/published-weekly-analysis-20260727.ts";
import {
  buildWeeklyPublicSummary,
  buildWeeklyMarketSlots,
  listPublishedWeeklyAnalyses,
  toWeeklyMemberView,
  toWeeklyTeaser,
} from "../lib/data/weekly-analysis.ts";

describe("weekly member analysis", () => {
  test("publishes nine canonical core markets", () => {
    assert.equal(WEEKLY_CORE_MARKETS.length, 9);
    assert.equal(PUBLISHED_WEEKLY_ANALYSES.length, 7);
    assert.deepEqual(
      WEEKLY_CORE_MARKETS.map((m) => m.displaySymbol),
      ["BTC", "ETH", "SPX", "NDX", "SHCOMP", "HSTECH", "GC", "SI", "CL"]
    );
  });

  test("only the five active markets are published on the member list", () => {
    const now = new Date("2026-08-02T12:00:00+08:00");
    const published = listPublishedWeeklyAnalyses(now);
    assert.equal(published.some((r) => r.symbol === "SPX"), false);
    assert.ok(published.some((r) => r.symbol === "NDX"));
    assert.equal(published.some((r) => r.symbol === "WTI"), false);
    assert.equal(INTERNAL_WEEKLY_ANALYSES.length, 0);
    assert.equal(published.length, 5);
    assert.ok(published.some((r) => r.symbol === "ETH"));
    assert.ok(published.some((r) => r.symbol === "SILVER"));
    assert.equal(buildWeeklyMarketSlots(now).length, 5);
  });

  test("public summary and teaser omit direction and levels", () => {
    const now = new Date("2026-08-02T12:00:00+08:00");
    const summary = buildWeeklyPublicSummary(now);
    assert.equal(summary.coverageCount, 5);
    assert.equal(summary.publishedCount, 5);
    assert.ok(summary.weekLabel.includes("2026"));
    const teaser = toWeeklyTeaser(PUBLISHED_WEEKLY_ANALYSES[0]!);
    assert.equal("overallDirection" in teaser, false);
    assert.equal("weeklyPath" in teaser, false);
    assert.equal("probabilities" in teaser, false);
    const json = JSON.stringify(teaser);
    assert.equal(json.includes("先涨后跌"), false);
    assert.equal(json.includes("sourceIds"), false);
  });

  test("member view strips sourceIds", () => {
    const view = toWeeklyMemberView(PUBLISHED_WEEKLY_ANALYSES[0]!);
    assert.equal("sourceIds" in view, false);
    assert.ok(view.overallDirection);
    assert.ok(view.weeklyPath);
  });

  test("public direction labels avoid banned jargon", () => {
    const blob = PUBLISHED_WEEKLY_ANALYSES.map((r) => `${r.overallDirection}${r.headline}${r.weeklyPath}`).join(
      ""
    );
    assert.equal(blob.includes("前高后低"), false);
    assert.equal(blob.includes("先抑后扬"), false);
    assert.equal(blob.includes("修复偏多"), false);
  });
});
