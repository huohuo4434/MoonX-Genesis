import test from "node:test";
import assert from "node:assert/strict";
import { buildMemberDailyReviewReports } from "@/lib/member-review/daily-review-report";
import { filterPublicAccuracyHistory } from "@/lib/accuracy/public-history-filter";
import type { DailyForecastRecord, DailyVerificationResult } from "@/types/daily-accuracy";
import type { DailyReviewRecord } from "@/types/automation";
import { buildPublicFooterColumns, MEMBER_RESEARCH_NAV } from "@/config/member-channel-navigation";

function forecast(input: Partial<DailyForecastRecord> & Pick<DailyForecastRecord, "id" | "symbol" | "assetName" | "market">): DailyForecastRecord {
  return {
    forecastDate: "2026-08-27",
    direction: "UP",
    directionLabel: "上涨",
    predictedPattern: "UP",
    predictedPatternLabel: "上涨",
    expectedPath: ["周内偏强"],
    probability: 68,
    summary: "锁定周方向偏强。",
    publishedAt: "2026-08-26T10:00:00.000Z",
    cutoffAt: "2026-08-27T13:30:00.000Z",
    status: "verified",
    originalVersion: 1,
    source: "MOOX",
    quoteSymbol: input.symbol,
    createdAt: "2026-08-26T10:00:00.000Z",
    updatedAt: "2026-08-26T10:00:00.000Z",
    sourceForecastId: "weekly-1",
    sourcePeriodStart: "2026-08-24",
    sourcePeriodEnd: "2026-08-30",
    sourcePrimaryHexagram: "火天大有",
    sourceChangedHexagram: "离为火",
    sourceInterpretation: "财爻得势，但后半周需防冲高回落。",
    sourceWeeklyDirection: "先涨后跌",
    ...input,
  };
}

function result(input: Partial<DailyVerificationResult> & Pick<DailyVerificationResult, "forecastId" | "symbol" | "assetName" | "verdict">): DailyVerificationResult {
  return {
    forecastDate: "2026-08-27",
    previousClose: 100,
    actualOpen: 100,
    actualHigh: 104,
    actualLow: 99,
    actualClose: 103,
    actualReturnPct: 3,
    actualDirection: "UP",
    actualPattern: "UP",
    actualPatternLabel: "上涨",
    verdictLabel: input.verdict === "MISS" ? "未命中" : input.verdict === "PARTIAL_HIT" ? "部分命中" : "完全命中",
    verifiedAt: "2026-08-28T01:00:00.000Z",
    dataSource: "test",
    ...input,
  };
}

function review(f: DailyForecastRecord, r: DailyVerificationResult): DailyReviewRecord {
  return {
    id: `review-${f.id}`,
    forecastId: f.id,
    assetName: f.assetName,
    symbol: f.symbol,
    forecastDate: f.forecastDate,
    originalForecast: {
      direction: f.direction,
      directionLabel: f.directionLabel,
      confidence: f.probability,
      summary: f.summary,
      sourceForecastId: f.sourceForecastId,
      sourcePeriodStart: f.sourcePeriodStart,
      sourcePeriodEnd: f.sourcePeriodEnd,
      primaryHexagram: f.sourcePrimaryHexagram,
      changedHexagram: f.sourceChangedHexagram,
      sourceInterpretation: f.sourceInterpretation,
      weeklyDirection: f.sourceWeeklyDirection,
      version: f.originalVersion,
    },
    actualResult: { returnPct: r.actualReturnPct, actualDirection: r.actualDirection, close: r.actualClose, previousClose: r.previousClose },
    directionVerdict: r.verdict,
    pathVerdict: r.verdict === "MISS" ? "TREND_DOWN" : "TREND_UP",
    pathVerdictLabel: r.verdict === "MISS" ? "单边下跌" : "单边上涨",
    whatWasCorrect: r.verdict === "MISS" ? "主要方向未命中。" : "方向命中。",
    whatWasWrong: r.verdict === "MISS" ? "实际运行顺序与锁定预测不同。" : "关键位仍需核对。",
    interpretationBiases: [],
    marketOverrides: [],
    lessonSummary: "下一次先检查周内阶段，再确认关键位。",
    futureCaution: "不机械反向。",
    confidenceAdjustment: r.verdict === "MISS" ? -3 : 1,
    similarCaseKey: "test",
    createdAt: "2026-08-28T01:01:00.000Z",
  };
}

