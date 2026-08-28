import test from "node:test";
import assert from "node:assert/strict";
import { buildMemberWeeklyReviewPayload } from "@/lib/member-review/weekly-review-report";
import type { WeeklyAccuracyPublicItem, WeeklyAccuracyPublicStats } from "@/lib/accuracy/get-weekly-history";
import type { MemberDailyReviewReport } from "@/lib/member-review/daily-review-report";
import type { WeeklyForecastSourceRecord } from "@/lib/weekly-source/types";
import type { WeeklyAnalysisRecord } from "@/types/weekly-analysis";

const stats: WeeklyAccuracyPublicStats = {
  sampleSize: 3,
  full: 1,
  partial: 1,
  miss: 1,
  unverifiable: 0,
  pending: 0,
  weightedAccuracyPct: 50,
  directionAccuracyPct: 66.7,
};

function history(input: Partial<WeeklyAccuracyPublicItem> & Pick<WeeklyAccuracyPublicItem, "id" | "assetId" | "symbol" | "predictedPattern" | "actualPattern" | "result">): WeeklyAccuracyPublicItem {
  return {
    weekStart: "2026-08-17",
    weekEnd: "2026-08-23",
    directionScore: 0,
    pathScore: 0,
    totalScore: input.result === "FULL_HIT" ? 90 : input.result === "PARTIAL_HIT" ? 65 : 0,
    explanation: null,
    verifiedAt: "2026-08-24T01:00:00.000Z",
    ...input,
  };
}

function analysis(input: Partial<WeeklyAnalysisRecord> & Pick<WeeklyAnalysisRecord, "id" | "assetId" | "assetName" | "symbol" | "overallDirection">): WeeklyAnalysisRecord {
  return {
    weekStart: "2026-08-17",
    weekEnd: "2026-08-23",
    weeklyPath: "先观察周初，再确认周中转折。",
    headline: "测试周预测",
    probabilities: { up: 50, flat: 20, down: 30 },
    invalidation: "周线失效",
    riskLevel: "中等",
    confidence: 70,
    publishedAt: "2026-08-16T01:00:00.000Z",
    updatedAt: "2026-08-16T01:00:00.000Z",
    status: "published",
    visibility: "member",
    version: 1,
    ...input,
  };
}

function source(marketCode: string, primaryHexagram: string): WeeklyForecastSourceRecord {
  return {
    id: `source-${marketCode}`,
    marketCode,
    periodStart: "2026-08-17",
    periodEnd: "2026-08-23",
    primaryHexagram,
    changedHexagram: "泽天夬",
    movingLines: [2],
    specialPatterns: [],
    weeklyDirection: "上涨",
    weeklyPath: "周内路径",
    interpretation: "锁定解读",
    riskSummary: "测试风险",
    sourceType: "LIUYAO_WEEKLY",
    version: 1,
    status: "LOCKED",
    publishedAt: "2026-08-16T01:00:00.000Z",
    lockedAt: "2026-08-16T01:00:00.000Z",
    createdAt: "2026-08-16T01:00:00.000Z",
    updatedAt: "2026-08-16T01:00:00.000Z",
  };
}

test("weekly review treats the locked week as the formal sample and diagnoses full, partial and missed weeks", () => {
  const items = [
    history({ id: "btc", assetId: "btc", symbol: "BTC", predictedPattern: "先跌后涨", actualPattern: "先跌后涨", result: "FULL_HIT" }),
    history({ id: "ndx", assetId: "nasdaq100", symbol: "NDX", predictedPattern: "上涨", actualPattern: "震荡上涨", result: "PARTIAL_HIT" }),
    history({ id: "gold", assetId: "gold", symbol: "GOLD", predictedPattern: "上涨", actualPattern: "下跌", result: "MISS" }),
  ];
  const payload = buildMemberWeeklyReviewPayload({
    history: { items, stats },
    analyses: [
      analysis({ id: "a-btc", assetId: "btc", assetName: "比特币", symbol: "BTC", overallDirection: "先跌后涨" }),
      analysis({ id: "a-ndx", assetId: "nasdaq100", assetName: "纳斯达克100", symbol: "NDX", overallDirection: "上涨" }),
      analysis({ id: "a-gold", assetId: "gold", assetName: "黄金", symbol: "GOLD", overallDirection: "上涨" }),
    ],
    sources: [source("BTC", "雷火丰"), source("NDX", "雷天大壮"), source("GOLD", "地泽临")],
    dailyReports: [],
  });
  assert.equal(payload.reports.length, 1);
  assert.equal(payload.reports[0]!.problemsFound, 2);
  assert.match(payload.reports[0]!.headline, /完成 3 项周验证/);
  const partial = payload.reports[0]!.items.find((item) => item.id === "ndx")!;
  assert.match(partial.confirmedProblem, /最终方向正确/);
  assert.match(partial.interpretationFinding, /不能直接判为“卦错”/);
  const miss = payload.reports[0]!.items.find((item) => item.id === "gold")!;
  assert.match(miss.confirmedProblem, /最终方向和周内路径/);
  assert.match(miss.correctionAction, /降低信心/);
  const full = payload.reports[0]!.items.find((item) => item.id === "btc")!;
  assert.match(full.nextRule, /日度结果只用来解释周内路径/);
});

