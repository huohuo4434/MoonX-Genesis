import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregateTechnicalSignals,
  calculateTechnicalSignalStrength,
  calculateTechnicalVerificationStats,
  getTechnicalTimeframeWeight,
} from "@/lib/analysis/technical-signals";
import { technicalSignalMessageKeys } from "@/lib/formatters/technical-signal";
import { formatLocalizedDate } from "@/lib/utils";
import type { TechnicalSignal } from "@/types/technical-signal";

function signal(overrides: Partial<TechnicalSignal> = {}): TechnicalSignal {
  return {
    id: "btc-4h-test",
    assetId: "bitcoin",
    symbol: "BTC",
    signalType: "macd_bearish_divergence",
    direction: "bearish",
    timeframe: "4h",
    horizon: "short_term",
    detectedAt: "2026-07-27T08:00:00+08:00",
    status: "warning",
    originalStatus: "observing",
    statusHistory: [{ status: "observing", changedAt: "2026-07-27T08:00:00+08:00", note: { zhCN: "观察", zhTW: "觀察", en: "Observing" } }],
    title: { zhCN: "测试", zhTW: "測試", en: "Test" },
    summary: { zhCN: "测试", zhTW: "測試", en: "Test" },
    evidence: [],
    confirmationConditions: [{ zhCN: "确认", zhTW: "確認", en: "Confirm" }],
    invalidationConditions: [{ zhCN: "失效", zhTW: "失效", en: "Invalidate" }],
    framework: "technical_structure",
    sourceType: "manual_research",
    createdAt: "2026-07-27T08:00:00+08:00",
    updatedAt: "2026-07-27T08:00:00+08:00",
    ...overrides,
  };
}

test("uses editorial timeframe weights", () => {
  assert.equal(getTechnicalTimeframeWeight("5m"), 0.35);
  assert.equal(getTechnicalTimeframeWeight("1d"), 1);
  assert.equal(getTechnicalTimeframeWeight("1w"), 1.1);
});

test("applies observing and warning strength caps", () => {
  const maximum = { clarity: 25, priceConfirmation: 20, indicatorConfluence: 15, timeframeConfluence: 10, riskCompleteness: 10, timeframe: "1w" as const };
  assert.equal(calculateTechnicalSignalStrength({ ...maximum, status: "observing" }), 55);
  assert.equal(calculateTechnicalSignalStrength({ ...maximum, status: "warning" }), 70);
  assert.equal(calculateTechnicalSignalStrength({ ...maximum, status: "confirmed" }), 85);
});

test("identifies lower and higher timeframe conflicts", () => {
  const aggregate = aggregateTechnicalSignals([
    signal({ signalStrength: 65 }),
    signal({ id: "btc-1d", direction: "bullish", timeframe: "1d", horizon: "medium_term", signalStrength: 80 }),
  ]);
  assert.equal(aggregate.shortTermDirection, "bearish");
  assert.equal(aggregate.mediumTermDirection, "bullish");
  assert.equal(aggregate.conflictLevel, "high");
});

test("returns empty verification statistics without a win-rate claim", () => {
  assert.deepEqual(calculateTechnicalVerificationStats([]), {
    totalSignals: 0,
    completedVerifications: 0,
    hits: 0,
    partials: 0,
    misses: 0,
    invalidated: 0,
    byTimeframe: {},
    byType: {},
  });
});

test("keeps mapping and dates locale-aware", () => {
  assert.equal(technicalSignalMessageKeys.status("warning"), "technical.status.warning");
  assert.equal(formatLocalizedDate("2026-07-27T08:00:00+08:00", "zh-CN"), "2026年7月27日");
  assert.match(formatLocalizedDate("2026-07-27T08:00:00+08:00", "en"), /Jul 27, 2026/);
});