test("member daily review groups indices, equities, crypto and commodities with a weighted score", () => {
  const rows = [
    forecast({ id: "ndx", symbol: "NDX", assetName: "纳斯达克100", market: "US" }),
    forecast({ id: "sndk", symbol: "SNDK", assetName: "闪迪", market: "US", visibility: "MEMBER" }),
    forecast({ id: "hype", symbol: "HYPE", assetName: "HYPE", market: "CRYPTO", visibility: "MEMBER" }),
    forecast({ id: "silver", symbol: "SILVER", assetName: "白银", market: "US_FUTURES" }),
  ];
  const results = [
    result({ forecastId: "ndx", symbol: "NDX", assetName: "纳斯达克100", verdict: "FULL_HIT" }),
    result({ forecastId: "sndk", symbol: "SNDK", assetName: "闪迪", verdict: "PARTIAL_HIT" }),
    result({ forecastId: "hype", symbol: "HYPE", assetName: "HYPE", verdict: "MISS", actualDirection: "DOWN", actualPattern: "DOWN", actualPatternLabel: "下跌", actualReturnPct: -3, actualClose: 97 }),
  ];
  const reviews = results.map((r) => review(rows.find((f) => f.id === r.forecastId)!, r));
  const reports = buildMemberDailyReviewReports({ forecasts: rows, results, reviews, now: new Date("2026-08-28T04:00:00.000Z") });
  assert.equal(reports.length, 1);
  assert.deepEqual(new Set(reports[0]!.items.map((item) => item.category)), new Set(["INDEX", "EQUITY", "CRYPTO", "COMMODITY"]));
  assert.equal(reports[0]!.summary.full, 1);
  assert.equal(reports[0]!.summary.partial, 1);
  assert.equal(reports[0]!.summary.miss, 1);
  assert.equal(reports[0]!.summary.waiting, 1);
  assert.equal(Math.round(reports[0]!.summary.weightedMatchPct!), 50);
  assert.equal(reports[0]!.summary.problemsFound, 2);
  assert.equal(reports[0]!.summary.correctionsRecorded, 2);
  assert.match(reports[0]!.problemHeadline, /已识别 2 项预测问题/);
  const miss = reports[0]!.items.find((item) => item.symbol === "HYPE")!;
  assert.equal(miss.finding.issueType, "DIRECTION");
  assert.match(miss.finding.confirmedProblem, /方向结论已经确认没有兑现/);
  assert.match(miss.finding.interpretationFinding, /不能据此直接断言卦象本身错误/);
});

test("misses request future evidence without rewriting the original result", () => {
  const row = forecast({ id: "mu", symbol: "MU", assetName: "美光", market: "US", visibility: "MEMBER", sourcePrimaryHexagram: null });
  const actual = result({ forecastId: row.id, symbol: row.symbol, assetName: row.assetName, verdict: "MISS", actualDirection: "DOWN", actualReturnPct: -2, actualClose: 98 });
  const report = buildMemberDailyReviewReports({ forecasts: [row], results: [actual], reviews: [review(row, actual)], now: new Date("2026-08-28T04:00:00.000Z") })[0]!;
  const item = report.items[0]!;
  assert.equal(item.supplementStatus, "NEEDED");
  assert.match(item.supplementRequest!, /下一周期完整周卦/);
  assert.match(item.supplementRequest!, /不回写本日结果/);
  assert.equal(item.finding.issueType, "EVIDENCE_GAP");
  assert.match(item.finding.interpretationFinding, /不能准确归因到哪一条六爻关系/);
});

