import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as control from "../lib/trading-signals/unified-live-admin-control-core.ts";

const source = readFileSync("app/api/admin/live-trading/route.ts", "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function route({ admin = true, rows = [], failRead = false } = {}) {
  const calls = { reads: 0, writes: [], inspections: 0 };
  const status = { migrationRequired: false, account: { mode: "LIVE" }, audit: { freezeNewEntries: false, issues: [] } };
  const exports = {};
  vm.runInNewContext(code, { exports, require(name) {
    if (name === "next/server") return { NextResponse: { json: (data, options) => ({ data, status: options?.status ?? 200 }) } };
    if (name === "@/lib/prisma") return { prisma: { $queryRaw: async (query) => {
      calls.reads++;
      assert.match(query.join(""), /SELECT status, started_at, ends_at FROM trade_bitget_live_experiment WHERE id = 'default' LIMIT 1/);
      assert.doesNotMatch(query.join(""), /INSERT|UPDATE|DELETE|CREATE|ALTER/);
      if (failRead) throw new Error("private DB diagnostic must not leak");
      return rows;
    } } };
    if (name.endsWith("unified-live-auth")) return { resolveUnifiedLiveActor: async () => ({}), isUnifiedLiveAdmin: async () => admin };
    if (name.endsWith("unified-live-config")) return {
      isUnifiedLiveActiveExecutionEnabled: () => true,
      readUnifiedLiveRuntimeConfig: () => ({ mode: "LIVE", allowLiveSwitch: true, allowNewEntriesByEnv: true, positionManagementEnabled: true }),
    };
    if (name.endsWith("demo-client")) return { getBitgetDemoEnvironment: () => ({ mode: "LIVE_EXPERIMENT", configured: true, executionAllowed: true, liveConfirmationAccepted: true, liveInitialCapitalUsdt: 1000 }) };
    if (name.endsWith("unified-live-runtime")) return {
      inspectUnifiedLiveCustody: async () => { calls.inspections++; return status; },
      getUnifiedLiveRuntimeStatus: async () => status,
      runUnifiedLiveCustodyCycle: () => { throw new Error("unexpected custody mutation"); },
    };
    if (name.endsWith("unified-live-store")) return { setUnifiedLiveMode: async (body) => { calls.writes.push(body); return body; } };
    if (name.endsWith("unified-live-admin-control-core")) return control;
    throw new Error(`unexpected import ${name}`);
  } });
  return { ...exports, calls, post: (mode) => exports.POST({ json: async () => ({ action: "SET_MODE", mode, confirmation: "LIVE1000" }) }) };
}
const expired = [{ status: "ACTIVE", started_at: new Date("2000-01-01Z"), ends_at: new Date("2000-02-01Z") }];
test("GET and LIVE POST both use fresh experiment evidence; expiry never changes the mode", async () => {
  const api = route({ rows: expired });
  const read = await api.GET({});
  assert.equal(read.data.restoreBlockers[0].code, "LIVE_EXPERIMENT_EXPIRED");
  assert.equal(api.calls.writes.length, 0);
  const post = await api.post("LIVE");
  assert.equal(post.status, 409);
  assert.equal(post.data.blockers[0].code, "LIVE_EXPERIMENT_EXPIRED");
  assert.equal(api.calls.reads, 2);
  assert.equal(api.calls.writes.length, 0);
});
test("missing or failed reads fail closed without raw database details", async () => {
  for (const failRead of [false, true]) {
    const api = route({ failRead });
    const read = await api.GET({});
    assert.equal(read.data.restoreBlockers[0].code, "LIVE_EXPERIMENT_UNAVAILABLE");
    assert.doesNotMatch(JSON.stringify(read.data), /private DB diagnostic/);
    const post = await api.post("LIVE");
    assert.equal(post.status, 409);
    assert.equal(post.data.blockers[0].code, "LIVE_EXPERIMENT_UNAVAILABLE");
    assert.doesNotMatch(JSON.stringify(post.data), /private DB diagnostic/);
    assert.equal(api.calls.writes.length, 0);
  }
});
test("closing remains possible without querying or renewing the experiment", async () => {
  const api = route({ failRead: true });
  assert.equal((await api.post("MANAGE_ONLY")).status, 200);
  assert.equal(api.calls.reads, 0);
  assert.equal(api.calls.writes[0].newEntriesEnabled, false);
  assert.equal(api.calls.writes[0].positionManagementEnabled, true);
});
test("authorization is checked before experiment reads or writes", async () => {
  const api = route({ admin: false });
  assert.equal((await api.GET({})).status, 404);
  assert.equal((await api.post("LIVE")).status, 404);
  assert.equal(api.calls.reads, 0);
  assert.equal(api.calls.inspections, 0);
  assert.equal(api.calls.writes.length, 0);
});

test("active in-date experiment preserves the existing explicit LIVE path", async () => {
  const api = route({ rows: [{ status: "ACTIVE", started_at: new Date("2020-01-01T00:00:00Z"), ends_at: new Date("2099-01-01T00:00:00Z") }] });
  assert.equal((await api.GET({})).data.restoreBlockers.length, 0);
  assert.equal((await api.post("LIVE")).status, 200);
  assert.equal(api.calls.reads, 2);
  assert.equal(api.calls.writes.length, 1);
  assert.equal(api.calls.writes[0].newEntriesEnabled, true);
  assert.equal(api.calls.writes[0].positionManagementEnabled, true);
});
