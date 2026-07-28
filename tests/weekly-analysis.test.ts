import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  ALL_WEEKLY_ANALYSES,
  INTERNAL_WEEKLY_ANALYSES,
  PUBLISHED_WEEKLY_ANALYSES,
} from "../lib/data/published-weekly-analysis-20260727.ts";
import {
  buildWeeklyPublicSummary,
  listPublishedWeeklyAnalyses,
  toWeeklyMemberView,
  toWeeklyTeaser,
} from "../lib/data/weekly-analysis.ts";

describe("weekly member analysis", () => {
  test("publishes four assets only", () => {
    assert.equal(PUBLISHED_WEEKLY_ANALYSES.length, 4);
    assert.deepEqual(
      PUBLISHED_WEEKLY_ANALYSES.map((r) => r.symbol).sort(),
      ["000001.SS", "BTC", "GLD", "HSTECH"].sort()
    );
  });

  test("SPX NDX WTI stay internal_review and hidden from published list", () => {
    assert.ok(INTERNAL_WEEKLY_ANALYSES.every((r) => r.status === "internal_review"));
    const published = listPublishedWeeklyAnalyses();
    assert.ok(!published.some((r) => ["SPX", "NDX", "WTI"].includes(r.symbol)));
    assert.ok(ALL_WEEKLY_ANALYSES.some((r) => r.symbol === "SPX" && r.status === "internal_review"));
  });

  test("public summary and teaser omit direction and levels", () => {
    const summary = buildWeeklyPublicSummary();
    assert.equal(summary.publishedCount, 4);
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
