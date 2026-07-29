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
  test("publishes seven core markets", () => {
    assert.equal(WEEKLY_CORE_MARKETS.length, 7);
    assert.equal(PUBLISHED_WEEKLY_ANALYSES.length, 7);
    assert.deepEqual(
      WEEKLY_CORE_MARKETS.map((m) => m.displaySymbol),
      ["BTC", "SPX", "NDX", "SHCOMP", "HSTECH", "GLD", "CL"]
    );
  });

  test("SPX NDX WTI are published on member list", () => {
    const published = listPublishedWeeklyAnalyses();
    assert.ok(published.some((r) => r.symbol === "SPX"));
    assert.ok(published.some((r) => r.symbol === "NDX"));
    assert.ok(published.some((r) => r.symbol === "WTI"));
    assert.equal(INTERNAL_WEEKLY_ANALYSES.length, 0);
    assert.equal(buildWeeklyMarketSlots().length, 7);
  });

  test("public summary and teaser omit direction and levels", () => {
    const summary = buildWeeklyPublicSummary();
    assert.equal(summary.coverageCount, 7);
    assert.equal(summary.publishedCount, 7);
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
