import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { finalizeRuntimeOwner } from "../lib/bitget/runtime-deadline-core.ts";

const source = readFileSync("lib/bitget/demo-runtime.ts", "utf8");
const ast = ts.createSourceFile("runtime.ts", source, ts.ScriptTarget.Latest, true);
const selected = ast.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === "updateRuntimeState");
const compiled = ts.transpileModule(selected.getText(ast) + "\nexports.update = updateRuntimeState;", {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const thresholds = Object.fromEntries(["API_FAILURE_PAUSE_THRESHOLD", "ORDER_FAILURE_PAUSE_THRESHOLD", "AUTO_RECOVERY_HEALTHY_RUNS"]
  .map(name => [name, Number(source.match(new RegExp(`const ${name} = (\\d+)`))[1])]));

function harness(initial = {}, { beforeLock, duringLock, ambiguousCommit = false } = {}) {
  const state = { paused: false, pause_source: "", pause_reason: "", consecutive_api_errors: 0,
    consecutive_order_errors: 0, consecutive_healthy_runs: 0, last_report: {}, ...initial };
  const calls = [];
  let locked = false, pendingManual = null;
  const manual = values => { if (locked) pendingManual = values; else Object.assign(state, values); };
  const tx = {
    $queryRaw: async strings => {
      assert.match(strings.join(""), /FOR UPDATE/);
      beforeLock?.(manual);
      locked = true;
      duringLock?.(manual);
      calls.push("lock");
      return [structuredClone(state)];
    },
    $executeRaw: async (strings, ...values) => {
      assert.equal(locked, true, "state writes must hold the row lock");
      calls.push("write");
      const sql = strings.reduce((s, part, i) => s + part + (i < values.length ? `PARAM${i}` : ""), "");
      for (const match of sql.matchAll(/(\w+) = PARAM(\d+)/g)) {
        const key = match[1], value = values[Number(match[2])];
        state[key] = key === "last_report" ? JSON.parse(value) : value;
      }
      if (/consecutive_healthy_runs = 0/.test(sql)) state.consecutive_healthy_runs = 0;
    },
  };
  const exports = {};
  vm.runInNewContext(compiled, { exports, ...thresholds, prisma: { $transaction: async fn => {
    try { return await fn(tx); }
    finally {
      locked = false;
      if (pendingManual) { Object.assign(state, pendingManual); pendingManual = null; }
      if (ambiguousCommit) { ambiguousCommit = false; throw new Error("commit response lost"); }
    }
  } } });
  let run = 0;
  return { state, calls, update: (overrides = {}, acquire = true) => {
    const runId = overrides.runId ?? `run-${++run}`;
    if (acquire) state.run_lock_owner = runId;
    return exports.update({
    runId, now: new Date(), quotes: [], marketEndpointOk: true, strategyRan: false,
    account: { connected: true }, orderAttempted: false, orderSuccess: false,
    criticalApiError: "", marketError: "", accountError: "", diagnosticError: "", orderErrors: 0, report: {}, ...overrides,
  }); } };
}

test("late settlement from an old owner cannot overwrite a newer cycle after health resets the report", async () => {
  const h = harness();
  await h.update({ runId: "A", orderErrors: 1 });
  h.state.run_lock_owner = "B";
  h.state.last_report = { stage: "HEALTH_READY" };
  const before = structuredClone(h.state);
  await assert.rejects(h.update({ runId: "A", orderErrors: 1, systemError: true, diagnosticError: "late failure" }, false), /RUNTIME_STATE_OWNER_CHANGED/);
  assert.deepEqual(h.state, before);
});

test("early health persistence is owner-fenced too", () => {
  const fn = ast.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === "persistRuntimeHealthSnapshot");
  assert.match(fn.getText(ast), /WHERE id = 'default' AND run_lock_owner = \$\{input.runId\}/);
  assert.match(fn.getText(ast), /if \(updated !== 1\) throw new Error\("RUNTIME_HEALTH_OWNER_CHANGED"\)/);
});

test("real finalizer failure paths leave an already-settled order failure counted once", async () => {
  for (const failAt of ["FINISH", "RELEASE"]) {
    const h = harness();
    const settle = (systemError = false) => h.update({ runId: "finalize", orderErrors: 1, systemError,
      diagnosticError: systemError ? failAt : "" });
    await assert.rejects(finalizeRuntimeOwner({
      allowCleanup: false,
      persistState: () => settle(),
      persistFinish: async () => { if (failAt === "FINISH") throw new Error("FINISH"); },
      cleanup: async () => {},
      releaseOwner: async () => { if (failAt === "RELEASE") throw new Error("RELEASE"); },
      onFinalizeErrorBeforeRelease: () => settle(true),
    }));
    if (failAt === "RELEASE") await settle(true);
    assert.equal(h.state.consecutive_order_errors, 1);
    assert.equal(h.state.consecutive_api_errors, 0);
    assert.equal(h.state.paused, false);
  }
});

test("one failed cycle plus FINISH/release failures counts once, including ambiguous commit", async () => {
  for (const ambiguousCommit of [false, true]) {
    const h = harness({}, { ambiguousCommit });
    const first = h.update({ runId: "same", orderErrors: 1 });
    if (ambiguousCommit) await assert.rejects(first, /commit response lost/); else await first;
    for (const failure of ["FINISH failed", "lease release failed"]) {
      await h.update({ runId: "same", orderErrors: 1, systemError: true, diagnosticError: failure });
    }
    assert.equal(h.state.consecutive_order_errors, 1);
    assert.equal(h.state.consecutive_api_errors, 0);
    assert.equal(h.state.paused, false);
    assert.equal(h.state.last_error, "lease release failed");
    await h.update({ orderErrors: 1 });
    assert.equal(h.state.paused, true);
    assert.equal(h.state.pause_source, "AUTO_ORDER");
  }
});

test("AUTO_ORDER cannot degrade into recoverable API pause", async () => {
  const h = harness({ paused: true, pause_source: "AUTO_ORDER", pause_reason: "order review required" });
  for (let i = 0; i < thresholds.API_FAILURE_PAUSE_THRESHOLD; i++) await h.update({ criticalApiError: "API failure" });
  for (let i = 0; i < thresholds.AUTO_RECOVERY_HEALTHY_RUNS + 1; i++) await h.update();
  assert.equal(h.state.paused, true);
  assert.equal(h.state.pause_source, "AUTO_ORDER");
  assert.equal(h.state.pause_reason, "order review required");
});

test("real API outage still pauses and only genuinely healthy cycles recover", async () => {
  const h = harness();
  for (let i = 0; i < thresholds.API_FAILURE_PAUSE_THRESHOLD; i++) await h.update({ criticalApiError: "API failure" });
  assert.equal(h.state.pause_source, "AUTO_API");
  await h.update({ systemError: true, diagnosticError: "database log failure" });
  assert.equal(h.state.consecutive_healthy_runs, 0);
  assert.equal(h.state.consecutive_api_errors, 0, "a system error must not impersonate a Bitget error");
  assert.equal(h.state.paused, true);
  for (let i = 0; i < thresholds.AUTO_RECOVERY_HEALTHY_RUNS; i++) await h.update();
  assert.equal(h.state.paused, false);
});

test("critical errors cannot count as healthy despite connected account and fresh market", async () => {
  const h = harness({ paused: true, pause_source: "AUTO_API", consecutive_healthy_runs: 1 });
  await h.update({ criticalApiError: "critical" });
  assert.equal(h.state.consecutive_healthy_runs, 0);
  assert.equal(h.state.paused, true);
});

test("failed engine reports do not count towards health recovery even when APIs are connected", async () => {
  const h = harness({ paused: true, pause_source: "AUTO_API", consecutive_healthy_runs: 1 });
  await h.update({ report: { ok: false } });
  assert.equal(h.state.consecutive_healthy_runs, 0);
  assert.equal(h.state.paused, true);
});

test("administrator changes before and during settlement are not overwritten", async () => {
  for (const timing of ["beforeLock", "duringLock"]) {
    for (const paused of [false, true]) {
      const change = { paused, pause_source: paused ? "MANUAL" : "", pause_reason: paused ? "user pause" : "",
        consecutive_api_errors: 0, consecutive_order_errors: 0, consecutive_healthy_runs: 0 };
      const h = harness({ paused: !paused, pause_source: paused ? "" : "MANUAL" }, { [timing]: manual => manual(change) });
      await h.update();
      assert.equal(h.state.paused, paused);
      assert.equal(h.state.pause_source, change.pause_source);
      assert.equal(h.state.pause_reason, change.pause_reason);
    }
  }
});

test("manual pause survives API failures and healthy cycles", async () => {
  const h = harness({ paused: true, pause_source: "MANUAL", pause_reason: "user pause" });
  for (let i = 0; i < 7; i++) await h.update({ criticalApiError: "API failure" });
  for (let i = 0; i < 3; i++) await h.update();
  assert.equal(h.state.paused, true);
  assert.equal(h.state.pause_source, "MANUAL");
});
