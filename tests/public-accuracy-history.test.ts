import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { getChinaDateKey } from "../lib/date/china-date.ts";
import {
  computePublicAccuracyStats,
  filterPublicAccuracyHistory,
  isPublicCountableVerdict,
  isPublicFinalVerdict,
  publicSourceAccuracyBreakdown,
  selectCanonicalDailyForecasts,
} from "../lib/accuracy/public-history-filter.ts";
import type { DailyForecastRecord, DailyVerificationResult } from "../types/daily-accuracy.ts";

function forecast(overrides: Partial<DailyForecastRecord> = {}): DailyForecastRecord {
  return {
    id: "df-1",
    forecastDate: "2026-08-02",
    assetName: "比特币",
    symbol: "BTC",
    market: "CRYPTO",
    direction: "UP",
    directionLabel: "上涨",
    publishedAt: "2026-08-01T15:00:00.000Z",
    cutoffAt: "2026-08-01T16:00:00.000Z",
    status: "verified",
    originalVersion: 1,
    source: "MoonX",
    quoteSymbol: "BTC-USD",
    createdAt: "2026-08-01T15:00:00.000Z",
    updatedAt: "2026-08-01T15:00:00.000Z",
    ...overrides,
  };
}

function result(overrides: Partial<DailyVerificationResult> = {}): DailyVerificationResult {
  return {
    forecastId: "df-1",
    forecastDate: "2026-08-02",
    assetName: "比特币",
    symbol: "BTC",
    previousClose: 100,
    actualClose: 102,
    actualReturnPct: 2,
    actualDirection: "UP",
    verdict: "HIT",
    verdictLabel: "命中",
    verifiedAt: "2026-08-03T00:15:00.000Z",
    dataSource: "test",
    ...overrides,
  };
}

/** Fixed "now" = Beijing 2026-08-03 10:00 → todayKey 2026-08-03 */
const NOW = new Date("2026-08-03T02:00:00.000Z");

describe("china date key", () => {
  test("getChinaDateKey uses Asia/Shanghai", () => {
    assert.equal(getChinaDateKey(NOW), "2026-08-03");
    // Just before Beijing midnight still previous day
    assert.equal(getChinaDateKey(new Date("2026-08-02T15:59:00.000Z")), "2026-08-02");
    // Beijing 00:00 = UTC previous day 16:00
    assert.equal(getChinaDateKey(new Date("2026-08-02T16:00:00.000Z")), "2026-08-03");
  });
});

