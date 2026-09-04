import assert from "node:assert/strict";
import test from "node:test";
import { resolveForecastAuthorityContext } from "@/lib/trading-signals/forecast-authority-context-core";
import type { PredictionStrategyPlan } from "@/types/prediction-auto-trader";

const leg = (confidence: number) => ({
  id: "forecast",
  periodStart: "2026-08-01",
  periodEnd: "2026-08-31",
  direction: "上涨",
  path: "震荡上涨",
  confidence,
  sourceLabel: "六爻正式预测",
  status: "LOCKED",
  version: 1,
  publishedAt: "2026-07-31T00:00:00.000Z",
  lockedAt: "2026-07-31T00:01:00.000Z",
});

const plan = (overrides: Partial<PredictionStrategyPlan> = {}): PredictionStrategyPlan => ({
  symbol: "INTC",
  tradeSymbol: "INTCUSDT",
  assetId: "intel",
  assetName: "英特尔",
  monthlyForecast: leg(66),
  weeklyForecast: null,
  dailyForecast: null,
  monthlyDirection: "LONG",
  weeklyDirection: "NEUTRAL",
  dailyDirection: "NEUTRAL",
  setup: "MISSING_FORECAST",
  confidence: 0,
  reason: "缺少正式周预测",
  pointGuidance: null,
  ...overrides,
});

test("POSITION aligns direction, confidence and setup with the monthly fallback", () => {
  assert.deepEqual(resolveForecastAuthorityContext(plan(), "POSITION"), {
    direction: "LONG",
    confidence: 66,
    setup: "BUY_DIP",
    sourceHorizon: "MONTH",
  });
});

test("INTRADAY and SWING still fail closed without a weekly direction", () => {
  for (const strategyType of ["INTRADAY", "SWING"] as const) {
    assert.deepEqual(resolveForecastAuthorityContext(plan(), strategyType), {
      direction: "NEUTRAL",
      confidence: 0,
      setup: "MISSING_FORECAST",
      sourceHorizon: null,
    });
  }
});

test("POSITION owns MONTH while SWING keeps WEEK, even when they disagree", () => {
  assert.deepEqual(resolveForecastAuthorityContext(plan({
    weeklyForecast: leg(72),
    weeklyDirection: "SHORT",
  }), "POSITION"), {
    direction: "LONG",
    confidence: 66,
    setup: "BUY_DIP",
    sourceHorizon: "MONTH",
  });
  assert.equal(resolveForecastAuthorityContext(plan({ weeklyForecast: leg(72), weeklyDirection: "SHORT" }), "SWING").direction, "SHORT");
  assert.equal(resolveForecastAuthorityContext(plan({ monthlyForecast: null, weeklyForecast: leg(72), weeklyDirection: "SHORT" }), "POSITION").direction, "NEUTRAL");
  assert.equal(resolveForecastAuthorityContext(plan({ monthlyDirection: "NEUTRAL", weeklyForecast: leg(72), weeklyDirection: "SHORT" }), "POSITION").setup, "HOLD");
});

test("a direction without its supplied forecast leg never gains executable setup metadata", () => {
  assert.deepEqual(resolveForecastAuthorityContext(plan({ monthlyForecast: null }), "POSITION"), {
    direction: "NEUTRAL",
    confidence: 0,
    setup: "MISSING_FORECAST",
    sourceHorizon: null,
  });
});
