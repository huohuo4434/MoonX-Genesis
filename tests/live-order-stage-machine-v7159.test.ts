import assert from "node:assert/strict";
import test from "node:test";

import {
  LiveTradeExecutionError,
  planUtaLeverageConfiguration,
  runIdempotentOrderDispatch,
  type RemoteFailureDescriptor,
} from "../lib/bitget/live-execution-core";
import { classifyLiveOrderFailure } from "../lib/trading-signals/live-order-preflight-core";

function describe(error: unknown): RemoteFailureDescriptor {
  if (error instanceof LiveTradeExecutionError) {
    return {
      message: error.message,
      bitgetCode: error.bitgetCode,
      httpStatus: error.httpStatus,
      ambiguous: error.stage === "AMBIGUOUS_WRITE",
    };
  }
  const record = error as { message?: string; code?: string; httpStatus?: number; ambiguous?: boolean };
  return {
    message: record?.message ?? "error",
    bitgetCode: record?.code ?? null,
    httpStatus: record?.httpStatus ?? null,
    ambiguous: Boolean(record?.ambiguous),
  };
}

test("hedge isolated leverage writes both directions and keeps documented posSide", () => {
  const plan = planUtaLeverageConfiguration({
    settings: { holdMode: "hedge_mode", symbolConfigList: [] },
    symbol: "BTCUSDT",
    leverage: 2,
    marginMode: "isolated",
    posSide: "long",
  });
  assert.equal(plan.required, true);
  assert.equal(plan.body.posSide, "long");
  assert.equal(plan.body.marginMode, "isolated");
  assert.equal(plan.body.leverage, "2");
  assert.equal(plan.body.longLeverage, "2");
  assert.equal(plan.body.shortLeverage, "2");
});

test("hedge isolated leverage keeps requested posSide while both leverage values are explicit", () => {
  const longPlan = planUtaLeverageConfiguration({
    settings: { holdMode: "hedge_mode", symbolConfigList: [] },
    symbol: "ETHUSDT",
    leverage: 2,
    marginMode: "isolated",
    posSide: "long",
  });
  const shortPlan = planUtaLeverageConfiguration({
    settings: { holdMode: "hedge_mode", symbolConfigList: [] },
    symbol: "ETHUSDT",
    leverage: 2,
    marginMode: "isolated",
    posSide: "short",
  });
  assert.equal(longPlan.body.posSide, "long");
  assert.equal(shortPlan.body.posSide, "short");
  assert.equal(longPlan.body.longLeverage, "2");
  assert.equal(longPlan.body.shortLeverage, "2");
  assert.equal(shortPlan.body.longLeverage, "2");
  assert.equal(shortPlan.body.shortLeverage, "2");
});

test("one-way leverage does not send hedge-only leverage fields", () => {
  const plan = planUtaLeverageConfiguration({
    settings: { holdMode: "one_way_mode", symbolConfigList: [] },
    symbol: "BTCUSDT",
    leverage: 2,
    marginMode: "isolated",
    posSide: "long",
  });
  assert.equal("posSide" in plan.body, false);
  assert.equal("longLeverage" in plan.body, false);
  assert.equal("shortLeverage" in plan.body, false);
  assert.equal(plan.body.leverage, "2");
});

test("hedge leverage array must have every returned side at desired leverage", () => {
  const ready = planUtaLeverageConfiguration({
    settings: {
      holdMode: "hedge_mode",
      symbolConfigList: [{ category: "USDT-FUTURES", symbol: "BTCUSDT", marginMode: "isolated", leverage: ["2", "2"] }],
    },
    symbol: "BTCUSDT",
    leverage: 2,
    marginMode: "isolated",
    posSide: "long",
  });
  assert.equal(ready.required, false);

  const mismatch = planUtaLeverageConfiguration({
    settings: {
      holdMode: "hedge_mode",
      symbolConfigList: [{ category: "USDT-FUTURES", symbol: "BTCUSDT", marginMode: "isolated", leverage: ["2", "3"] }],
    },
    symbol: "BTCUSDT",
    leverage: 2,
    marginMode: "isolated",
    posSide: "long",
  });
  assert.equal(mismatch.required, true);
  assert.equal(mismatch.body.longLeverage, "2");
  assert.equal(mismatch.body.shortLeverage, "2");
});

test("already configured scalar leverage does not write every cron", () => {
  const plan = planUtaLeverageConfiguration({
    settings: {
      holdMode: "hedge_mode",
      symbolConfigList: [{ category: "USDT-FUTURES", symbol: "BTCUSDT", marginMode: "isolated", leverage: "2" }],
    },
    symbol: "BTCUSDT",
    leverage: 2,
    marginMode: "isolated",
    posSide: "long",
  });
  assert.equal(plan.required, false);
});

