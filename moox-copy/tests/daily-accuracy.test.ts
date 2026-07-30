import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  buildHitMissResult,
  buildManualReviewResult,
  buildVoidResult,
  canEnterAccuracyPool,
  computeDailyAccuracyStats,
  computeReturnPct,
  computeVerificationDashboardStats,
  directionFromReturnPct,
  isLongTermResearchKind,
  isPublishedBeforeCutoff,
  looksLikeFuturesRoll,
  verdictFromDirections,
} from "../lib/verification/daily-rules.ts";
import type { DailyForecastRecord, DailyVerificationResult } from "../types/daily-accuracy.ts";

function baseRecord(overrides: Partial<DailyForecastRecord> = {}): DailyForecastRecord {
  return {
    id: "df-1",
    forecastDate: "2026-07-28",
    assetName: "比特币",
    symbol: "BTC",
    market: "CRYPTO",
    direction: "DOWN",
    directionLabel: "下跌",
    publishedAt: "2026-07-27T15:00:00.000Z",
    cutoffAt: "2026-07-27T16:00:00.000Z",
    status: "published",
    originalVersion: 1,
    source: "MoonX",
    quoteSymbol: "BTC-USD",
    createdAt: "2026-07-27T15:00:00.000Z",
    updatedAt: "2026-07-27T15:00:00.000Z",
    ...overrides,
  };
}

