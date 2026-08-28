import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateClosedPlanReentry,
  forecastHorizonForStrategy,
  forecastPlanGroupIdentity,
  prioritizeAllowedCommissioningSymbols,
  reconcileForecastBoundPlan as reconcileForecastBoundPlanCore,
  type ForecastBoundStoredPlan,
  type ForecastPlanReadiness,
  type LockedForecastBinding,
} from "../lib/trading-signals/ai-plan-renewal-core";

type MemoryPlan = ForecastBoundStoredPlan & {
  binding: LockedForecastBinding;
  readiness: ForecastPlanReadiness;
};

function reconcileForecastBoundPlan(input: Omit<
  Parameters<typeof reconcileForecastBoundPlanCore<MemoryPlan>>[0],
  "strategyType" | "symbol"
> & { strategyType?: "INTRADAY" | "SWING" | "POSITION"; symbol?: string }) {
  return reconcileForecastBoundPlanCore<MemoryPlan>({
    strategyType: input.strategyType ?? "SWING",
    symbol: input.symbol ?? "HYPEUSDT",
    ...input,
  });
}

function binding(version: string, overrides: Partial<LockedForecastBinding> = {}): LockedForecastBinding {
  return {
    forecastId: `forecast-${version}`,
    forecastVersion: version,
    horizon: "WEEK",
    direction: "LONG",
    publishedAt: "2026-08-09T01:00:00.000Z",
    lockedAt: "2026-08-09T01:01:00.000Z",
    validFrom: "2026-08-10T00:00:00+08:00",
    validUntil: "2026-08-16T23:59:59+08:00",
    source: "locked-weekly-test",
    ...overrides,
  };
}

function repository(seed: MemoryPlan[] = []) {
  const plans = [...seed];
  let sequence = seed.length;
  return {
    plans,
    api: {
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
        const plan: MemoryPlan = {
          id: `p${sequence}`,
          planGroupId: input.planGroupId,
          version: input.version,
          status: input.readiness === "TRIGGERABLE" ? "ARMED" : "WATCHING",
          forecastVersion: input.binding.forecastVersion,
          forecastHorizon: input.binding.horizon,
          forecastPublishedAt: input.binding.publishedAt,
          forecastLockedAt: input.binding.lockedAt,
          clientOid: null,
          bitgetOrderId: null,
          submittedAt: null,
          firstFillAt: null,
          binding: input.binding,
          readiness: input.readiness,
        };
        plans.push(plan);
        return plan;
      },
      refresh: async (input: { plan: MemoryPlan; binding: LockedForecastBinding; readiness: ForecastPlanReadiness }) => {
        input.plan.binding = input.binding;
        input.plan.forecastHorizon = input.binding.horizon;
        input.plan.forecastPublishedAt = input.binding.publishedAt;
        input.plan.forecastLockedAt = input.binding.lockedAt;
        input.plan.readiness = input.readiness;
        input.plan.status = input.readiness === "TRIGGERABLE" ? "ARMED" : "WATCHING";
        return input.plan;
      },
      supersede: async (plan: MemoryPlan) => {
        plan.status = "SUPERSEDED";
      },
      isCreateConflict: () => false,
    },
  };
}

const beforeStart = new Date("2026-08-09T04:00:00.000Z");
const active = new Date("2026-08-10T02:00:00.000Z");

test("expired old forecast remains audit-only and new locked version creates WAITING then TRIGGERABLE", async () => {
  const old: MemoryPlan = {
    id: "old",
    planGroupId: "g1",
    version: 1,
    status: "EXPIRED",
    forecastVersion: "v1",
    forecastPublishedAt: "2026-08-08T01:00:00.000Z",
    forecastLockedAt: "2026-08-08T01:01:00.000Z",
    clientOid: null,
    bitgetOrderId: null,
    submittedAt: null,
    firstFillAt: null,
    binding: binding("v1"),
    readiness: "WAITING",
  };
  const repo = repository([old]);
  const waiting = await reconcileForecastBoundPlan({ binding: binding("v2"), now: beforeStart, triggerable: true, repository: repo.api });
  assert.equal(waiting.action, "CREATED");
  assert.equal(waiting.readiness, "WAITING");
  assert.equal(repo.plans.length, 2);
  assert.equal(old.status, "EXPIRED");
  assert.equal(waiting.plan?.binding.forecastVersion, "v2");
  assert.equal(waiting.plan?.binding.publishedAt, "2026-08-09T01:00:00.000Z");
  assert.equal(waiting.plan?.binding.validFrom, "2026-08-10T00:00:00+08:00");
  assert.equal(waiting.plan?.binding.validUntil, "2026-08-16T23:59:59+08:00");
  assert.equal(waiting.plan?.binding.source, "locked-weekly-test");

  const triggerable = await reconcileForecastBoundPlan({ binding: binding("v2"), now: active, triggerable: true, repository: repo.api });
  assert.equal(triggerable.action, "REFRESHED");
  assert.equal(triggerable.readiness, "TRIGGERABLE");
  assert.equal(repo.plans.length, 2);
  assert.equal(triggerable.plan?.id, waiting.plan?.id);
});

