import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  buildWeeklyRollingVerification,
  normalizeWeeklyRollingSymbol,
  scoreRollingDailyDirection,
} from "../lib/verification/weekly-rolling-core";
import { buildWeeklyRollingActualsFromBars } from "../lib/verification/weekly-rolling-market-core";
import type {
  DailyAccuracyDirection,
  DailyForecastRecord,
  DailyVerificationResult,
  DailyVerdict,
} from "../types/daily-accuracy";
import { DIRECTION_LABELS, VERDICT_LABELS } from "../types/daily-accuracy";
import type { WeeklyAnalysisMemberView } from "../types/weekly-analysis";

const NOW = new Date("2026-08-26T10:00:00Z");

function weekly(symbol = "BTC"): WeeklyAnalysisMemberView {
  return {
    id: `weekly-${symbol}`,
    assetId: symbol.toLowerCase(),
    assetName: symbol === "BTC" ? "比特币" : "标普500",
    symbol,
    displaySymbol: symbol,
    weekStart: "2026-08-24",
    weekEnd: "2026-08-30",
    overallDirection: "先跌后涨",
    weeklyPath: "周初回落，周中企稳，周后段回升。",
    headline: "本周路径",
    probabilities: { up: 45, flat: 20, down: 35 },
    invalidation: "周内结构失效时复核，不改写原预测。",
    riskLevel: "中等",
    confidence: 72,
    publishedAt: "2026-08-23T08:00:00.000Z",
    updatedAt: "2026-08-23T08:00:00.000Z",
    status: "published",
    visibility: "member",
    version: 1,
    originalLocked: true,
  };
}

function forecast(
  date: string,
  direction: DailyAccuracyDirection,
  symbol = "BTC",
): DailyForecastRecord {
  return {
    id: `${symbol}-${date}`,
    forecastDate: date,
    assetName: symbol === "BTC" ? "比特币" : "标普500",
    symbol,
    market: symbol === "BTC" ? "CRYPTO" : "US",
    direction,
    directionLabel: DIRECTION_LABELS[direction],
    publishedAt: `${date}T00:00:00.000Z`,
    cutoffAt: `${date}T01:00:00.000Z`,
    status: "published",
    originalVersion: 1,
    source: "MOOX",
    quoteSymbol: symbol === "BTC" ? "BTC-USD" : "^GSPC",
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
  };
}

function result(
  date: string,
  actualDirection: DailyAccuracyDirection,
  verdict: DailyVerdict = "FULL_HIT",
  symbol = "BTC",
): DailyVerificationResult {
  return {
    forecastId: `${symbol}-${date}`,
    forecastDate: date,
    assetName: symbol === "BTC" ? "比特币" : "标普500",
    symbol,
    previousClose: 100,
    actualClose: actualDirection === "UP" ? 102 : actualDirection === "DOWN" ? 98 : 100,
    actualReturnPct: actualDirection === "UP" ? 2 : actualDirection === "DOWN" ? -2 : 0,
    actualDirection,
    verdict,
    verdictLabel: VERDICT_LABELS[verdict],
    verifiedAt: `${date}T08:00:00.000Z`,
    dataSource: "test",
  };
}

test("daily rolling score distinguishes exact, adjacent and opposite directions", () => {
  assert.deepEqual(scoreRollingDailyDirection("DOWN", "DOWN"), { match: "EXACT", score: 1 });
  assert.deepEqual(scoreRollingDailyDirection("DOWN", "FLAT"), { match: "PARTIAL", score: 0.5 });
  assert.deepEqual(scoreRollingDailyDirection("DOWN", "UP"), { match: "OPPOSITE", score: 0 });
});

test("user example scores 83% after three valid sessions and leaves the future unscored", () => {
  const forecasts = [
    forecast("2026-08-24", "DOWN"),
    forecast("2026-08-25", "DOWN"),
    forecast("2026-08-26", "FLAT"),
  ];
  const report = buildWeeklyRollingVerification({
    weekly: weekly(),
    forecasts,
    results: [
      result("2026-08-24", "DOWN"),
      result("2026-08-25", "FLAT", "PARTIAL_HIT"),
      result("2026-08-26", "FLAT"),
    ],
    now: NOW,
  });

  assert.equal(report.verifiedDays, 3);
  assert.equal(report.exactDays, 2);
  assert.equal(report.partialDays, 1);
  assert.equal(report.oppositeDays, 0);
  assert.equal(report.matchingPct, 83);
  assert.equal(report.confidence, "HIGH");
  assert.equal(report.days.find((day) => day.date === "2026-08-27")?.status, "PENDING");
  assert.equal(report.days.find((day) => day.date === "2026-08-27")?.predictionSource, "WEEKLY_PLAN");
});

test("opposite realized tape triggers review instead of rewriting the locked weekly call", () => {
  const forecasts = [
    forecast("2026-08-24", "DOWN"),
    forecast("2026-08-25", "DOWN"),
    forecast("2026-08-26", "FLAT"),
  ];
  const sourceWeekly = weekly();
  const report = buildWeeklyRollingVerification({
    weekly: sourceWeekly,
    forecasts,
    results: [
      result("2026-08-24", "UP", "MISS"),
      result("2026-08-25", "UP", "MISS"),
      result("2026-08-26", "FLAT"),
    ],
    now: NOW,
  });

  assert.equal(report.matchingPct, 33);
  assert.equal(report.confidence, "REVIEW");
  assert.equal(report.oppositeDays, 2);
  assert.equal(sourceWeekly.overallDirection, "先跌后涨");
  assert.match(report.conclusionZh, /不能机械沿用/);
});

