import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as core from "../lib/bitget/live-continuous-transition-core";

const now = new Date();
const row = { status: "COMPLETED", duration_mode: "FIXED", started_at: new Date(now.getTime()-40*86400000), ends_at: new Date(now.getTime()-86400000),
  stop_reason: "30天实盘实验到期，已停止新开仓。", initial_equity_usdt: 1000, current_equity_usdt: 1002,
  peak_equity_usdt: 1006, max_drawdown_usdt: 6, max_drawdown_pct: 0.6, entry_epoch_at: null };
const evidence = { row, equity: 1002, openingEquity: 1001, dailyLossLimit: 10, drawdownLimit: 50, observedAt: now.getTime(), now };
test("transition permits only expired fixed completion, never a stop/risk restart", () => {
  assert.doesNotThrow(() => core.assertContinuousTransition(evidence));
  for (const patch of [{ status: "STOPPED" }, { status: "ACTIVE" }, { stop_reason: "总止损" }, { ends_at: null }, { duration_mode: "CONTINUOUS" }]) {
    assert.throws(() => core.assertContinuousTransition({ ...evidence, row: { ...row, ...patch } }));
  }
});
test("transition retains risk thresholds, rejects missing/current and historical breach", () => {
  for (const patch of [{ equity: 991 }, { equity: 956 }, { openingEquity: NaN }, { observedAt: now.getTime()-30001 },
    { observedAt: now.getTime()+1 }, { drawdownLimit: 0 }, { row: { ...row, max_drawdown_usdt: 50 } }, { row: { ...row, initial_equity_usdt: null } }]) {
    assert.throws(() => core.assertContinuousTransition({ ...evidence, ...patch }));
  }
});
test("strict empty proof rejects missing, malformed, zero-size, hidden and paginated rows", () => {
  const empty = [{ list: [] }, { list: [], cursor: "" }, [], []];
  core.assertEmptyExchangePayloads(...empty as [unknown, unknown, unknown, unknown]);
  for (let n = 0; n < 4; n++) {
    for (const value of [null, {}, [null], { list: [{ total: 0 }] }, { list: [], cursor: "next" }]) {
      const items = [...empty]; items[n] = value as never;
      assert.throws(() => core.assertEmptyExchangePayloads(...items as [unknown, unknown, unknown, unknown]));
    }
  }
});
test("converted entry epochs reject all pre-conversion or missing decision evidence", () => {
  const epoch = now.toISOString();
  core.assertCurrentEntryEpoch(epoch, now, now);
  core.assertCurrentEntryEpoch(null, null, now);
  for (const date of [null, "bad", new Date(now.getTime()-1), new Date(now.getTime()+1)]) assert.throws(() => core.assertCurrentEntryEpoch(epoch, date, now));
  assert.throws(() => core.assertCurrentEntryEpoch("bad", now, now));
});
function compile(path: string) { return ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText; }
function storeHarness(overrides: Record<string, unknown> = {}) {
  const writes: Array<{sql: string; values: unknown[]}> = [], events: unknown[] = [], reads: string[] = [];
  const configuration = { account: { id: "official", mode: "MANAGE_ONLY", newEntriesEnabled: false, positionManagementEnabled: true },
    runtime: { run_lock_until: null, run_lock_owner: null }, row, unsettled: 0, decisions: 0, slices: 0, daily: [{ opening_equity_usdt: 1001 }], ...overrides };
  const exports: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
  const tx = {
    $queryRaw: async (strings: TemplateStringsArray) => {
      const sql = strings.join("?"); reads.push(sql);
      if (sql.includes('FROM "MooxUnifiedLiveAccount"')) return [configuration.account];
      if (sql.includes("FROM trade_bitget_runtime_state")) return [configuration.runtime];
      if (sql.includes("FROM trade_bitget_live_experiment")) return [configuration.row];
      if (sql.includes("FROM trade_execution_outbox")) return [{ count: configuration.unsettled }];
      if (sql.includes("FROM trade_three_horizon_decisions")) return [{ count: configuration.decisions }];
      if (sql.includes("FROM trade_bitget_live_daily_snapshots")) return configuration.daily;
      throw new Error("unexpected SQL");
    },
    $executeRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => { writes.push({ sql: strings.join("?"), values }); return 1; },
    mooxUnifiedLiveSlice: { count: async () => configuration.slices },
    mooxUnifiedLiveEvent: { create: async (event: unknown) => { events.push(event); return event; } },
  };
  vm.runInNewContext(compile("lib/trading-signals/live-continuous-transition-store.ts"), { exports, Date, require: (name: string) => {
    if (name.endsWith("/prisma")) return { prisma: { $transaction: (fn: (tx: unknown) => unknown) => fn(tx) } };
    if (name.endsWith("/demo-client")) return { readBitgetContinuousTransitionSnapshot: async () => {
      if (overrides.failExchange) throw new Error("EXCHANGE_UNKNOWN");
      return { observedAt: Date.now(), equity: 1002, dailyLossLimit: 10, drawdownLimit: 50 };
    } };
    if (name.endsWith("live-continuous-transition-core")) return core;
    throw new Error("unexpected import");
  } });
  return { run: () => exports.prepareContinuousDuration("admin-actor"), inspect: () => exports.inspectContinuousDuration("admin-actor"), writes, events, reads };
}