test("new locked forecast increments immutable plan version inside the same plan group", async () => {
  const prior: MemoryPlan = {
    id: "prior-v4",
    planGroupId: "g-version",
    version: 4,
    status: "WATCHING",
    forecastVersion: "v1",
    forecastPublishedAt: "2026-08-08T01:00:00.000Z",
    forecastLockedAt: "2026-08-08T01:01:00.000Z",
    clientOid: null,
    bitgetOrderId: null,
    submittedAt: null,
    firstFillAt: null,
    binding: binding("v1", { publishedAt: "2026-08-08T01:00:00.000Z", lockedAt: "2026-08-08T01:01:00.000Z" }),
    readiness: "WAITING",
  };
  const repo = repository([prior]);
  const result = await reconcileForecastBoundPlan({ binding: binding("v2"), now: active, triggerable: false, repository: repo.api });
  assert.equal(result.action, "CREATED");
  assert.equal(result.plan?.planGroupId, "g-version");
  assert.equal(result.plan?.version, 5);
  assert.equal(prior.status, "SUPERSEDED");
  assert.equal(repo.plans.length, 2);
});

test("repeated Cron is idempotent for same symbol period forecast version", async () => {
  const repo = repository();
  const first = await reconcileForecastBoundPlan({ binding: binding("v2"), now: active, triggerable: false, repository: repo.api });
  const second = await reconcileForecastBoundPlan({ binding: binding("v2"), now: active, triggerable: false, repository: repo.api });
  assert.equal(first.action, "CREATED");
  assert.equal(second.action, "REFRESHED");
  assert.equal(repo.plans.length, 1);
  assert.equal(first.plan?.id, second.plan?.id);
});

test("no locked forecast is fail-closed and creates no plan", async () => {
  const repo = repository();
  const result = await reconcileForecastBoundPlan({ binding: null, now: active, triggerable: true, repository: repo.api });
  assert.equal(result.action, "FAIL_CLOSED");
  assert.equal(result.code, "LOCKED_FORECAST_UNAVAILABLE");
  assert.equal(repo.plans.length, 0);
});

test("expired forecast version cannot revive its terminal plan", async () => {
  const old: MemoryPlan = {
    id: "old",
    planGroupId: "g1",
    version: 1,
    status: "EXPIRED",
    forecastVersion: "v1",
    forecastPublishedAt: "2026-08-08T01:00:00.000Z",
    forecastLockedAt: "2026-08-08T01:01:00.000Z",
    clientOid: null,
    bitgetOrderId: null,
    submittedAt: null,
    firstFillAt: null,
    binding: binding("v1"),
    readiness: "WAITING",
  };
  const repo = repository([old]);
  const result = await reconcileForecastBoundPlan({ binding: binding("v1"), now: active, triggerable: true, repository: repo.api });
  assert.equal(result.action, "FAIL_CLOSED");
  assert.equal(result.code, "FORECAST_VERSION_TERMINAL");
  assert.equal(repo.plans.length, 1);
  assert.equal(old.status, "EXPIRED");
});