test("fewer than three sessions stays preliminary and unverifiable rows never enter the score", () => {
  const forecasts = [
    forecast("2026-08-24", "DOWN"),
    forecast("2026-08-25", "DOWN"),
    forecast("2026-08-26", "FLAT"),
  ];
  const report = buildWeeklyRollingVerification({
    weekly: weekly(),
    forecasts,
    results: [
      result("2026-08-24", "DOWN"),
      result("2026-08-25", "DOWN"),
      result("2026-08-26", "UP", "UNVERIFIABLE"),
    ],
    now: NOW,
  });

  assert.equal(report.verifiedDays, 2);
  assert.equal(report.matchingPct, 100);
  assert.equal(report.confidence, "EARLY");
  assert.equal(report.days.find((day) => day.date === "2026-08-26")?.status, "PENDING");
});

test("a daily row published after its cutoff is treated as hindsight and cannot be scored", () => {
  const late = forecast("2026-08-24", "DOWN");
  late.publishedAt = "2026-08-24T02:00:00.000Z";
  late.cutoffAt = "2026-08-24T01:00:00.000Z";
  const report = buildWeeklyRollingVerification({
    weekly: weekly(),
    forecasts: [late],
    results: [result("2026-08-24", "DOWN")],
    now: NOW,
  });

  assert.equal(report.verifiedDays, 0);
  assert.equal(report.matchingPct, null);
  assert.equal(report.days[0]?.predictionSource, "WEEKLY_PLAN");
});

test("traditional markets mark weekends closed while crypto retains all seven dates", () => {
  const btc = buildWeeklyRollingVerification({ weekly: weekly("BTC"), forecasts: [], results: [], now: NOW });
  const spx = buildWeeklyRollingVerification({ weekly: weekly("SPX"), forecasts: [], results: [], now: NOW });

  assert.equal(btc.days.filter((day) => day.marketClosed).length, 0);
  assert.equal(spx.days.filter((day) => day.marketClosed).length, 2);
  assert.deepEqual(
    spx.days.filter((day) => day.marketClosed).map((day) => day.date),
    ["2026-08-29", "2026-08-30"],
  );
  assert.equal(normalizeWeeklyRollingSymbol("GC"), "GOLD");
});

test("weekly path is verified from realized bars even when no daily forecast exists", () => {
  const report = buildWeeklyRollingVerification({
    weekly: weekly("BTC"),
    forecasts: [],
    results: [],
    actuals: [
      { symbol: "BTC", date: "2026-08-24", actualDirection: "DOWN", actualLabel: "下跌", marketClosed: false, verifiedAt: "2026-08-25T00:30:00.000Z", dataSource: "test-bars" },
      { symbol: "BTC", date: "2026-08-25", actualDirection: "UP", actualLabel: "上涨", marketClosed: false, verifiedAt: "2026-08-26T00:30:00.000Z", dataSource: "test-bars" },
    ],
    now: NOW,
  });

  assert.equal(report.verifiedDays, 2);
  assert.equal(report.days[0]?.predictionSource, "WEEKLY_PLAN");
  assert.equal(report.days[0]?.actualDirection, "DOWN");
  assert.equal(report.days[1]?.actualDirection, "UP");
});

test("one fetched bar window produces every completed crypto session", () => {
  const actuals = buildWeeklyRollingActualsFromBars({
    symbol: "BTC",
    quoteSymbol: "BTC-USD",
    readyDates: ["2026-08-24", "2026-08-25"],
    bars: [
      { date: "2026-08-23", open: 100, high: 101, low: 99, close: 100 },
      { date: "2026-08-24", open: 100, high: 100, low: 97, close: 98 },
      { date: "2026-08-25", open: 98, high: 101, low: 98, close: 100 },
    ],
    dataSource: "test-bars",
    verifiedAt: NOW.toISOString(),
  });
  assert.deepEqual(actuals.map((row) => [row.date, row.actualDirection]), [
    ["2026-08-24", "DOWN"],
    ["2026-08-25", "UP"],
  ]);
});

test("weekly member route loads verification only after the locked-member branch", () => {
  const route = readFileSync(resolve("app/member/weekly/page.tsx"), "utf8");
  const lockedBranch = route.indexOf('if (payload.mode === "locked")');
  const rollingLoad = route.indexOf("await getWeeklyRollingVerification(payload.slots)");
  assert.ok(lockedBranch >= 0 && rollingLoad > lockedBranch);
  assert.match(route, /rollingVerification=\{rollingVerification\}/);

  const loader = readFileSync(resolve("lib/accuracy/get-weekly-rolling-verification.ts"), "utf8");
  assert.match(loader, /getWeeklyRollingActuals\(slots, results, now\)/);

  const panel = readFileSync(resolve("components/member/WeeklyRollingVerificationPanel.tsx"), "utf8");
  assert.match(panel, /未来日期、休市日和事后补写内容不计分/);
  assert.match(panel, /原始预测永久保留，不按结果倒改/);
});
