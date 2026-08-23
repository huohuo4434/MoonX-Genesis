import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { forecastHorizonForStrategy } from "../lib/trading-signals/ai-plan-renewal-core";

const tradePlansSource = readFileSync("lib/trading-signals/ai-trade-plans.ts", "utf8");
const renewalSource = readFileSync("lib/trading-signals/ai-plan-renewal-core.ts", "utf8");

test("intraday plans use the locked weekly forecast as direction authority", () => {
  assert.equal(forecastHorizonForStrategy("INTRADAY"), "WEEK");

  const resolverStart = tradePlansSource.indexOf("function resolveLockedForecastBinding");
  const resolverEnd = tradePlansSource.indexOf("async function refreshForecastBoundPlan", resolverStart);
  assert.ok(resolverStart >= 0 && resolverEnd > resolverStart);
  const resolver = tradePlansSource.slice(resolverStart, resolverEnd);

  assert.match(resolver, /const horizon = forecastHorizonForStrategy\(strategyType\)/);
  assert.match(resolver, /horizon === "WEEK"[\s\S]*forecastPlan\.weeklyForecast/);
  assert.match(resolver, /horizon === "WEEK"[\s\S]*forecastPlan\.weeklyDirection/);
});

test("weekly authority does not bypass forecast, content, confidence, time, or execution gates", () => {
  const prepareStart = tradePlansSource.indexOf("export async function prepareAiTradePlanBeforeExecution");
  assert.ok(prepareStart >= 0);
  const prepare = tradePlansSource.slice(prepareStart);

  for (const gate of [
    "PLAN_DB_UNAVAILABLE",
    "LOCKED_FORECAST_UNAVAILABLE",
    "PLAN_CONTENT_INCOMPLETE",
    "PLANNING_CONFIDENCE_LOW",
    "FORECAST_NOT_ACTIVE",
    "CURRENT_CONFIDENCE_LOW",
    "CANDIDATE_PLAN_ONLY",
    "PLAN_LEAD_TIME",
    "PLAN_STATE_NOT_EXECUTABLE",
  ]) {
    assert.match(prepare, new RegExp(gate));
  }
});

test("legacy DAY plans expose their horizon and only unbound plans may migrate to WEEK authority", () => {
  assert.match(tradePlansSource, /forecastHorizon: row\.forecast_horizon/);
  assert.match(renewalSource, /input\.latest\.forecastHorizon === "DAY"/);
  assert.match(renewalSource, /input\.incoming\.horizon === "WEEK"/);
  assert.match(renewalSource, /canSupersedeWithoutTouchingExecution\(input\.latest\)/);
  assert.match(renewalSource, /incomingChronology < latestChronology && !authorityUpgrade/);
});