test("one forecast version cannot bind a second order", async () => {
  const ordered: MemoryPlan = {
    id: "ordered",
    planGroupId: "g1",
    version: 1,
    status: "ORDER_SUBMITTED",
    forecastVersion: "v2",
    forecastPublishedAt: "2026-08-09T01:00:00.000Z",
    forecastLockedAt: "2026-08-09T01:01:00.000Z",
    clientOid: "client-1",
    bitgetOrderId: "order-1",
    submittedAt: active.toISOString(),
    firstFillAt: null,
    binding: binding("v2"),
    readiness: "TRIGGERABLE",
  };
  const repo = repository([ordered]);
  const result = await reconcileForecastBoundPlan({ binding: binding("v2"), now: active, triggerable: true, repository: repo.api });
  assert.equal(result.action, "ORDER_ALREADY_BOUND");
  assert.equal(result.code, "FORECAST_VERSION_ORDER_ALREADY_BOUND");
  assert.equal(repo.plans.length, 1);
});

test("closed intraday plan requires cooldown and a false-to-true technical reset before same-forecast reentry", async () => {
  const closedAt = "2026-08-10T01:50:00.000Z";
  const closed: MemoryPlan = {
    id: "closed-v2",
    planGroupId: "g-reentry",
    version: 2,
    status: "CLOSED",
    forecastVersion: "v2",
    forecastHorizon: "WEEK",
    forecastPublishedAt: "2026-08-09T01:00:00.000Z",
    forecastLockedAt: "2026-08-09T01:01:00.000Z",
    clientOid: "closed-client",
    bitgetOrderId: "closed-order",
    submittedAt: "2026-08-10T01:00:00.000Z",
    firstFillAt: "2026-08-10T01:00:05.000Z",
    closedAt,
    binding: binding("v2"),
    readiness: "TRIGGERABLE",
  };
  const repo = repository([closed]);

  const continuousTrigger = await reconcileForecastBoundPlan({
    binding: binding("v2"),
    now: active,
    triggerable: true,
    strategyType: "INTRADAY",
    repository: repo.api,
  });
  assert.equal(continuousTrigger.action, "FAIL_CLOSED");
  assert.equal(continuousTrigger.code, "REENTRY_TRIGGER_RESET_REQUIRED");
  assert.equal(repo.plans.length, 1);

  const reset = await reconcileForecastBoundPlan({
    binding: binding("v2"),
    now: active,
    triggerable: false,
    strategyType: "INTRADAY",
    repository: repo.api,
  });
  assert.equal(reset.action, "REARMED");
  assert.equal(reset.readiness, "WAITING");
  assert.equal(reset.plan?.version, 3);
  assert.equal(repo.plans.length, 2);

  const retriggered = await reconcileForecastBoundPlan({
    binding: binding("v2"),
    now: new Date(active.getTime() + 60_000),
    triggerable: true,
    strategyType: "INTRADAY",
    repository: repo.api,
  });
  assert.equal(retriggered.action, "REFRESHED");
  assert.equal(retriggered.readiness, "TRIGGERABLE");
  assert.equal(retriggered.plan?.id, reset.plan?.id);
  assert.equal(repo.plans.length, 2);
});

test("closed-plan reentry uses execution-timeframe cooldowns and fails closed without a close timestamp", () => {
  const now = new Date("2026-08-10T02:00:00.000Z");
  assert.deepEqual(evaluateClosedPlanReentry({
    strategyType: "INTRADAY",
    closedAt: "2026-08-10T01:57:00.000Z",
    now,
    triggerable: false,
  }), {
    allowed: false,
    code: "REENTRY_COOLDOWN_ACTIVE",
    reason: "旧订单已结束，但INTRADAY再入场冷却5分钟尚未完成。",
  });
  assert.equal(evaluateClosedPlanReentry({
    strategyType: "SWING",
    closedAt: "2026-08-10T01:00:00.000Z",
    now,
    triggerable: false,
  }).allowed, true);
  assert.equal(evaluateClosedPlanReentry({
    strategyType: "POSITION",
    closedAt: "2026-08-09T22:00:00.000Z",
    now,
    triggerable: false,
  }).allowed, true);
  assert.equal(evaluateClosedPlanReentry({
    strategyType: "INTRADAY",
    closedAt: null,
    now,
    triggerable: false,
  }).allowed, false);
});