test("read-only inspection uses the same gates but never writes lifecycle or events", async () => {
  const h = storeHarness();
  assert.equal((await h.inspect() as { readyToPrepare: boolean }).readyToPrepare, true);
  assert.equal(h.writes.length, 0); assert.equal(h.events.length, 0);
  for (const patch of [{ failExchange: true }, { daily: [] }, { unsettled: 1 }, { account: { mode: "LIVE" } }]) {
    const blocked = storeHarness(patch); await assert.rejects(blocked.inspect());
    assert.equal(blocked.writes.length, 0); assert.equal(blocked.events.length, 0);
  }
});
test("real store changes only lifecycle and records original evidence; never account mode or risk", async () => {
  const h = storeHarness(); const result = await h.run() as { ok: boolean; newEntriesEnabled: boolean };
  assert.equal(result.ok, true); assert.equal(result.newEntriesEnabled, false);
  assert.equal(h.writes.length, 1); assert.equal(h.events.length, 1);
  assert.match(h.writes[0].sql, /entry_epoch_at/);
  assert.doesNotMatch(h.writes[0].sql, /initial_equity|peak_equity|max_drawdown|DELETE|MooxUnifiedLiveAccount|started_at/);
  assert.match(JSON.stringify(h.events), /initial_equity_usdt.*1000/);
  assert.ok(h.reads.filter(s => s.includes("FOR UPDATE NOWAIT")).length === 3);
});
test("real store rejects active mode, runtime owner, unresolved tasks, exposure and missing daily history before writes", async () => {
  for (const overrides of [{ account: { mode: "LIVE" } }, { runtime: { run_lock_owner: "old", run_lock_until: new Date(0) } },
    { unsettled: 1 }, { decisions: 1 }, { slices: 1 }, { daily: [] }, { failExchange: true }, { row: { ...row, status: "STOPPED" } }]) {
    const h = storeHarness(overrides); await assert.rejects(h.run()); assert.equal(h.writes.length, 0); assert.equal(h.events.length, 0);
  }
});
test("repeated preparation cannot reset or renew a continuous account", async () => {
  const h = storeHarness({ row: { ...row, status: "ACTIVE", duration_mode: "CONTINUOUS", ends_at: null, entry_epoch_at: now } });
  assert.equal((await h.run() as { alreadyApplied: boolean }).alreadyApplied, true);
  assert.equal(h.writes.length, 0); assert.equal(h.events.length, 0);
});
test("route authenticates and checks same origin and exact confirmation before store", async () => {
  for (const settings of [{ admin: false }, { origin: "https://bad.example" }, { body: "{}" }, { body: '{"confirmation":"PREPARE_CONTINUOUS_KEEP_RISK","extra":true}' }, {}]) {
    const option = { admin: true, origin: "https://mooxintel.com", body: JSON.stringify({ confirmation: core.CONTINUOUS_CONFIRMATION }), ...settings };
    let calls = 0;
    const exports: Record<string, (r: unknown) => Promise<{status: number}>> = {};
    vm.runInNewContext(compile("app/api/admin/live-trading/continuous-duration/route.ts"), { exports, URL, require: (name: string) => {
      if (name === "next/server") return { NextResponse: { json: (data: unknown, init: {status?: number} = {}) => ({ data, status: init.status ?? 200 }) } };
      if (name.endsWith("unified-live-auth")) return { resolveUnifiedLiveActor: async () => ({ id: "actor" }), isUnifiedLiveAdmin: async () => option.admin };
      if (name.endsWith("live-continuous-transition-core")) return core;
      if (name.endsWith("live-continuous-transition-store")) return { prepareContinuousDuration: async () => { calls++; return { ok: true }; } };
      throw new Error("unexpected import");
    } });
    const result = await exports.POST({ url: "https://mooxintel.com/api/admin/live-trading/continuous-duration", headers: new Headers({ origin: option.origin, "content-type": "application/json" }), text: async () => option.body });
    assert.equal(result.status, !option.admin ? 404 : option.origin.includes("bad") ? 403 : option.body !== JSON.stringify({ confirmation: core.CONTINUOUS_CONFIRMATION }) ? 400 : 200);
    assert.equal(calls, result.status === 200 ? 1 : 0);
  }
});

test("GET is admin-only, calls inspection not preparation, and sanitizes errors", async () => {
  for (const admin of [false, true]) for (const failure of ["", "EXCHANGE_UNKNOWN", "secret connection data"]) {
    let inspected = 0;
    const exports: Record<string, (r: unknown) => Promise<{status: number; data: unknown}>> = {};
    vm.runInNewContext(compile("app/api/admin/live-trading/continuous-duration/route.ts"), { exports, URL, Error, console: { warn() {} }, require: (name: string) => {
      if (name === "next/server") return { NextResponse: { json: (data: unknown, init: {status?: number} = {}) => ({ data, status: init.status ?? 200 }) } };
      if (name.endsWith("unified-live-auth")) return { resolveUnifiedLiveActor: async () => ({ id: "actor" }), isUnifiedLiveAdmin: async () => admin };
      if (name.endsWith("live-continuous-transition-core")) return core;
      if (name.endsWith("live-continuous-transition-store")) return {
        prepareContinuousDuration: () => { throw new Error("GET MUST NOT PREPARE"); },
        inspectContinuousDuration: async () => { inspected++; if (failure) throw new Error(failure); return { readyToPrepare: true }; },
      };
      throw new Error("unexpected import");
    } });
    const result = await exports.GET({});
    assert.equal(inspected, admin ? 1 : 0);
    assert.equal(result.status, !admin ? 404 : !failure ? 200 : failure === "EXCHANGE_UNKNOWN" ? 409 : 503);
    assert.doesNotMatch(JSON.stringify(result), /secret connection/);
  }
});
