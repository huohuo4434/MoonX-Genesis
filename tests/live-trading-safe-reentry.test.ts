import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateClosedPlanReentry,
  reconcileForecastBoundPlan,
  type ForecastBoundStoredPlan,
  type ForecastPlanReadiness,
  type LockedForecastBinding,
} from "../lib/trading-signals/ai-plan-renewal-core";

type StoredPlan = ForecastBoundStoredPlan & { readiness: ForecastPlanReadiness };

const lockedForecast: LockedForecastBinding = {
  forecastId: "weekly-btc",
  forecastVersion: "weekly-btc-v1",
  horizon: "WEEK",
  direction: "LONG",
  publishedAt: "2026-08-28T00:00:00.000Z",
  lockedAt: "2026-08-28T00:01:00.000Z",
  validFrom: "2026-08-28T00:00:00.000Z",
  validUntil: "2026-09-05T23:59:59.000Z",
  source: "locked-weekly-live-test",
};

test("live same-forecast reentry requires cooldown, trigger reset, and a later fresh trigger", async () => {
  const plans: StoredPlan[] = [{
    id: "closed-live-plan",
    planGroupId: "forecast:INTRADAY:BTCUSDT:WEEK",
    version: 1,
    status: "CLOSED",
    forecastVersion: lockedForecast.forecastVersion,
    forecastHorizon: "WEEK",
    forecastPublishedAt: lockedForecast.publishedAt,
    forecastLockedAt: lockedForecast.lockedAt,
    clientOid: "completed-client-oid",
    bitgetOrderId: "completed-order-id",
    submittedAt: "2026-08-28T01:00:00.000Z",
    firstFillAt: "2026-08-28T01:00:05.000Z",
    closedAt: "2026-08-28T01:30:00.000Z",
    readiness: "TRIGGERABLE",
  }];
  let sequence = 1;
  const repository = {
    findByForecastVersion: async (forecastVersion: string) =>
      [...plans].sort((a, b) => b.version - a.version).find((plan) => plan.forecastVersion === forecastVersion) ?? null,
    findLatest: async () => [...plans].sort((a, b) => b.version - a.version)[0] ?? null,
    create: async (input: {
      binding: LockedForecastBinding;
      planGroupId: string;
      version: number;
      readiness: ForecastPlanReadiness;
    }) => {
      sequence += 1;
      const plan: StoredPlan = {
        id: `live-plan-${sequence}`,
        planGroupId: input.planGroupId,
        version: input.version,
        status: "WATCHING",
        forecastVersion: input.binding.forecastVersion,
        forecastHorizon: input.binding.horizon,
        forecastPublishedAt: input.binding.publishedAt,
        forecastLockedAt: input.binding.lockedAt,
        clientOid: null,
        bitgetOrderId: null,
        submittedAt: null,
        firstFillAt: null,
        closedAt: null,
        readiness: input.readiness,
      };
      plans.push(plan);
      return plan;
    },
    refresh: async (input: { plan: StoredPlan; readiness: ForecastPlanReadiness }) => {
      input.plan.readiness = input.readiness;
      input.plan.status = input.readiness === "TRIGGERABLE" ? "ARMED" : "WATCHING";
      return input.plan;
    },
    supersede: async () => undefined,
    isCreateConflict: () => false,
  };

  const continuous = await reconcileForecastBoundPlan({
    binding: lockedForecast,
    now: new Date("2026-08-28T01:40:00.000Z"),
    triggerable: true,
    strategyType: "INTRADAY",
    symbol: "BTCUSDT",
    repository,
  });
  assert.equal(continuous.code, "REENTRY_TRIGGER_RESET_REQUIRED");
  assert.equal(plans.length, 1);

  const reset = await reconcileForecastBoundPlan({
    binding: lockedForecast,
    now: new Date("2026-08-28T01:41:00.000Z"),
    triggerable: false,
    strategyType: "INTRADAY",
    symbol: "BTCUSDT",
    repository,
  });
  assert.equal(reset.action, "REARMED");
  assert.equal(reset.readiness, "WAITING");
  assert.equal(plans.length, 2);

  const freshTrigger = await reconcileForecastBoundPlan({
    binding: lockedForecast,
    now: new Date("2026-08-28T01:42:00.000Z"),
    triggerable: true,
    strategyType: "INTRADAY",
    symbol: "BTCUSDT",
    repository,
  });
  assert.equal(freshTrigger.action, "REFRESHED");
  assert.equal(freshTrigger.readiness, "TRIGGERABLE");
  assert.equal(freshTrigger.plan?.id, reset.plan?.id);
  assert.equal(plans.length, 2);
});

test("live reentry never treats an unverified close timestamp as permission", () => {
  const result = evaluateClosedPlanReentry({
    strategyType: "INTRADAY",
    closedAt: null,
    now: new Date("2026-08-28T01:40:00.000Z"),
    triggerable: false,
  });
  assert.equal(result.allowed, false);
  if (!result.allowed) assert.equal(result.code, "REENTRY_CLOSE_TIME_UNVERIFIED");
});
