import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { presentLiveControlHistory } from "../lib/presentation/live-control-history.ts";

function compile(path, names) {
  const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
  const selected = source.statements.filter(s => ts.isFunctionDeclaration(s) && names.includes(s.name?.text));
  assert.equal(selected.length, names.length);
  return ts.transpileModule(selected.map(s => s.getText(source)).join("\n"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
}
const storeCode = compile("lib/trading-signals/unified-live-store.ts", ["setUnifiedLiveMode", "getUnifiedLiveControlHistory"]);
const routeCode = compile("app/api/admin/live-trading/route.ts", ["GET", "POST"]);
const gateCode = compile("lib/trading-signals/unified-live-entry-gate.ts", ["summarizeUnifiedLiveNewEntryGate", "evaluateUnifiedLiveNewEntryGateReadOnly"]);
const stamp = new Date("2026-09-07T00:00:00Z");
const liveInput = { ownerKey: "official", mode: "LIVE", newEntriesEnabled: true, positionManagementEnabled: true,
  actorId: "authenticated-admin", expectedUpdatedAt: stamp };
function storeHarness({ currentStamp = stamp, eventFails = false } = {}) {
  let current = { id: "account", ownerKey: "official", mode: "MANAGE_ONLY", newEntriesEnabled: false,
    positionManagementEnabled: true, updatedAt: currentStamp };
  const events = [], queries = [], exports = {};
  const database = {
    mooxUnifiedLiveEvent: { findFirst: async query => { queries.push(query); return events.at(-1) ?? null; } },
    $transaction: async fn => {
      const before = { ...current }, eventCount = events.length;
      const update = async ({ data }) => {
        current = { ...current, ...data, updatedAt: new Date(+current.updatedAt + 1) };
        return current;
      };
      try {
        return await fn({
          mooxUnifiedLiveAccount: {
            update,
            updateMany: async query => {
              if (+query.where.updatedAt !== +current.updatedAt || query.where.ownerKey !== current.ownerKey) return { count: 0 };
              await update(query); return { count: 1 };
            },
            findUniqueOrThrow: async () => current,
          },
          mooxUnifiedLiveEvent: { create: async ({ data }) => {
            if (eventFails) throw new Error("AUDIT_WRITE_FAILED");
            events.push({ ...data, createdAt: current.updatedAt });
          } },
        });
      } catch (error) { current = before; events.length = eventCount; throw error; }
    },
  };
  vm.runInNewContext(storeCode, { exports, requireUnifiedLiveDatabase: () => database, Error });
  return { ...exports, current: () => current, events, queries };
}
const plain = x => JSON.parse(JSON.stringify(x));

test("late LIVE preflight cannot overwrite a later stop; missing version never enables", async () => {
  for (const expectedUpdatedAt of [stamp, undefined]) {
    const h = storeHarness({ currentStamp: new Date(+stamp + 1000) });
    await assert.rejects(h.setUnifiedLiveMode({ ...liveInput, expectedUpdatedAt }), /LIVE_CONTROL_STATE_CHANGED/);
    assert.equal(h.current().newEntriesEnabled, false);
    assert.equal(h.events.length, 0);
  }
});
test("mode and authenticated audit are atomic; audit failure rolls permission back", async () => {
  const h = storeHarness();
  await h.setUnifiedLiveMode(liveInput);
  assert.equal(h.current().mode, "LIVE");
  assert.equal(h.events.length, 1);
  assert.equal(JSON.parse(h.events[0].detail).actorId, "authenticated-admin");
  assert.equal(JSON.parse(h.events[0].detail).source, "ADMIN_SET_MODE");
  const failing = storeHarness({ eventFails: true });
  await assert.rejects(failing.setUnifiedLiveMode(liveInput), /AUDIT_WRITE_FAILED/);
  assert.equal(failing.current().newEntriesEnabled, false);
  assert.equal(failing.events.length, 0);
});
test("manual stop is not rejected by stale preflight version", async () => {
  const h = storeHarness();
  await h.setUnifiedLiveMode(liveInput);
  await h.setUnifiedLiveMode({ ...liveInput, mode: "PAUSED", newEntriesEnabled: false, positionManagementEnabled: false });
  assert.equal(h.current().mode, "PAUSED");
  assert.equal(h.current().positionManagementEnabled, false);
  assert.equal(h.events.length, 2);
});
test("history selects latest manual OR automatic transition before limit", async () => {
  const h = storeHarness();
  await h.setUnifiedLiveMode(liveInput);
  await h.setUnifiedLiveMode({ ...liveInput, mode: "MANAGE_ONLY", newEntriesEnabled: false });
  const history = await h.getUnifiedLiveControlHistory("account");
  assert.match(presentLiveControlHistory(history).latest.label, /管理员关闭/);
  assert.deepEqual(plain(h.queries[0].where), { accountId: "account", code: { in: ["CUSTODY_NEW_ENTRIES_FROZEN", "ADMIN_MODE_CHANGED"] } });
  assert.deepEqual(plain(h.queries[0].orderBy), { createdAt: "desc" });
});
test("history output never includes raw identifiers or errors and treats unknowns honestly", () => {
  const row = { code: "CUSTODY_NEW_ENTRIES_FROZEN", detail: "CRON: PROTECTION_MISSING(INTCUSDT) secret=do-not-output", createdAt: stamp };
  const view = presentLiveControlHistory({ available: true, latest: row });
  assert.match(view.latest.label, /保护不完整/);
  assert.doesNotMatch(JSON.stringify(view), /secret|INTCUSDT|CRON/);
  assert.equal(view.latest.at, stamp.toISOString());
  assert.equal(presentLiveControlHistory({ available: false, latest: null }).available, false);
  assert.equal(presentLiveControlHistory({ available: true, latest: { ...row, createdAt: "bad" } }).latest, null);
  assert.match(presentLiveControlHistory({ available: true, latest: { ...row, code: "ADMIN_MODE_CHANGED", detail: "bad-json" } }).latest.label, /待核查/);
});
function routeHarness(extra = {}) {
  const exports = {}, calls = [];
  vm.runInNewContext(routeCode, { exports, Error,
    NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) },
    requireAdmin: async () => ({ id: "server-actor" }),
    inspectUnifiedLiveCustody: async () => { throw new Error("UNEXPECTED_EXCHANGE_IO"); },
    getUnifiedLiveAuthorityVersion: async () => { throw new Error("UNEXPECTED_AUTHORITY_IO"); },
    setUnifiedLiveMode: async input => { calls.push(input); return { id: "account" }; },
    ...extra,
  });
  return { ...exports, calls };
}
const request = payload => ({ json: async () => payload });
test("POST stop never waits for exchange IO and trusts server actor only", async () => {
  const h = routeHarness();
  const result = await h.POST(request({ action: "SET_MODE", mode: "MANAGE_ONLY", actorId: "forged" }));
  assert.equal(result.status, 200);
  assert.equal(h.calls[0].actorId, "server-actor");
  assert.equal(h.calls[0].newEntriesEnabled, false);
});
test("unauthorized GET and POST return before all custody reads/writes", async () => {
  const h = routeHarness({ requireAdmin: async () => null });
  assert.equal((await h.GET({})).status, 404);
  assert.equal((await h.POST({})).status, 404);
  assert.equal(h.calls.length, 0);
});
test("GET refresh reads only and returns safe history; zero mode changes", async () => {
  const h = routeHarness({
    inspectUnifiedLiveCustody: async () => ({ account: { id: "account" }, audit: {} }),
    readRestoreReadiness: async () => ({}), buildUnifiedLiveRestoreBlockers: () => [],
    getUnifiedLiveControlHistory: async () => ({ available: false, latest: null }), presentLiveControlHistory,
  });
  const result = await h.GET({});
  assert.equal(result.status, 200);
  assert.equal(result.body.controlHistory.available, false);
  assert.equal(h.calls.length, 0);
});
test("LIVE route forwards captured version and returns conflict, never auto-retries", async () => {
  let applications = 0;
  const h = routeHarness({
    getUnifiedLiveAuthorityVersion: async () => ({ updatedAt: stamp }),
    inspectUnifiedLiveCustody: async () => ({}), readRestoreReadiness: async () => ({}),
    applyUnifiedLiveModeChange: async ({ apply }) => apply("LIVE"),
    setUnifiedLiveMode: async input => {
      applications++; assert.equal(input.expectedUpdatedAt, stamp);
      assert.equal(input.actorId, "server-actor"); throw new Error("LIVE_CONTROL_STATE_CHANGED");
    },
  });
  const result = await h.POST(request({ action: "SET_MODE", mode: "LIVE" }));
  assert.equal(result.status, 409);
  assert.equal(result.body.error, "LIVE_CONTROL_STATE_CHANGED");
  assert.equal(applications, 1);
});

test("LIVE permission cannot bypass a current custody blocker even without persistent freeze", async () => {
  const exports = {};
  vm.runInNewContext(gateCode, { exports,
    readUnifiedLiveRuntimeConfig: () => ({ mode: "LIVE", allowNewEntriesByEnv: true, positionManagementEnabled: true }),
  });
  const result = await exports.evaluateUnifiedLiveNewEntryGateReadOnly("official", {
    migrationRequired: false, account: { mode: "LIVE", newEntriesEnabled: true, positionManagementEnabled: true },
    audit: { freezeNewEntries: true },
  });
  assert.equal(result.allowed, false);
  assert.deepEqual(plain(result.reasons), ["CUSTODY_BLOCKER_PRESENT"]);
});