test("concurrent same-forecast rearm loses safely and cannot submit from the losing invocation", async () => {
  const closed: MemoryPlan = {
    id: "closed-concurrent",
    planGroupId: "g-concurrent-reentry",
    version: 4,
    status: "CLOSED",
    forecastVersion: "v2",
    forecastHorizon: "WEEK",
    forecastPublishedAt: "2026-08-09T01:00:00.000Z",
    forecastLockedAt: "2026-08-09T01:01:00.000Z",
    clientOid: "closed-client",
    bitgetOrderId: "closed-order",
    submittedAt: "2026-08-10T00:30:00.000Z",
    firstFillAt: "2026-08-10T00:30:05.000Z",
    closedAt: "2026-08-10T01:00:00.000Z",
    binding: binding("v2"),
    readiness: "TRIGGERABLE",
  };
  const authoritative: MemoryPlan = {
    ...closed,
    id: "rearmed-by-other-run",
    version: 5,
    status: "WATCHING",
    clientOid: null,
    bitgetOrderId: null,
    submittedAt: null,
    firstFillAt: null,
    closedAt: null,
    readiness: "WAITING",
  };
  let reads = 0;
  const result = await reconcileForecastBoundPlan({
    binding: binding("v2"),
    now: active,
    triggerable: false,
    strategyType: "INTRADAY",
    repository: {
      findByForecastVersion: async () => (++reads === 1 ? closed : authoritative),
      findLatest: async () => closed,
      create: async () => { throw new Error("unique active forecast plan"); },
      refresh: async ({ plan }) => plan,
      supersede: async () => undefined,
      isCreateConflict: () => true,
    },
  });
  assert.equal(result.action, "FAIL_CLOSED");
  assert.equal(result.code, "CONCURRENT_REENTRY_CREATE_RECONCILED");
  assert.equal(result.plan?.id, authoritative.id);
  assert.equal(reads, 2);
});

test("execution error stays bound when authoritative recovery is unavailable", async () => {
  const failed: MemoryPlan = {
    id: "failed",
    planGroupId: "g-retry",
    version: 1,
    status: "EXECUTION_ERROR",
    forecastVersion: "v2",
    forecastPublishedAt: "2026-08-09T01:00:00.000Z",
    forecastLockedAt: "2026-08-09T01:01:00.000Z",
    clientOid: "old-client",
    bitgetOrderId: null,
    submittedAt: active.toISOString(),
    firstFillAt: null,
    binding: binding("v2"),
    readiness: "TRIGGERABLE",
  };
  const repo = repository([failed]);
  const result = await reconcileForecastBoundPlan({ binding: binding("v2"), now: active, triggerable: true, repository: repo.api });
  assert.equal(result.action, "ORDER_ALREADY_BOUND");
  assert.equal(repo.plans.length, 1);
});

test("verified execution error may create one independent retry plan without mutating history", async () => {
  const failed: MemoryPlan = {
    id: "failed",
    planGroupId: "g-retry",
    version: 3,
    status: "EXECUTION_ERROR",
    forecastVersion: "v2",
    forecastPublishedAt: "2026-08-09T01:00:00.000Z",
    forecastLockedAt: "2026-08-09T01:01:00.000Z",
    clientOid: "old-client",
    bitgetOrderId: null,
    submittedAt: active.toISOString(),
    firstFillAt: null,
    binding: binding("v2"),
    readiness: "TRIGGERABLE",
  };
  const repo = repository([failed]);
  let recoveryChecks = 0;
  const result = await reconcileForecastBoundPlan({
    binding: binding("v2"),
    now: active,
    triggerable: true,
    repository: {
      ...repo.api,
      recoverExecutionError: async ({ failedPlan, binding: locked, readiness }) => {
        recoveryChecks += 1;
        return repo.api.create({
          binding: locked,
          planGroupId: failedPlan.planGroupId,
          version: failedPlan.version + 1,
          readiness,
        });
      },
    },
  });
  assert.equal(result.action, "RECOVERED");
  assert.equal(result.code, "FORECAST_VERSION_COMMISSIONING_RECOVERED");
  assert.equal(result.plan?.version, 4);
  assert.equal(result.plan?.clientOid, null);
  assert.equal(recoveryChecks, 1);
  assert.equal(failed.status, "EXECUTION_ERROR");
  assert.equal(failed.clientOid, "old-client");
  assert.equal(repo.plans.length, 2);
});