describe("public accuracy history filter", () => {
  test("a late higher version cannot replace the last pre-cutoff locked version", () => {
    const locked = forecast({ id: "locked-v1", originalVersion: 1, publishedAt: "2026-08-01T15:00:00.000Z" });
    const hindsight = forecast({ id: "late-v2", originalVersion: 2, publishedAt: "2026-08-01T16:00:01.000Z" });
    assert.deepEqual(selectCanonicalDailyForecasts([locked, hindsight]).map((row) => row.id), ["locked-v1"]);
  });

  test("direction accuracy stays independent when the path verdict misses", () => {
    const items = filterPublicAccuracyHistory({
      forecasts: [forecast({ direction: "UP", directionLabel: "上涨" })],
      results: [result({ verdict: "MISS", verdictLabel: "未命中", directionVerdict: "FULL_HIT", actualDirection: "UP", validationMode: "FULL_PATH" })],
      now: NOW,
    });
    const stats = computePublicAccuracyStats(items, NOW);
    assert.equal(stats.weightedHitRate, 0);
    assert.equal(stats.pathHitRate, 0);
    assert.equal(stats.directionHitRate, 1);
  });

  test("an explicitly verified direction remains countable when only the path is unverifiable", () => {
    const items = filterPublicAccuracyHistory({
      forecasts: [forecast({ direction: "UP", directionLabel: "上涨" })],
      results: [result({ verdict: "UNVERIFIABLE", directionVerdict: "FULL_HIT", actualDirection: "UP" })],
      now: NOW,
    });
    const stats = computePublicAccuracyStats(items, NOW);
    assert.equal(stats.verifiedCount, 0);
    assert.equal(stats.pathHitRate, null);
    assert.equal(stats.directionHitRate, 1);
  });

  test("an orphan result without its exact locked forecast is never scored publicly", () => {
    const items = filterPublicAccuracyHistory({
      forecasts: [],
      results: [result({ forecastId: "orphan" })],
      now: NOW,
    });
    assert.equal(items.length, 0);
  });

  test("source breakdown uses the same partial-hit weight instead of treating partial as full", () => {
    const rows = filterPublicAccuracyHistory({
      forecasts: [
        forecast({ id: "partial", forecastDate: "2026-08-02" }),
        forecast({ id: "miss", forecastDate: "2026-08-01" }),
      ],
      results: [
        result({ forecastId: "partial", forecastDate: "2026-08-02", verdict: "PARTIAL_HIT" }),
        result({ forecastId: "miss", forecastDate: "2026-08-01", verdict: "MISS" }),
      ],
      now: NOW,
    });
    const source = publicSourceAccuracyBreakdown(rows)[0]!;
    assert.equal(source.partial, 1);
    assert.equal(source.miss, 1);
    assert.equal(source.hitRate, 0.25);
  });

  test("keeps one canonical version per symbol and date while retaining old rows outside the public projection", () => {
    const v1 = forecast({ id: "df-v1", originalVersion: 1, publishedAt: "2026-08-01T12:00:00.000Z" });
    const v2 = forecast({ id: "df-v2", originalVersion: 2, publishedAt: "2026-08-01T15:00:00.000Z" });
    const invalidV3 = forecast({ id: "df-v3", originalVersion: 3, status: "invalid", publishedAt: "2026-08-01T15:30:00.000Z" });
    assert.deepEqual(selectCanonicalDailyForecasts([v1, invalidV3, v2]).map((row) => row.id), ["df-v2"]);
    const items = filterPublicAccuracyHistory({
      forecasts: [v1, v2, invalidV3],
      results: [
        result({ forecastId: "df-v1", verdict: "MISS", verdictLabel: "未命中" }),
        result({ forecastId: "df-v2", verdict: "HIT", verdictLabel: "命中" }),
        result({ forecastId: "df-v3", verdict: "MISS", verdictLabel: "未命中" }),
      ],
      now: NOW,
    });
    assert.deepEqual(items.map((item) => [item.forecastId, item.verdict]), [["df-v2", "HIT"]]);
  });

  test("1-4: today pending never visible for any audience (role-agnostic filter)", () => {
    const todayPending = forecast({
      id: "today",
      forecastDate: "2026-08-03",
      direction: "UP",
      directionLabel: "上涨",
      status: "published",
    });
    // No verification result → nothing public
    const items = filterPublicAccuracyHistory({
      forecasts: [todayPending],
      results: [],
      now: NOW,
    });
    assert.equal(items.length, 0);
    assert.ok(!items.some((i) => i.forecastDate === "2026-08-03"));
    assert.ok(!JSON.stringify(items).includes("待验证"));
  });

  test("5: yesterday verified HIT is visible", () => {
    const items = filterPublicAccuracyHistory({
      forecasts: [forecast()],
      results: [result()],
      now: NOW,
    });
    assert.equal(items.length, 1);
    assert.equal(items[0]!.forecastDate, "2026-08-02");
    assert.equal(items[0]!.verdict, "HIT");
    assert.equal(items[0]!.predictedDirection, "上涨");
  });

  test("6: yesterday without verification is not visible", () => {
    const items = filterPublicAccuracyHistory({
      forecasts: [forecast({ status: "published" })],
      results: [],
      now: NOW,
    });
    assert.equal(items.length, 0);
  });

  test("7: tomorrow prediction is not visible", () => {
    const items = filterPublicAccuracyHistory({
      forecasts: [
        forecast({
          id: "tmr",
          forecastDate: "2026-08-04",
          status: "published",
        }),
      ],
      results: [
        result({
          forecastId: "tmr",
          forecastDate: "2026-08-04",
          verdict: "HIT",
          verifiedAt: "2026-08-05T00:00:00.000Z",
        }),
      ],
      now: NOW,
    });
    assert.equal(items.length, 0);
  });

  test("same-day terminal verification is visible only after verification has completed", () => {
    const items = filterPublicAccuracyHistory({
      forecasts: [forecast({ id: "t", forecastDate: "2026-08-03", status: "verified" })],
      results: [
        result({
          forecastId: "t",
          forecastDate: "2026-08-03",
          verdict: "HIT",
          verifiedAt: "2026-08-03T01:00:00.000Z", // 09:00 Beijing, before NOW=10:00
        }),
      ],
      now: NOW,
    });
    assert.equal(items.length, 1);
  });

  test("same-day terminal verification never leaks before verifiedAt", () => {
    const items = filterPublicAccuracyHistory({
      forecasts: [forecast({ id: "future-verify", forecastDate: "2026-08-03", status: "verified" })],
      results: [
        result({
          forecastId: "future-verify",
          forecastDate: "2026-08-03",
          verdict: "HIT",
          verifiedAt: "2026-08-03T03:00:00.000Z", // 11:00 Beijing, after NOW=10:00
        }),
      ],
      now: NOW,
    });
    assert.equal(items.length, 0);
  });

  test("8-9: PENDING and DRAFT do not enter accuracy", () => {
    const draft = forecast({ id: "draft", status: "draft", forecastDate: "2026-08-01" });
    // Even if a stray result exists for draft, draft status excludes it
    const items = filterPublicAccuracyHistory({
      forecasts: [draft],
      results: [
        result({
          forecastId: "draft",
          forecastDate: "2026-08-01",
          verdict: "HIT",
        }),
      ],
      now: NOW,
    });
    assert.equal(items.length, 0);

    const statsEmpty = computePublicAccuracyStats([]);
    assert.equal(statsEmpty.pendingCount, 0);
    assert.equal(statsEmpty.verifiedCount, 0);
  });

  test("10-11: HIT and MISS participate in accuracy", () => {
    const items = filterPublicAccuracyHistory({
      forecasts: [
        forecast({ id: "h", forecastDate: "2026-08-02" }),
        forecast({ id: "m", forecastDate: "2026-08-01", direction: "DOWN", directionLabel: "下跌" }),
      ],
      results: [
        result({ forecastId: "h", forecastDate: "2026-08-02", verdict: "HIT", verdictLabel: "命中" }),
        result({
          forecastId: "m",
          forecastDate: "2026-08-01",
          verdict: "MISS",
          verdictLabel: "未命中",
          actualDirection: "UP",
        }),
      ],
      now: NOW,
    });
    assert.equal(items.length, 2);
    const stats = computePublicAccuracyStats(items, NOW);
    assert.equal(stats.hitCount, 1);
    assert.equal(stats.missCount, 1);
    assert.equal(stats.verifiedCount, 2);
    assert.equal(stats.hitRate, 0.5);
    assert.ok(isPublicCountableVerdict("HIT"));
    assert.ok(isPublicCountableVerdict("MISS"));
    assert.equal(isPublicCountableVerdict("VOID"), false);
  });

  test("VOID never public on history page", () => {
    const items = filterPublicAccuracyHistory({
      forecasts: [forecast({ id: "v", forecastDate: "2026-08-01" })],
      results: [
        result({
          forecastId: "v",
          forecastDate: "2026-08-01",
          verdict: "VOID",
          verdictLabel: "不计入统计",
        }),
      ],
      now: NOW,
    });
    assert.equal(items.length, 0);
    assert.equal(isPublicFinalVerdict("VOID"), false);
    assert.equal(isPublicCountableVerdict("VOID"), false);
  });

  test("MANUAL_REVIEW never public", () => {
    const items = filterPublicAccuracyHistory({
      forecasts: [forecast({ id: "mr", forecastDate: "2026-08-01" })],
      results: [
        result({
          forecastId: "mr",
          forecastDate: "2026-08-01",
          verdict: "MANUAL_REVIEW",
          verdictLabel: "待人工核对",
        }),
      ],
      now: NOW,
    });
    assert.equal(items.length, 0);
  });

  test("12: publication follows verifiedAt, not the Beijing calendar rollover", () => {
    const beforeMidnight = new Date("2026-08-02T15:59:00.000Z"); // still 08-02 BJ
    const afterMidnightBeforeVerification = new Date("2026-08-02T16:00:00.000Z"); // 08-03 00:00 BJ
    const afterVerification = new Date("2026-08-03T00:16:00.000Z"); // 08-03 08:16 BJ
    const f = forecast({ id: "prev", forecastDate: "2026-08-02" });
    const r = result({
      forecastId: "prev",
      forecastDate: "2026-08-02",
      verifiedAt: "2026-08-03T00:15:00.000Z",
    });

    assert.equal(
      filterPublicAccuracyHistory({ forecasts: [f], results: [r], now: beforeMidnight }).length,
      0
    );
    assert.equal(
      filterPublicAccuracyHistory({ forecasts: [f], results: [r], now: afterMidnightBeforeVerification }).length,
      0
    );
    assert.equal(
      filterPublicAccuracyHistory({ forecasts: [f], results: [r], now: afterVerification }).length,
      1
    );
  });

  test("13: API-shaped payload never contains today prediction body", () => {
    const todayForecast = forecast({
      id: "today-body",
      forecastDate: "2026-08-03",
      directionLabel: "上涨",
      summary: "今日秘密路径与失效位",
      probability: 88,
      status: "published",
    });
    const items = filterPublicAccuracyHistory({
      forecasts: [todayForecast, forecast()],
      results: [result()],
      now: NOW,
    });
    const json = JSON.stringify(items);
    assert.ok(!json.includes("今日秘密"));
    assert.ok(!json.includes("today-body"));
    assert.equal(items.every((i) => i.forecastDate < "2026-08-03"), true);
    assert.equal(items.some((i) => i.forecastDate === "2026-08-03"), false);
  });

  test("14: no pending card data in public items", () => {
    const items = filterPublicAccuracyHistory({
      forecasts: [
        forecast({ id: "p", forecastDate: "2026-08-03", status: "published" }),
        forecast(),
      ],
      results: [result()],
      now: NOW,
    });
    assert.equal(
      items.some((i) => i.verdictLabel === "待验证" || !i.verifiedAt),
      false
    );
  });

  test("15: stats count matches visible verified records", () => {
    const items = filterPublicAccuracyHistory({
      forecasts: [
        forecast({ id: "a", forecastDate: "2026-08-02" }),
        forecast({ id: "b", forecastDate: "2026-08-01" }),
        forecast({ id: "today", forecastDate: "2026-08-03", status: "published" }),
      ],
      results: [
        result({ forecastId: "a", forecastDate: "2026-08-02", verdict: "HIT" }),
        result({
          forecastId: "b",
          forecastDate: "2026-08-01",
          verdict: "MISS",
          verdictLabel: "未命中",
        }),
      ],
      now: NOW,
    });
    const stats = computePublicAccuracyStats(items, NOW);
    assert.equal(items.length, 2);
    assert.equal(stats.verifiedCount, 2);
    assert.equal(stats.hitCount + stats.missCount, stats.verifiedCount);
    assert.equal(stats.pendingCount, 0);
  });

  test("missing verifiedAt excludes record", () => {
    const items = filterPublicAccuracyHistory({
      forecasts: [forecast()],
      results: [result({ verifiedAt: "" })],
      now: NOW,
    });
    assert.equal(items.length, 0);
  });
});
