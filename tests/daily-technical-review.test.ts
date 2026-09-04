import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { reviewClosedTechnicalFrame, applyDailyTechnicalReview } from "../lib/forecasts/daily-technical-review-core";
import { ema } from "../lib/market-data/ema-core";
import { generateDailyFromWeekly } from "../lib/forecasts/weekly-to-daily";
import { decideDailyRevision, preservePublishedTechnicalReview, withAuthoritativeDailyLatest } from "../lib/forecasts/daily-rolling-core";
import { generatedDailyToUi } from "../lib/forecasts/generated-to-ui";
import { CANONICAL_WEEKLY_LIUYAO_SOURCES } from "../lib/weekly-source/canonical-six";
import type { ChanCandle } from "../types/chan-execution";
const cutoffMs = Date.parse("2026-09-05T12:00:00Z");
const candles = (): ChanCandle[] => Array.from({ length: 100 }, (_, i) => ({ timestamp: cutoffMs - (100 - i) * 3600_000,
  open: 100, high: 100.1, low: 99.9, close: 100, volume: 1 }));
const review = (bars = candles()) => reviewClosedTechnicalFrame({ timeframe: "1H", candles: bars, cutoffMs, maxAgeMs: 3 * 3600_000 });
test("EMA retains warm-up; flat MACD is zero without imaginary momentum", () => {
  assert.ok(Number.isNaN(ema([1, 2, 3], 3)[0]));
  assert.equal(ema([1, 2, 3, 4], 3).at(-1), 3);
  const row = review();
  assert.equal(row.ema60, 100); assert.equal(row.dif, 0); assert.equal(row.dea, 0); assert.equal(row.histogram, 0);
  assert.match(row.reason, /零轴附近/);
});
test("unfinished and future candles never change published review; duplicates do not add history", () => {
  const bars = candles();
  const expected = review(bars);
  assert.deepEqual(review([...bars, bars[0]!, { ...bars[0]!, timestamp: cutoffMs - 10, high: 10000, close: 9000 }]), expected);
  assert.equal(review(bars.slice(-40)).available, false);
  assert.equal(review([...bars, { ...bars[0]!, close: 100.01 }]).available, false);
  assert.equal(review(bars.map((bar) => ({ ...bar, timestamp: bar.timestamp - 10 * 86400_000 }))).available, false);
});
test("pressure reduces continuation score but a confirmed breakout does not remain stuck at old resistance", () => {
  assert.equal(review().pressure, true);
  const bars = candles();
  for (const i of [98, 99]) bars[i] = { ...bars[i]!, open: 110, high: 111, low: 109, close: 110 };
  assert.equal(review(bars).pressure, false);
  assert.match(review(bars).reason, /连续两根收盘突破/);
});
test("larger frames have larger risk penalties, not a claimed higher hit rate", () => {
  const weights = (["1H", "4H", "1D"] as const).map((timeframe, j) => {
    const ms = [3600_000, 4 * 3600_000, 86400_000][j]!;
    return reviewClosedTechnicalFrame({ timeframe, cutoffMs, maxAgeMs: ms * 2,
      candles: candles().map((bar, i) => ({ ...bar, timestamp: cutoffMs - (100 - i) * ms })) }).penalty;
  });
  assert.ok(weights[0]! < weights[1]! && weights[1]! < weights[2]!);
});
test("review is append-only, sums stay 100, formal source/side/stars never become technical votes", () => {
  const original = generateDailyFromWeekly({ weekly: CANONICAL_WEEKLY_LIUYAO_SOURCES[0]!, forecastDate: "2026-07-30" });
  const base = { ...original, direction: "上涨", upProbability: 60, sidewaysProbability: 25, downProbability: 15 };
  const before = structuredClone(base);
  const result = applyDailyTechnicalReview(base, [review()], "BTCUSDT");
  assert.equal(result.direction, base.direction); assert.equal(result.sourceWeeklyForecastId, base.sourceWeeklyForecastId);
  assert.ok(result.upProbability < base.upProbability); assert.equal(result.downProbability, 15);
  assert.equal(result.upProbability + result.sidewaysProbability + result.downProbability, 100);
  assert.deepEqual(base, before);
  assert.ok(generatedDailyToUi(result).technicalReview?.includes("MACD"));
  assert.equal(generatedDailyToUi(result).consensusStars, undefined);
  assert.equal(generatedDailyToUi(result).consensusScore, undefined);
  assert.equal(generatedDailyToUi(result).consensusLabel, "未单独评估");
  assert.ok(decideDailyRevision({ latest: base, candidate: result, verifiedMarketProgress: true }).reasons.includes("TECHNICAL_REVIEW_CHANGED"));
  assert.equal(decideDailyRevision({ latest: result, candidate: { ...result, technicalEvidence: `${result.technicalEvidence}time only` }, verifiedMarketProgress: true }).shouldCreate, false);
});
test("missing data is visible and cannot boost confidence", () => {
  const base = generateDailyFromWeekly({ weekly: CANONICAL_WEEKLY_LIUYAO_SOURCES[0]!, forecastDate: "2026-07-30" });
  const result = applyDailyTechnicalReview(base, [], "读取失败");
  assert.equal(result.upProbability, base.upProbability);
  assert.match(result.risks.at(-1)!, /行情不足/);
});

