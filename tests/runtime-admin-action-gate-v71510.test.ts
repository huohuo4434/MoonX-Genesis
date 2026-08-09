import test from "node:test";
import assert from "node:assert/strict";
import { guardRuntimeAdminAction } from "../lib/bitget/runtime-admin-action-core";
import { LIVE_RESUME_CONFIRMATION_PHRASE } from "../lib/bitget/legacy-order-reconciliation-core";

type State = {
  paused: boolean;
  pauseSource: string;
  pauseReason: string;
  consecutiveOrderErrors: number;
};

function state(overrides: Partial<State> = {}): State {
  return {
    paused: true,
    pauseSource: "AUTO_ORDER",
    pauseReason: "连续订单错误",
    consecutiveOrderErrors: 2,
    ...overrides,
  };
}

test("AUTO_ORDER + unsafe audit: RESUME is 409 and state stays paused", async () => {
  let current = state();
  let setPausedCalls = 0;
  const result = await guardRuntimeAdminAction({
    action: "RESUME",
    resumeConfirmation: LIVE_RESUME_CONFIRMATION_PHRASE,
    getState: async () => current,
    setPaused: async (paused) => {
      setPausedCalls += 1;
      current = { ...current, paused, pauseSource: paused ? current.pauseSource : "", consecutiveOrderErrors: paused ? current.consecutiveOrderErrors : 0 };
      return current;
    },
    auditFailures: async () => ({
      safeToConsiderResume: false,
      summary: "存在未核对ORDER_ERROR",
      positionsCount: 0,
      pendingStrategyOrdersCount: 0,
    }),
  });
  assert.equal(result.status, 409);
  assert.equal(result.allowed, false);
  assert.equal(setPausedCalls, 0);
  assert.equal(current.paused, true);
  assert.equal(current.consecutiveOrderErrors, 2);
});

test("AUTO_ORDER + safe audit: RESUME is allowed only after same-request audit", async () => {
  let current = state();
  let auditCalls = 0;
  let setPausedCalls = 0;
  const result = await guardRuntimeAdminAction({
    action: "RESUME",
    resumeConfirmation: LIVE_RESUME_CONFIRMATION_PHRASE,
    getState: async () => current,
    setPaused: async (paused) => {
      setPausedCalls += 1;
      current = { ...current, paused, pauseSource: paused ? current.pauseSource : "", consecutiveOrderErrors: paused ? current.consecutiveOrderErrors : 0 };
      return current;
    },
    auditFailures: async () => {
      auditCalls += 1;
      return {
        safeToConsiderResume: true,
        summary: "全部远端引用已核对为空",
        positionsCount: 0,
        pendingStrategyOrdersCount: 0,
      };
    },
  });
  assert.equal(result.status, 200);
  assert.equal(result.allowed, true);
  assert.equal(auditCalls, 1);
  assert.equal(setPausedCalls, 1);
  assert.equal(current.paused, false);
});

test("paused RUN_NOW is rejected with 409 and never changes runtime state", async () => {
  const current = state({ pauseSource: "MANUAL" });
  let setPausedCalls = 0;
  let auditCalls = 0;
  const result = await guardRuntimeAdminAction({
    action: "RUN_NOW",
    getState: async () => current,
    setPaused: async () => { setPausedCalls += 1; return current; },
    auditFailures: async () => {
      auditCalls += 1;
      return { safeToConsiderResume: true, summary: "irrelevant", positionsCount: 0, pendingStrategyOrdersCount: 0 };
    },
  });
  assert.equal(result.status, 409);
  assert.equal(result.allowed, false);
  assert.equal(setPausedCalls, 0);
  assert.equal(auditCalls, 0);
});

test("unpaused RUN_NOW passes the server gate", async () => {
  const current = state({ paused: false, pauseSource: "", pauseReason: "", consecutiveOrderErrors: 0 });
  const result = await guardRuntimeAdminAction({
    action: "RUN_NOW",
    getState: async () => current,
    setPaused: async () => current,
    auditFailures: async () => ({ safeToConsiderResume: false, summary: "unused", positionsCount: 0, pendingStrategyOrdersCount: 0 }),
  });
  assert.equal(result.status, 200);
  assert.equal(result.allowed, true);
  assert.equal(result.handled, false);
});

test("AUTO_ORDER paused + PAUSE is idempotent and cannot rewrite recovery source/counters", async () => {
  let current = state({ pauseSource: "AUTO_ORDER", pauseReason: "连续订单错误", consecutiveOrderErrors: 3 });
  let setPausedCalls = 0;
  let auditCalls = 0;

  const pauseResult = await guardRuntimeAdminAction({
    action: "PAUSE",
    pauseReason: "管理员又点了一次暂停",
    getState: async () => current,
    setPaused: async (paused, reason) => {
      setPausedCalls += 1;
      current = {
        ...current,
        paused,
        pauseSource: paused ? "MANUAL" : "",
        pauseReason: paused ? String(reason ?? "") : "",
        consecutiveOrderErrors: paused ? current.consecutiveOrderErrors : 0,
      };
      return current;
    },
    auditFailures: async () => {
      auditCalls += 1;
      return { safeToConsiderResume: false, summary: "unsafe", positionsCount: 0, pendingStrategyOrdersCount: 0 };
    },
  });

  assert.equal(pauseResult.status, 200);
  assert.equal(setPausedCalls, 0);
  assert.equal(auditCalls, 0);
  assert.equal(current.paused, true);
  assert.equal(current.pauseSource, "AUTO_ORDER");
  assert.equal(current.pauseReason, "连续订单错误");
  assert.equal(current.consecutiveOrderErrors, 3);

  const resumeResult = await guardRuntimeAdminAction({
    action: "RESUME",
    resumeConfirmation: LIVE_RESUME_CONFIRMATION_PHRASE,
    getState: async () => current,
    setPaused: async (paused) => {
      setPausedCalls += 1;
      current = { ...current, paused, pauseSource: paused ? current.pauseSource : "", consecutiveOrderErrors: paused ? current.consecutiveOrderErrors : 0 };
      return current;
    },
    auditFailures: async () => {
      auditCalls += 1;
      return { safeToConsiderResume: false, summary: "仍有未核对失败订单", positionsCount: 0, pendingStrategyOrdersCount: 0 };
    },
  });

  assert.equal(resumeResult.status, 409);
  assert.equal(resumeResult.allowed, false);
  assert.equal(auditCalls, 1);
  assert.equal(setPausedCalls, 0);
  assert.equal(current.pauseSource, "AUTO_ORDER");
  assert.equal(current.consecutiveOrderErrors, 3);
});

test("AUTO_API paused + PAUSE is idempotent and preserves AUTO_API source", async () => {
  let current = state({ pauseSource: "AUTO_API", pauseReason: "连续API错误", consecutiveOrderErrors: 1 });
  let setPausedCalls = 0;
  const result = await guardRuntimeAdminAction({
    action: "PAUSE",
    getState: async () => current,
    setPaused: async (paused, reason) => {
      setPausedCalls += 1;
      current = { ...current, paused, pauseSource: paused ? "MANUAL" : "", pauseReason: String(reason ?? "") };
      return current;
    },
    auditFailures: async () => ({ safeToConsiderResume: false, summary: "unused", positionsCount: 0, pendingStrategyOrdersCount: 0 }),
  });
  assert.equal(result.status, 200);
  assert.equal(setPausedCalls, 0);
  assert.equal(current.pauseSource, "AUTO_API");
  assert.equal(current.pauseReason, "连续API错误");
  assert.equal(current.consecutiveOrderErrors, 1);
});