test("authoritative recovery callback cannot revive a submitted or filled lifecycle", async () => {
  const ordered: MemoryPlan = {
    id: "ordered-no-recovery",
    planGroupId: "g-retry",
    version: 1,
    status: "ORDER_SUBMITTED",
    forecastVersion: "v2",
    forecastPublishedAt: "2026-08-09T01:00:00.000Z",
    forecastLockedAt: "2026-08-09T01:01:00.000Z",
    clientOid: "live-client",
    bitgetOrderId: "live-order",
    submittedAt: active.toISOString(),
    firstFillAt: null,
    binding: binding("v2"),
    readiness: "TRIGGERABLE",
  };
  const repo = repository([ordered]);
  let called = false;
  const result = await reconcileForecastBoundPlan({
    binding: binding("v2"),
    now: active,
    triggerable: true,
    repository: {
      ...repo.api,
      recoverExecutionError: async () => {
        called = true;
        return null;
      },
    },
  });
  assert.equal(result.action, "ORDER_ALREADY_BOUND");
  assert.equal(called, false);
  assert.equal(repo.plans.length, 1);
});

test("expired locked forecast metadata is rejected rather than revived", async () => {
  const repo = repository();
  const result = await reconcileForecastBoundPlan({
    binding: binding("v-old", { validUntil: "2026-08-08T23:59:59+08:00" }),
    now: active,
    triggerable: true,
    repository: repo.api,
  });
  assert.equal(result.action, "FAIL_CLOSED");
  assert.equal(result.code, "LOCKED_FORECAST_EXPIRED");
  assert.equal(repo.plans.length, 0);
});

test("commissioning preference never adds BTC or ETH unless liveAllowedSymbols contains them", () => {
  assert.deepEqual(
    prioritizeAllowedCommissioningSymbols(["XAUTUSDT", "MSFTUSDT"], ["BTCUSDT", "ETHUSDT"]),
    ["XAUTUSDT", "MSFTUSDT"]
  );
  assert.deepEqual(
    prioritizeAllowedCommissioningSymbols(["XAUTUSDT", "ETHUSDT", "BTCUSDT"], ["BTCUSDT", "ETHUSDT"]),
    ["BTCUSDT", "ETHUSDT", "XAUTUSDT"]
  );
});


test("intraday and swing bind weekly direction authority while position binds monthly", () => {
  assert.equal(forecastHorizonForStrategy("INTRADAY"), "WEEK");
  assert.equal(forecastHorizonForStrategy("SWING"), "WEEK");
  assert.equal(forecastHorizonForStrategy("POSITION"), "MONTH");
});

test("unbound intraday DAY plan can migrate to older-published WEEK authority without weakening rollback protection", async () => {
  const legacyDaily: MemoryPlan = {
    id: "legacy-intraday-day",
    planGroupId: "forecast:INTRADAY:BTCUSDT:DAY",
    version: 3,
    status: "WATCHING",
    forecastVersion: "btc-day-newer-time",
    forecastHorizon: "DAY",
    forecastPublishedAt: "2026-08-09T03:00:00.000Z",
    forecastLockedAt: "2026-08-09T03:01:00.000Z",
    clientOid: null,
    bitgetOrderId: null,
    submittedAt: null,
    firstFillAt: null,
    binding: binding("btc-day-newer-time", {
      horizon: "DAY",
      publishedAt: "2026-08-09T03:00:00.000Z",
      lockedAt: "2026-08-09T03:01:00.000Z",
    }),
    readiness: "WAITING",
  };
  const repo = repository([legacyDaily]);
  const result = await reconcileForecastBoundPlan({
    binding: binding("btc-week-authority", {
      horizon: "WEEK",
      publishedAt: "2026-08-09T01:00:00.000Z",
      lockedAt: "2026-08-09T01:01:00.000Z",
    }),
    now: active,
    triggerable: false,
    strategyType: "INTRADAY",
    symbol: "BTCUSDT",
    repository: repo.api,
  });

  assert.equal(result.action, "CREATED");
  assert.equal(result.plan?.forecastHorizon, "WEEK");
  assert.equal(result.plan?.version, 4);
  assert.equal(result.plan?.planGroupId, legacyDaily.planGroupId);
  assert.equal(legacyDaily.status, "SUPERSEDED");
});