test("daily evidence is nested under its source week and remains auxiliary", () => {
  const item = history({ id: "btc", assetId: "btc", symbol: "BTC", predictedPattern: "上涨", actualPattern: "上涨", result: "FULL_HIT" });
  const dailyReports = [{
    date: "2026-08-18",
    items: [{ forecastDate: "2026-08-18", symbol: "BTC", forecast: { pattern: "上涨" }, actual: { pattern: "震荡上涨" }, statusLabel: "部分命中" }],
  }] as unknown as MemberDailyReviewReport[];
  const payload = buildMemberWeeklyReviewPayload({ history: { items: [item], stats: { ...stats, sampleSize: 1, full: 1, partial: 0, miss: 0 } }, analyses: [], sources: [], dailyReports });
  assert.deepEqual(payload.reports[0]!.items[0]!.dailyEvidence, [{ date: "2026-08-18", forecast: "上涨", actual: "震荡上涨", status: "部分命中" }]);
});

test("source performance scores only independently frozen opinions and never awards a source id alone", () => {
  const item = history({ id: "gold", assetId: "gold", symbol: "GOLD", predictedPattern: "上涨", actualPattern: "下跌", result: "MISS" });
  const row = analysis({
    id: "a-gold", assetId: "gold", assetName: "黄金", symbol: "GOLD", overallDirection: "上涨",
    sourceIds: ["T01-GOLD-WEEK", "T02-GOLD-WEEK", "WU-QIMEN-GOLD"],
    sourceOpinions: [
      { sourceKey: "BINGWU_LIUYAO", sourceRecordId: "T01-GOLD-WEEK", role: "DIRECTION", direction: "下跌", lockedAt: "2026-08-16T01:00:00.000Z" },
      { sourceKey: "QIMEN_TIMING", sourceRecordId: "WU-QIMEN-GOLD", role: "TIMING", keyDates: ["2026-08-20"], lockedAt: "2026-08-16T01:00:00.000Z" },
    ],
  });
  const payload = buildMemberWeeklyReviewPayload({ history: { items: [item], stats }, analyses: [row], sources: [], dailyReports: [] });
  const core = payload.sourcePerformance.find((source) => source.sourceKey === "BINGWU_LIUYAO")!;
  const wolf = payload.sourcePerformance.find((source) => source.sourceKey === "WOLF_LIUYAO")!;
  const qimen = payload.sourcePerformance.find((source) => source.sourceKey === "QIMEN_TIMING")!;
  assert.equal(core.full, 1);
  assert.equal(core.attributableSamples, 1);
  assert.equal(core.confidenceAdjustmentPct, 0, "small samples must not change weights");
  assert.equal(wolf.attributableSamples, 0);
  assert.equal(wolf.linkedOnlySamples, 1, "a bare source id is not a scored opinion");
  assert.equal(qimen.attributableSamples, 0, "Qimen timing is not scored as weekly direction");
  assert.equal(qimen.state, "TIMING_ONLY");
});

test("post-window or mismatched source snapshots are rejected from attribution", () => {
  const item = history({ id: "btc", assetId: "btc", symbol: "BTC", predictedPattern: "上涨", actualPattern: "上涨", result: "FULL_HIT" });
  const row = analysis({
    id: "a-btc", assetId: "btc", assetName: "比特币", symbol: "BTC", overallDirection: "上涨",
    sourceIds: ["MOOX-USER-BTC"],
    sourceOpinions: [
      { sourceKey: "USER_LIUYAO", sourceRecordId: "MOOX-USER-BTC", role: "DIRECTION", direction: "上涨", lockedAt: "2026-08-18T01:00:00.000Z" },
      { sourceKey: "WOLF_LIUYAO", sourceRecordId: "NOT-IN-PROVENANCE", role: "DIRECTION", direction: "上涨", lockedAt: "2026-08-16T01:00:00.000Z" },
    ],
  });
  const payload = buildMemberWeeklyReviewPayload({ history: { items: [item], stats }, analyses: [row], sources: [], dailyReports: [] });
  assert.equal(payload.sourcePerformance.find((source) => source.sourceKey === "USER_LIUYAO")!.attributableSamples, 0);
  assert.equal(payload.sourcePerformance.find((source) => source.sourceKey === "WOLF_LIUYAO")!.attributableSamples, 0);
});
