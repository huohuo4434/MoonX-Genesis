import assert from "node:assert/strict";
import test from "node:test";
import {
  publicStarAccuracyBreakdown,
  publicStarTrendAnalysis,
  type PublicAccuracyHistoryItem,
} from "../lib/accuracy/public-history-filter.ts";

function item(stars: 1 | 2 | 3 | 4 | 5, verdict: "FULL_HIT" | "PARTIAL_HIT" | "MISS", id: string): PublicAccuracyHistoryItem {
  return {
    forecastId: id,
    forecastDate: "2026-08-01",
    assetName: "测试",
    symbol: "TEST",
    market: "CRYPTO",
    predictedDirection: "上涨",
    predictedPattern: "上涨",
    actualDirection: verdict === "MISS" ? "下跌" : "上涨",
    actualPattern: verdict === "MISS" ? "下跌" : "上涨",
    validationMode: "FULL_PATH",
    actualReturnPct: 1,
    previousClose: 100,
    actualOpen: 100,
    actualHigh: 102,
    actualLow: 99,
    actualClose: 101,
    verdict,
    verdictLabel: verdict,
    verifiedAt: "2026-08-02T00:00:00.000Z",
    version: 1,
    source: "MOOX",
    consensusStars: stars,
  };
}

test("1星到5星分别统计且部分命中按0.5计", () => {
  const buckets = publicStarAccuracyBreakdown([
    item(1, "MISS", "a"),
    item(2, "PARTIAL_HIT", "b"),
    item(5, "FULL_HIT", "c"),
  ]);
  assert.deepEqual(buckets.map((row) => row.stars), [1, 2, 3, 4, 5]);
  assert.equal(buckets[0]!.weightedHitRate, 0);
  assert.equal(buckets[1]!.weightedHitRate, 0.5);
  assert.equal(buckets[4]!.weightedHitRate, 1);
});

test("高星明显优于低星时给出正向结论", () => {
  const rows: PublicAccuracyHistoryItem[] = [];
  for (let i = 0; i < 5; i += 1) rows.push(item(1, "MISS", `l${i}`));
  for (let i = 0; i < 5; i += 1) rows.push(item(5, "FULL_HIT", `h${i}`));
  const result = publicStarTrendAnalysis(rows);
  assert.equal(result.conclusion, "POSITIVE");
  assert.equal(result.highMinusLow, 1);
});

test("样本不足时不强行宣称高星更准", () => {
  const result = publicStarTrendAnalysis([
    item(1, "MISS", "a"),
    item(5, "FULL_HIT", "b"),
  ]);
  assert.equal(result.conclusion, "INSUFFICIENT");
  assert.equal(result.ratedSampleCount, 2);
});