test("intraday DAY to WEEK migration cannot replace an order-bound plan", async () => {
  const orderedDaily: MemoryPlan = {
    id: "ordered-intraday-day",
    planGroupId: "forecast:INTRADAY:BTCUSDT:DAY",
    version: 3,
    status: "OPEN",
    forecastVersion: "btc-day-order-bound",
    forecastHorizon: "DAY",
    forecastPublishedAt: "2026-08-09T03:00:00.000Z",
    forecastLockedAt: "2026-08-09T03:01:00.000Z",
    clientOid: "existing-client",
    bitgetOrderId: "existing-order",
    submittedAt: "2026-08-09T03:02:00.000Z",
    firstFillAt: "2026-08-09T03:03:00.000Z",
    binding: binding("btc-day-order-bound", { horizon: "DAY" }),
    readiness: "TRIGGERABLE",
  };
  const repo = repository([orderedDaily]);
  const result = await reconcileForecastBoundPlan({
    binding: binding("btc-week-authority", { horizon: "WEEK" }),
    now: active,
    triggerable: true,
    strategyType: "INTRADAY",
    symbol: "BTCUSDT",
    repository: repo.api,
  });

  assert.equal(result.action, "FAIL_CLOSED");
  assert.equal(result.code, "STALE_FORECAST_VERSION");
  assert.equal(repo.plans.length, 1);
  assert.equal(orderedDaily.status, "OPEN");
});

test("new plan group identity is isolated by strategy and symbol for all three horizons", () => {
  assert.equal(forecastPlanGroupIdentity({ strategyType: "INTRADAY", symbol: "BTCUSDT", horizon: "WEEK" }), "forecast:INTRADAY:BTCUSDT:WEEK");
  assert.equal(forecastPlanGroupIdentity({ strategyType: "INTRADAY", symbol: "HYPEUSDT", horizon: "DAY" }), "forecast:INTRADAY:HYPEUSDT:DAY");
  assert.equal(forecastPlanGroupIdentity({ strategyType: "INTRADAY", symbol: "QQQUSDT", horizon: "DAY" }), "forecast:INTRADAY:QQQUSDT:DAY");
  assert.equal(forecastPlanGroupIdentity({ strategyType: "SWING", symbol: "HYPEUSDT", horizon: "WEEK" }), "forecast:SWING:HYPEUSDT:WEEK");
  assert.equal(forecastPlanGroupIdentity({ strategyType: "SWING", symbol: "QQQUSDT", horizon: "WEEK" }), "forecast:SWING:QQQUSDT:WEEK");
  assert.equal(forecastPlanGroupIdentity({ strategyType: "POSITION", symbol: "GOOGLUSDT", horizon: "MONTH" }), "forecast:POSITION:GOOGLUSDT:MONTH");
  assert.equal(forecastPlanGroupIdentity({ strategyType: "POSITION", symbol: "QQQUSDT", horizon: "MONTH" }), "forecast:POSITION:QQQUSDT:MONTH");
});

test("DAY WEEK and MONTH first plans for different symbols each create independent V1 chains", async () => {
  for (const scenario of [
    { strategyType: "INTRADAY" as const, horizon: "DAY" as const },
    { strategyType: "SWING" as const, horizon: "WEEK" as const },
    { strategyType: "POSITION" as const, horizon: "MONTH" as const },
  ]) {
    const left = repository();
    const right = repository();
    const leftResult = await reconcileForecastBoundPlan({
      binding: binding(`${scenario.horizon}-left`, { horizon: scenario.horizon }),
      now: active, triggerable: false, repository: left.api,
      strategyType: scenario.strategyType, symbol: "HYPEUSDT",
    });
    const rightResult = await reconcileForecastBoundPlan({
      binding: binding(`${scenario.horizon}-right`, { horizon: scenario.horizon }),
      now: active, triggerable: false, repository: right.api,
      strategyType: scenario.strategyType, symbol: "QQQUSDT",
    });
    assert.equal(leftResult.plan?.version, 1);
    assert.equal(rightResult.plan?.version, 1);
    assert.notEqual(leftResult.plan?.planGroupId, rightResult.plan?.planGroupId);
  }
});