test("crossing midnight preserves the published snapshot without rebuilding or persisting a reversal", async () => {
  const base = generateDailyFromWeekly({ weekly: CANONICAL_WEEKLY_LIUYAO_SOURCES[0]!, forecastDate: "2026-07-30" });
  const published = applyDailyTechnicalReview({ ...base, forecastDate: "2026-09-06", status: "LOCKED" }, [review()], "BTCUSDT");
  assert.equal(preservePublishedTechnicalReview(published, "2026-09-05"), false);
  for (const today of ["2026-09-06", "2026-09-07"]) {
    let rebuilt = false;
    const result = await withAuthoritativeDailyLatest({ loadLatest: async () => published, runAfterAuthority: async (latest) => {
      if (preservePublishedTechnicalReview(latest, today)) return latest;
      rebuilt = true;
      return base;
    } });
    assert.equal(rebuilt, false); assert.strictEqual(result, published);
  }
  assert.equal(preservePublishedTechnicalReview({ ...published, status: "DRAFT" }, "2026-09-06"), false);
});
test("production reviews before quality gate with current cutoff and exposes snapshot separately from live levels", () => {
  const pipeline = readFileSync("lib/forecasts/daily-pipeline.ts", "utf8");
  assert.ok(pipeline.indexOf("record = applyDailyTechnicalReview") < pipeline.indexOf("const quality = validateGeneratedDailyPublication"));
  assert.match(pipeline, /target > beijingDate/);
  assert.match(pipeline, /loadDailyTechnicalReview\(market, Math.min\(now.getTime\(\), Date.now\(\)\)\)/);
  assert.match(pipeline, /\[forecastDate, getBeijingTodayKey\(now\)\]/);
  assert.ok(pipeline.indexOf("if (preservePublishedTechnicalReview(latest, beijingDate))") < pipeline.indexOf("let snapshot: MarketSnapshot | null = null"));
  assert.match(readFileSync("app/member/daily/page.tsx", "utf8"), /MACD、EMA60与缠论复核（发布时快照）/);
  for (const file of ["app/member/daily/page.tsx", "components/home/HomeLandingBoard.tsx", "components/member/MemberTomorrowPage.tsx"]) {
    assert.match(readFileSync(file, "utf8"), /consensusLabel === "未单独评估"/);
  }
  const reader = readFileSync("lib/forecasts/daily-technical-review.server.ts", "utf8");
  assert.match(reader, /selectedProvider/);
  assert.match(reader, /多源现货\/合约参考/);
});
