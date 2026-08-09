import assert from "node:assert/strict";
import test from "node:test";
import { guardRuntimeAdminAction } from "../lib/bitget/runtime-admin-action-core";
import { LIVE_RESUME_CONFIRMATION_PHRASE } from "../lib/bitget/legacy-order-reconciliation-core";

type State = { paused: boolean; pauseSource: string; pauseReason: string; consecutiveOrderErrors: number };

function harness(initial: State, safe: boolean) {
  let state = { ...initial };
  let setPausedCalls = 0;
  let auditCalls = 0;
  return {
    get state() { return state; },
    get setPausedCalls() { return setPausedCalls; },
    get auditCalls() { return auditCalls; },
    input: {
      getState: async () => state,
      setPaused: async (paused: boolean) => {
        setPausedCalls += 1;
        state = { ...state, paused, pauseSource: paused ? state.pauseSource : "", pauseReason: paused ? state.pauseReason : "" };
        return state;
      },
      auditFailures: async () => {
        auditCalls += 1;
        return { safeToConsiderResume: safe, summary: safe ? "safe" : "unsafe", positionsCount: 0, openOrdersCount: 0, pendingStrategyOrdersCount: 0, legacyUnresolvedCount: safe ? 0 : 10 };
      },
    },
  };
}

test("paused RUN_NOW stays 409 and never changes pause state", async () => {
  const h = harness({ paused: true, pauseSource: "AUTO_ORDER", pauseReason: "order errors", consecutiveOrderErrors: 2 }, false);
  const result = await guardRuntimeAdminAction({ action: "RUN_NOW", strictResumeGate: true, ...h.input });
  assert.equal(result.status, 409);
  assert.equal(h.setPausedCalls, 0);
  assert.equal(h.state.paused, true);
});

test("AUTO_ORDER unsafe audit rejects RESUME and preserves paused state/error count", async () => {
  const h = harness({ paused: true, pauseSource: "AUTO_ORDER", pauseReason: "order errors", consecutiveOrderErrors: 2 }, false);
  const result = await guardRuntimeAdminAction({ action: "RESUME", resumeConfirmation: LIVE_RESUME_CONFIRMATION_PHRASE, strictResumeGate: true, ...h.input });
  assert.equal(result.status, 409);
  assert.equal(h.auditCalls, 1);
  assert.equal(h.setPausedCalls, 0);
  assert.equal(h.state.consecutiveOrderErrors, 2);
});

test("missing explicit resume phrase rejects before audit", async () => {
  const h = harness({ paused: true, pauseSource: "AUTO_ORDER", pauseReason: "order errors", consecutiveOrderErrors: 2 }, true);
  const result = await guardRuntimeAdminAction({ action: "RESUME", resumeConfirmation: "wrong", strictResumeGate: true, ...h.input });
  assert.equal(result.status, 409);
  assert.equal(h.auditCalls, 0);
  assert.equal(h.setPausedCalls, 0);
});

test("safe audit plus explicit phrase resumes only; it does not invoke a run function", async () => {
  const h = harness({ paused: true, pauseSource: "AUTO_ORDER", pauseReason: "order errors", consecutiveOrderErrors: 2 }, true);
  const result = await guardRuntimeAdminAction({ action: "RESUME", resumeConfirmation: LIVE_RESUME_CONFIRMATION_PHRASE, strictResumeGate: true, ...h.input });
  assert.equal(result.status, 200);
  assert.equal(h.auditCalls, 1);
  assert.equal(h.setPausedCalls, 1);
  assert.equal(h.state.paused, false);
});
