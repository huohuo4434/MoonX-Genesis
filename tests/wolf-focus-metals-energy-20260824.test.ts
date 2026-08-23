import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  SANDISK_PERIOD_FORECASTS,
  SANDISK_PERIOD_REVISIONS_20260824,
  listSandiskPeriodForecasts,
} from "../lib/data/conviction/sandisk-forecasts.ts";
import {
  TSLA_LIUYAO_FORECASTS_20260816,
  TSLA_LIUYAO_REVISIONS_20260824,
  listTSLAPeriodForecasts20260816,
} from "../lib/data/conviction/tsla-liuyao-20260816.ts";
import {
  WEEKLY_METALS_ENERGY_20260824,
} from "../lib/data/published-weekly-metals-energy-20260824.ts";
import {
  buildWeeklyMarketSlots,
  listAllPublishedWeeklyAnalyses,
  toWeeklyMemberView,
} from "../lib/data/weekly-analysis.ts";
import {
  MONTHLY_MARKET_OUTLOOKS_202609,
  MONTHLY_MARKET_OUTLOOKS_202609_ARCHIVED_REVISIONS,
} from "../lib/data/monthly-market-outlook-202609.ts";

describe("0824 specialist review and new metals/energy charts", () => {
  it("preserves SNDK V1 and exposes the forward V2 plus the new Sep 1-6 window", () => {
    assert.ok(SANDISK_PERIOD_FORECASTS.some((item) => item.id === "SNDK-W3-20260824-V1"));
    assert.ok(SANDISK_PERIOD_REVISIONS_20260824.some((item) => item.id === "SNDK-W3-20260824-V2"));
    assert.ok(SANDISK_PERIOD_REVISIONS_20260824.some((item) => item.id === "SNDK-W4-20260901-V1"));
    assert.ok(listSandiskPeriodForecasts().some((item) => item.id === "SNDK-M1-20260807-V2"));

    const forecasts = listSandiskPeriodForecasts();
    const week3 = forecasts.filter((item) => item.forecastType === "WEEK_3").sort((a, b) => b.version - a.version)[0];
    const week4 = forecasts.filter((item) => item.forecastType === "WEEK_4").sort((a, b) => b.version - a.version)[0];
    assert.equal(week3?.id, "SNDK-W3-20260824-V2");
    assert.equal(week3?.direction, "震荡上涨");
    assert.equal(week4?.id, "SNDK-W4-20260901-V1");
    assert.doesNotMatch(week3?.summary ?? "", /保证|必然/);
  });

  it("keeps both TSLA versions and gives specialist evidence priority without deleting disagreement", () => {
    assert.ok(TSLA_LIUYAO_FORECASTS_20260816.some((item) => item.id === "TSLA-W2-20260824-V1"));
    assert.deepEqual(
      TSLA_LIUYAO_REVISIONS_20260824.map((item) => [item.forecastType, item.version, item.direction]),
      [["WEEK_2", 2, "先涨后跌"], ["WEEK_3", 2, "先跌后涨"]],
    );
    assert.equal(listTSLAPeriodForecasts20260816().length, TSLA_LIUYAO_FORECASTS_20260816.length + 2);

    const forecasts = listTSLAPeriodForecasts20260816();
    const week2 = forecasts.filter((item) => item.forecastType === "WEEK_2").sort((a, b) => b.version - a.version)[0];
    const week3 = forecasts.filter((item) => item.forecastType === "WEEK_3").sort((a, b) => b.version - a.version)[0];
    assert.equal(week2?.id, "TSLA-W2-20260824-V2");
    assert.equal(week3?.id, "TSLA-W3-20260831-V2");
    assert.match(week2?.consensusLabel ?? "", /分歧/);
  });

  it("publishes five complete weekly windows for gold, silver and WTI without fake Qimen resonance", () => {
    assert.equal(WEEKLY_METALS_ENERGY_20260824.length, 15);
    assert.deepEqual(new Set(WEEKLY_METALS_ENERGY_20260824.map((item) => item.assetId)), new Set(["gold", "silver", "wti-crude"]));
    for (const record of WEEKLY_METALS_ENERGY_20260824) {
      assert.equal(record.status, "published");
      assert.equal(record.originalLocked, true);
      assert.equal(record.basisWeights?.qimen, 0);
      assert.equal(record.basisWeights?.technical, 0);
      assert.equal(record.keyDates, undefined);
      assert.equal(record.probabilities.up + record.probabilities.flat + record.probabilities.down, 100);
      assert.match(record.confirmation ?? "", /4小时/);
      assert.doesNotMatch(`${record.headline}${record.weeklyPath}`, /狼叔|老师姓名/);
      assert.equal("sourceIds" in toWeeklyMemberView(record), false);
    }

    const all = listAllPublishedWeeklyAnalyses();
    assert.ok(all.some((item) => item.id === "WEEKLY-GOLD-20260831-V1"));
    assert.ok(all.some((item) => item.id === "WEEKLY-SILVER-20260928-V1"));
    assert.ok(all.some((item) => item.id === "WEEKLY-WTI-20260928-V1"));

    const slots = buildWeeklyMarketSlots(new Date("2026-08-29T04:00:00Z"));
    for (const assetId of ["gold", "silver", "wti-crude"]) {
      const slot = slots.find((item) => item.kind === "published" ? item.analysis.assetId === assetId : item.assetId === assetId);
      assert.equal(slot?.kind, "published");
    }
  });

  it("adds September silver and revisions WTI while retaining the prior WTI row", () => {
    const silver = MONTHLY_MARKET_OUTLOOKS_202609.find((item) => item.assetId === "silver");
    const wti = MONTHLY_MARKET_OUTLOOKS_202609.find((item) => item.assetId === "wti-crude");
    const oldWti = MONTHLY_MARKET_OUTLOOKS_202609_ARCHIVED_REVISIONS.find((item) => item.assetId === "wti-crude");
    assert.equal(silver?.direction, "先涨后跌");
    assert.equal(wti?.direction, "先涨后跌");
    assert.equal(wti?.version, 2);
    assert.equal(oldWti?.direction, "震荡上涨");
    assert.equal(oldWti?.version, 1);
    assert.match(wti?.revisionReason ?? "", /保留V1/);
  });

  it("records the teacher's month-week cross-check and separated review metrics", () => {
    const rulebook = readFileSync("lib/data/teacher-method-rulebook-20260815.ts", "utf8");
    assert.match(rulebook, /version: "2026-08-24\.v3"/);
    assert.match(rulebook, /WOLF-20260824-SNDK-TSLA/);
    assert.match(rulebook, /wolf-month-week-crosscheck[\s\S]*月卦[\s\S]*周卦[\s\S]*K线/);
    assert.match(rulebook, /wolf-candidate-date-boundary[\s\S]*候选[\s\S]*价格结构/);
    assert.match(rulebook, /wolf-review-correction-example[\s\S]*日期[\s\S]*方向[\s\S]*幅度/);
  });

  it("does not promise Liu Yao and Qimen resonance when a same-period chart is missing", () => {
    const detail = readFileSync("components/conviction/ConvictionDetailClient.tsx", "utf8");
    assert.doesNotMatch(detail, /六爻与奇门双观点/);
    assert.match(detail, /没有对应排盘时不会补造/);
  });
});