test("HYPE and QQQ same-horizon V1 plans use independent groups while legacy chains continue", async () => {
  const hype = repository();
  const qqq = repository();
  const hypeResult = await reconcileForecastBoundPlan({
    binding: binding("hype-v1"), now: active, triggerable: false, repository: hype.api,
    strategyType: "SWING", symbol: "HYPEUSDT",
  });
  const qqqResult = await reconcileForecastBoundPlan({
    binding: binding("qqq-v1"), now: active, triggerable: false, repository: qqq.api,
    strategyType: "SWING", symbol: "QQQUSDT",
  });
  assert.equal(hypeResult.plan?.planGroupId, "forecast:SWING:HYPEUSDT:WEEK");
  assert.equal(qqqResult.plan?.planGroupId, "forecast:SWING:QQQUSDT:WEEK");
  assert.equal(hypeResult.plan?.version, 1);
  assert.equal(qqqResult.plan?.version, 1);

  const legacy: MemoryPlan = {
    ...hypeResult.plan!, id: "legacy-hype", planGroupId: "forecast:WEEK", version: 4,
    forecastVersion: "legacy-v4", forecastPublishedAt: "2026-08-08T01:00:00.000Z",
    forecastLockedAt: "2026-08-08T01:01:00.000Z", binding: binding("legacy-v4"),
  };
  const legacyRepo = repository([legacy]);
  const continued = await reconcileForecastBoundPlan({
    binding: binding("legacy-v5"), now: active, triggerable: false, repository: legacyRepo.api,
    strategyType: "SWING", symbol: "HYPEUSDT",
  });
  assert.equal(continued.plan?.planGroupId, "forecast:WEEK");
  assert.equal(continued.plan?.version, 5);
});

test("concurrent first creation re-reads authority and the losing invocation fails closed", async () => {
  const shared = repository();
  let releaseCreate: (() => void) | undefined;
  let createCalls = 0;
  const gate = new Promise<void>((resolve) => { releaseCreate = resolve; });
  const concurrentApi = {
    ...shared.api,
    create: async (input: Parameters<typeof shared.api.create>[0]) => {
      createCalls += 1;
      if (createCalls === 1) await gate;
      if (shared.plans.some((plan) => plan.planGroupId === input.planGroupId && plan.version === input.version)) {
        throw { meta: { code: "23505" } };
      }
      return shared.api.create(input);
    },
    isCreateConflict: (error: unknown) => Boolean(
      error && typeof error === "object" && (error as { meta?: { code?: string } }).meta?.code === "23505"
    ),
  };
  const first = reconcileForecastBoundPlan({
    binding: binding("concurrent-v1"), now: active, triggerable: true, repository: concurrentApi,
  });
  const second = reconcileForecastBoundPlan({
    binding: binding("concurrent-v1"), now: active, triggerable: true, repository: concurrentApi,
  });
  await new Promise((resolve) => setImmediate(resolve));
  releaseCreate?.();
  const results = await Promise.all([first, second]);
  assert.equal(shared.plans.length, 1);
  assert.equal(results.filter((result) => result.action === "CREATED").length, 1);
  const loser = results.find((result) => result.action === "FAIL_CLOSED");
  assert.equal(loser?.code, "CONCURRENT_PLAN_CREATE_RECONCILED");
  assert.equal(loser?.readiness, "WAITING");
  assert.equal(loser?.plan?.id, shared.plans[0]?.id);
});

test("an older locked version cannot roll back a newer non-terminal plan", async () => {
  const newer: MemoryPlan = {
    id: "newer",
    planGroupId: "g1",
    version: 2,
    status: "WATCHING",
    forecastVersion: "v2",
    forecastPublishedAt: "2026-08-09T02:00:00.000Z",
    forecastLockedAt: "2026-08-09T02:01:00.000Z",
    clientOid: null,
    bitgetOrderId: null,
    submittedAt: null,
    firstFillAt: null,
    binding: binding("v2", { publishedAt: "2026-08-09T02:00:00.000Z", lockedAt: "2026-08-09T02:01:00.000Z" }),
    readiness: "WAITING",
  };
  const repo = repository([newer]);
  const stale = binding("v1", { publishedAt: "2026-08-09T01:00:00.000Z", lockedAt: "2026-08-09T01:01:00.000Z" });
  const result = await reconcileForecastBoundPlan({ binding: stale, now: active, triggerable: true, repository: repo.api });
  assert.equal(result.action, "FAIL_CLOSED");
  assert.equal(result.code, "STALE_FORECAST_VERSION");
  assert.equal(repo.plans.length, 1);
  assert.equal(newer.status, "WATCHING");
});