test("a partial hit is presented as a path interpretation issue rather than a failed hexagram", () => {
  const row = forecast({ id: "sndk-partial", symbol: "SNDK", assetName: "闪迪", market: "US", predictedPattern: "UP_THEN_DOWN", predictedPatternLabel: "先涨后跌" });
  const actual = result({ forecastId: row.id, symbol: row.symbol, assetName: row.assetName, verdict: "PARTIAL_HIT", actualPattern: "UP", actualPatternLabel: "上涨" });
  const report = buildMemberDailyReviewReports({ forecasts: [row], results: [actual], reviews: [review(row, actual)], now: new Date("2026-08-28T04:00:00.000Z") })[0]!;
  assert.equal(report.items[0]!.finding.issueType, "PATH_TIMING");
  assert.match(report.items[0]!.finding.issueLabel, /路径或转折时点/);
  assert.match(report.items[0]!.finding.interpretationFinding, /周卦主方向暂不推翻/);
});

test("waiting samples do not pretend that a prediction problem has been identified", () => {
  const row = forecast({ id: "waiting", symbol: "SILVER", assetName: "白银", market: "US_FUTURES" });
  const report = buildMemberDailyReviewReports({ forecasts: [row], results: [], reviews: [], now: new Date("2026-08-28T04:00:00.000Z") })[0]!;
  assert.equal(report.items[0]!.finding.issueType, "PENDING");
  assert.equal(report.summary.problemsFound, 0);
  assert.match(report.problemHeadline, /暂不事后修改预测/);
});

test("a newer supplement is visible while the verified historical version remains selected", () => {
  const v1 = forecast({ id: "intel-v1", symbol: "INTC", assetName: "英特尔", market: "US", visibility: "MEMBER" });
  const v2 = forecast({ ...v1, id: "intel-v2", originalVersion: 2, publishedAt: "2026-08-28T02:00:00.000Z", status: "invalid", revisionReason: "new-material" });
  const actual = result({ forecastId: v1.id, symbol: v1.symbol, assetName: v1.assetName, verdict: "FULL_HIT" });
  const report = buildMemberDailyReviewReports({ forecasts: [v1, v2], results: [actual], reviews: [review(v1, actual)], now: new Date("2026-08-28T04:00:00.000Z") })[0]!;
  const item = report.items[0]!;
  assert.equal(item.forecastId, v1.id);
  assert.equal(item.revisionCount, 2);
  assert.equal(item.supplementStatus, "UPDATED");
  assert.match(item.supplementLabel!, /旧版和原验证结果继续保留/);
});

test("member-only focus verification never leaks into the public verification centre", () => {
  const publicForecast = forecast({ id: "public-ndx", symbol: "NDX", assetName: "纳斯达克100", market: "US", visibility: "PUBLIC" });
  const memberForecast = forecast({ id: "member-sndk", symbol: "SNDK", assetName: "闪迪", market: "US", visibility: "MEMBER" });
  const results = [
    result({ forecastId: publicForecast.id, symbol: publicForecast.symbol, assetName: publicForecast.assetName, verdict: "FULL_HIT" }),
    result({ forecastId: memberForecast.id, symbol: memberForecast.symbol, assetName: memberForecast.assetName, verdict: "MISS" }),
  ];
  const visible = filterPublicAccuracyHistory({ forecasts: [publicForecast, memberForecast], results, now: new Date("2026-08-28T04:00:00.000Z") });
  assert.deepEqual(visible.map((item) => item.symbol), ["NDX"]);
});

test("weekly review replaces daily review in the member menu and footer", () => {
  assert.ok(
    MEMBER_RESEARCH_NAV.some(
      (item) => item.href === "/member/weekly-review" && item.labelZh === "周预测复盘" && item.groupKey === "forecast"
    )
  );
  const memberFooter = buildPublicFooterColumns().find((column) => column.titleZh === "会员频道");
  assert.ok(memberFooter?.links.some((item) => item.href === "/member/weekly-review" && item.labelZh === "周预测复盘"));
  assert.ok(!MEMBER_RESEARCH_NAV.some((item) => item.href === "/member/daily-review"));
});