test("set-leverage failure is ACCOUNT_CONFIG_WRITE and does not count orderErrors", async () => {
  let submits = 0;
  const result = await runIdempotentOrderDispatch({
    clientOid: "mx_test_config",
    symbol: "BTCUSDT",
    action: "OPEN_MARKET",
    queryExisting: async () => null,
    configureAccount: async () => { throw { message: "posSide required", code: "40017", httpStatus: 400 }; },
    submitOrder: async () => { submits += 1; return { orderId: "should-not-happen" }; },
    describeError: describe,
  });
  assert.equal(submits, 0);
  assert.equal(result.kind, "FAILED");
  if (result.kind !== "FAILED") return;
  assert.equal(result.error.stage, "ACCOUNT_CONFIG_WRITE");
  assert.equal(result.error.remoteSubmissionAttempted, false);
  assert.equal(result.error.clientOid, "mx_test_config");
  const disposition = classifyLiveOrderFailure(result.error.stage, result.error.remoteSubmissionAttempted);
  assert.equal(disposition.error, false);
  assert.equal(disposition.rejectionCode, "ACCOUNT_CONFIG_BLOCK");
});

test("definite place-order failure is the only stage that counts orderErrors", async () => {
  let submits = 0;
  const result = await runIdempotentOrderDispatch({
    clientOid: "mx_test_remote",
    symbol: "BTCUSDT",
    action: "OPEN_MARKET",
    queryExisting: async () => null,
    configureAccount: async () => undefined,
    submitOrder: async (onRemoteDispatch) => { onRemoteDispatch(); submits += 1; throw { message: "bad order", code: "40762", httpStatus: 400, ambiguous: false }; },
    describeError: describe,
  });
  assert.equal(submits, 1);
  assert.equal(result.kind, "FAILED");
  if (result.kind !== "FAILED") return;
  assert.equal(result.error.stage, "REMOTE_ORDER_WRITE");
  assert.equal(result.error.remoteSubmissionAttempted, true);
  assert.equal(result.error.bitgetCode, "40762");
  const disposition = classifyLiveOrderFailure(result.error.stage);
  assert.equal(disposition.error, true);
  assert.equal(disposition.rejectionCode, "ORDER_ERROR");
});

test("timeout/5xx rechecks clientOid and never resubmits", async () => {
  let submits = 0;
  let lookups = 0;
  const result = await runIdempotentOrderDispatch({
    clientOid: "mx_test_ambiguous",
    symbol: "BTCUSDT",
    action: "OPEN_MARKET",
    queryExisting: async () => { lookups += 1; return null; },
    configureAccount: async () => undefined,
    submitOrder: async (onRemoteDispatch) => { onRemoteDispatch(); submits += 1; throw { message: "timeout", code: "25001", httpStatus: 500, ambiguous: true }; },
    describeError: describe,
  });
  assert.equal(submits, 1);
  assert.equal(lookups, 2);
  assert.equal(result.kind, "FAILED");
  if (result.kind !== "FAILED") return;
  assert.equal(result.error.stage, "AMBIGUOUS_WRITE");
  assert.equal(classifyLiveOrderFailure(result.error.stage, result.error.remoteSubmissionAttempted).error, false);
});

test("ambiguous response recovered by clientOid is acknowledged", async () => {
  let submits = 0;
  let lookups = 0;
  const result = await runIdempotentOrderDispatch({
    clientOid: "mx_test_recovered",
    symbol: "BTCUSDT",
    action: "OPEN_MARKET",
    queryExisting: async () => {
      lookups += 1;
      return lookups === 1 ? null : { orderId: "123", clientOid: "mx_test_recovered" };
    },
    configureAccount: async () => undefined,
    submitOrder: async (onRemoteDispatch) => { onRemoteDispatch(); submits += 1; throw { message: "gateway timeout", code: "25001", httpStatus: 504, ambiguous: true }; },
    describeError: describe,
  });
  assert.equal(submits, 1);
  assert.equal(lookups, 2);
  assert.equal(result.kind, "ACKNOWLEDGED");
  if (result.kind !== "ACKNOWLEDGED") return;
  assert.equal(result.recovered, true);
  assert.equal(result.order.orderId, "123");
});