describe("daily accuracy direction rules", () => {
  test("UP prediction + UP actual = HIT", () => {
    const record = baseRecord({ direction: "UP", directionLabel: "上涨" });
    const result = buildHitMissResult({
      record,
      previousClose: 100,
      actualClose: 101.5,
      dataSource: "test",
    });
    assert.equal(result.verdict, "HIT");
    assert.equal(result.actualDirection, "UP");
  });

  test("DOWN prediction + DOWN actual = HIT", () => {
    const record = baseRecord({ direction: "DOWN", directionLabel: "下跌" });
    const result = buildHitMissResult({
      record,
      previousClose: 100,
      actualClose: 98.7,
      dataSource: "test",
    });
    assert.equal(result.verdict, "HIT");
    assert.equal(result.actualDirection, "DOWN");
    assert.ok(result.actualReturnPct < -1);
  });

  test("UP prediction + DOWN actual = MISS", () => {
    const record = baseRecord({ direction: "UP", directionLabel: "上涨" });
    const result = buildHitMissResult({
      record,
      previousClose: 100,
      actualClose: 99,
      dataSource: "test",
    });
    assert.equal(result.verdict, "MISS");
  });

  test("return within ±0.10% is FLAT", () => {
    assert.equal(directionFromReturnPct(0.05), "FLAT");
    assert.equal(directionFromReturnPct(-0.05), "FLAT");
    assert.equal(directionFromReturnPct(0.11), "UP");
    assert.equal(directionFromReturnPct(-0.11), "DOWN");
    assert.equal(verdictFromDirections("FLAT", "FLAT"), "HIT");
  });

  test("WTI continuous contract roll gap triggers manual review helper", () => {
    assert.equal(looksLikeFuturesRoll(80, 84.5, 84), true);
    assert.equal(looksLikeFuturesRoll(80, 80.2, 80.5), false);
    assert.equal(looksLikeFuturesRoll(80, 80.1, 87), true);
  });

  test("market closed / VOID excluded from accuracy", () => {
    const voided = buildVoidResult(baseRecord(), "休市，不计入准确率");
    assert.equal(voided.verdict, "VOID");
    const stats = computeDailyAccuracyStats([voided]);
    assert.equal(stats.verifiedCount, 0);
    assert.equal(stats.hitRate, null);
  });

  test("quote failure becomes MANUAL_REVIEW", () => {
    const r = buildManualReviewResult(baseRecord(), "行情获取失败");
    assert.equal(r.verdict, "MANUAL_REVIEW");
    const stats = computeDailyAccuracyStats([r]);
    assert.equal(stats.verifiedCount, 0);
    assert.equal(stats.manualReviewCount, 1);
  });

  test("duplicate verification prevented by forecastId uniqueness contract", () => {
    const a = buildHitMissResult({
      record: baseRecord(),
      previousClose: 100,
      actualClose: 99,
      dataSource: "test",
    });
    const b = buildHitMissResult({
      record: baseRecord(),
      previousClose: 100,
      actualClose: 98,
      dataSource: "test",
    });
    assert.equal(a.forecastId, b.forecastId);
    // store layer keeps first only — simulate map upsert
    const map = new Map<string, DailyVerificationResult>();
    map.set(a.forecastId, a);
    if (!map.has(b.forecastId)) map.set(b.forecastId, b);
    assert.equal(map.get(a.forecastId)?.actualClose, 99);
  });

  test("published after cutoff is invalid for accuracy pool", () => {
    const late = baseRecord({
      publishedAt: "2026-07-28T01:00:00.000Z",
      cutoffAt: "2026-07-28T00:00:00.000Z",
    });
    assert.equal(isPublishedBeforeCutoff(late), false);
    assert.equal(canEnterAccuracyPool(late), false);
  });

  test("draft cannot enter accuracy", () => {
    assert.equal(canEnterAccuracyPool(baseRecord({ status: "draft" })), false);
  });

  test("long-term research kinds are rejected for daily accuracy", () => {
    assert.equal(isLongTermResearchKind("annual-equity"), true);
    assert.equal(isLongTermResearchKind("weekly-note"), true);
    assert.equal(isLongTermResearchKind("daily-btc"), false);
  });

  test("hit rate excludes VOID and MANUAL_REVIEW", () => {
    const hit = buildHitMissResult({
      record: baseRecord({ id: "h", direction: "UP", directionLabel: "上涨" }),
      previousClose: 100,
      actualClose: 102,
      dataSource: "t",
    });
    const miss = buildHitMissResult({
      record: baseRecord({ id: "m", direction: "UP", directionLabel: "上涨" }),
      previousClose: 100,
      actualClose: 99,
      dataSource: "t",
    });
    const voided = buildVoidResult(baseRecord({ id: "v" }), "休市");
    const manual = buildManualReviewResult(baseRecord({ id: "x" }), "fail");
    const stats = computeDailyAccuracyStats([hit, miss, voided, manual]);
    assert.equal(stats.hitCount, 1);
    assert.equal(stats.missCount, 1);
    assert.equal(stats.hitRate, 0.5);
    assert.equal(stats.voidCount, 1);
    assert.equal(stats.manualReviewCount, 1);
  });

  test("system test marked VOID does not inflate hit rate", () => {
    const hit = buildHitMissResult({
      record: baseRecord({ id: "sys", isSystemTest: true, direction: "UP", directionLabel: "上涨" }),
      previousClose: 100,
      actualClose: 102,
      dataSource: "t",
    });
    hit.isSystemTest = true;
    hit.verdict = "VOID";
    hit.verdictLabel = "不计入统计";
    const stats = computeDailyAccuracyStats([hit]);
    assert.equal(stats.hitRate, null);
  });

  test("computeReturnPct matches close-to-previous-close formula", () => {
    assert.equal(Number(computeReturnPct(100, 98.7).toFixed(2)), -1.3);
  });

  test("empty results show no fake accuracy", () => {
    const stats = computeDailyAccuracyStats([]);
    assert.equal(stats.hitRate, null);
    assert.equal(stats.verifiedCount, 0);
  });

  test("dashboard stats match forecast/result pairs", () => {
    const published = baseRecord({ id: "p1", status: "published" });
    const pending = baseRecord({ id: "p2", status: "published", forecastDate: "2026-07-29" });
    const invalid = baseRecord({
      id: "p3",
      status: "invalid",
      publishedAt: "2026-07-28T01:00:00+08:00",
      cutoffAt: "2026-07-28T00:00:00+08:00",
    });
    const hit = buildHitMissResult({
      record: published,
      previousClose: 100,
      actualClose: 101,
      dataSource: "t",
    });
    const voided = buildVoidResult(invalid, "late");
    const stats = computeVerificationDashboardStats([published, pending, invalid], [hit, voided]);
    assert.equal(stats.totalForecasts, 3);
    assert.equal(stats.verifiedCount, 1);
    assert.equal(stats.pendingCount, 1);
    assert.equal(stats.voidCount, 1);
    assert.equal(stats.invalidCount, 1);
    assert.equal(stats.hitCount + stats.missCount + stats.voidCount + stats.manualReviewCount + stats.pendingCount, 3);
  });
});