test("duplicate cron with same clientOid is idempotent and does not submit again", async () => {
  const exchange = new Map<string, { orderId: string; clientOid: string }>();
  let submits = 0;
  async function run() {
    return runIdempotentOrderDispatch({
      clientOid: "mx_same_cron",
      symbol: "BTCUSDT",
      action: "OPEN_MARKET",
      queryExisting: async () => exchange.get("mx_same_cron") ?? null,
      configureAccount: async () => undefined,
      submitOrder: async (onRemoteDispatch) => {
        onRemoteDispatch();
        submits += 1;
        const order = { orderId: "order-one", clientOid: "mx_same_cron" };
        exchange.set("mx_same_cron", order);
        return order;
      },
      describeError: describe,
    });
  }
  const first = await run();
  const second = await run();
  assert.equal(first.kind, "ACKNOWLEDGED");
  assert.equal(second.kind, "ACKNOWLEDGED");
  assert.equal(submits, 1);
});


test("clock/local preflight failure is blocked before account config or order dispatch", async () => {
  let configured = 0;
  let submits = 0;
  const result = await runIdempotentOrderDispatch({
    clientOid: "mx_local_block",
    symbol: "BTCUSDT",
    action: "OPEN_MARKET",
    queryExisting: async () => null,
    prepareLocal: async () => { throw new Error("clock skew unsafe"); },
    configureAccount: async () => { configured += 1; },
    submitOrder: async () => { submits += 1; return { orderId: "x" }; },
    describeError: describe,
  });
  assert.equal(configured, 0);
  assert.equal(submits, 0);
  assert.equal(result.kind, "FAILED");
  if (result.kind !== "FAILED") return;
  assert.equal(result.error.stage, "LOCAL_PREFLIGHT");
  assert.equal(classifyLiveOrderFailure(result.error.stage, result.error.remoteSubmissionAttempted).error, false);
});

test("submit preparation error before actual HTTP dispatch stays LOCAL_PREFLIGHT", async () => {
  let submitFunctionEntered = 0;
  const result = await runIdempotentOrderDispatch({
    clientOid: "mx_predispatch_error",
    symbol: "BTCUSDT",
    action: "OPEN_MARKET",
    queryExisting: async () => null,
    configureAccount: async () => undefined,
    submitOrder: async () => {
      submitFunctionEntered += 1;
      throw { message: "credentials/signature preparation failed", code: "LOCAL", httpStatus: null, ambiguous: false };
    },
    describeError: describe,
  });
  assert.equal(submitFunctionEntered, 1);
  assert.equal(result.kind, "FAILED");
  if (result.kind !== "FAILED") return;
  assert.equal(result.error.stage, "LOCAL_PREFLIGHT");
  assert.equal(result.error.remoteSubmissionAttempted, false);
  assert.equal(classifyLiveOrderFailure(result.error.stage, result.error.remoteSubmissionAttempted).error, false);
});

test("ambiguous dispatch plus failed clientOid lookup becomes STATUS_QUERY and is never retried", async () => {
  let submits = 0;
  let lookups = 0;
  const result = await runIdempotentOrderDispatch({
    clientOid: "mx_ambiguous_query_error",
    symbol: "BTCUSDT",
    action: "OPEN_MARKET",
    queryExisting: async () => {
      lookups += 1;
      if (lookups === 1) return null;
      throw { message: "order-info unavailable", code: "25000", httpStatus: 503 };
    },
    submitOrder: async (onRemoteDispatch) => {
      onRemoteDispatch();
      submits += 1;
      throw { message: "request timed out", code: "25001", httpStatus: 500, ambiguous: true };
    },
    describeError: describe,
  });
  assert.equal(submits, 1);
  assert.equal(lookups, 2);
  assert.equal(result.kind, "FAILED");
  if (result.kind !== "FAILED") return;
  assert.equal(result.error.stage, "STATUS_QUERY");
  assert.equal(result.error.remoteSubmissionAttempted, true);
  assert.equal(classifyLiveOrderFailure(result.error.stage, result.error.remoteSubmissionAttempted).error, false);
});

test("status query failure before dispatch is fail-closed and submits nothing", async () => {
  let submits = 0;
  const result = await runIdempotentOrderDispatch({
    clientOid: "mx_status_fail",
    symbol: "BTCUSDT",
    action: "OPEN_MARKET",
    queryExisting: async () => { throw { message: "order-info unavailable", code: "25000", httpStatus: 503 }; },
    configureAccount: async () => undefined,
    submitOrder: async () => { submits += 1; return { orderId: "x" }; },
    describeError: describe,
  });
  assert.equal(submits, 0);
  assert.equal(result.kind, "FAILED");
  if (result.kind !== "FAILED") return;
  assert.equal(result.error.stage, "STATUS_QUERY");
  assert.equal(result.error.remoteSubmissionAttempted, false);
});
