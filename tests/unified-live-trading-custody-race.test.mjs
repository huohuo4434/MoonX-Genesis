import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { auditUnifiedLiveCustody } from "../lib/trading-signals/unified-live-custody-core.ts";
import { runOrphanProtectionCleanup } from "../lib/trading-signals/orphan-protection-cleanup-core.ts";

// Execute the real functions, replacing only IO boundaries. No credentials or network.
function compile(path, names) {
  const file = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
  const functions = file.statements.filter(s => ts.isFunctionDeclaration(s) && names.includes(s.name?.text));
  assert.equal(functions.length, names.length);
  return ts.transpileModule(functions.map(f => f.getText(file)).join("\n"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
}
const runtime = compile("lib/trading-signals/unified-live-runtime.ts", [
  "readConfirmedUnifiedLiveCustody", "runUnifiedLiveCustodyCycle", "inspectUnifiedLiveCustody",
]);
const freeze = compile("lib/trading-signals/unified-live-store.ts", ["freezeUnifiedLiveEntries"]);
const reader = compile("lib/trading-signals/unified-live-store.ts", ["getUnifiedLiveAccount"]);
const plain = value => JSON.parse(JSON.stringify(value));
const position = { positionKey: "SOL:LONG", symbol: "SOLUSDT", side: "LONG", quantity: 1, entryPrice: 100 };
const protection = { orderKey: "sl-tp", orderId: "sl-tp", symbol: "SOLUSDT", side: "long", stopLoss: true, takeProfit: true };
const slice = { id: "sol", symbol: "SOLUSDT", side: "LONG", horizon: "MEDIUM", quantity: 1, status: "OPEN",
  openedAt: new Date(), maxHoldMinutes: 4320, exchangePositionKey: null };
const account = { id: "official-id", updatedAt: new Date("2026-09-07T00:00:00Z"), mode: "LIVE",
  newEntriesEnabled: true, positionManagementEnabled: true, slices: [slice] };
const healthy = { available: true, positions: [position], orders: [protection] };
const empty = { available: true, positions: [], orders: [] };

function harness({ exchanges = [healthy], accounts = [account], concurrentAction } = {}) {
  let ei = 0, si = 0;
  let current = structuredClone(accounts.at(-1));
  const calls = [], writes = [], events = [], exports = {}, freezeExports = {};
  const database = { $transaction: async fn => fn({
    mooxUnifiedLiveAccount: { updateMany: async query => {
      if (concurrentAction) current = { ...current, ...concurrentAction };
      const matches = current.id === query.where.id && +current.updatedAt === +query.where.updatedAt
        && current.mode === query.where.mode && current.newEntriesEnabled === query.where.newEntriesEnabled;
      if (matches) {
        writes.push({ kind: "freeze", data: query.data });
        current = { ...current, ...query.data };
      }
      return { count: matches ? 1 : 0 };
    } },
    mooxUnifiedLiveEvent: { create: async event => events.push(event.data) },
  }) };
  vm.runInNewContext(freeze, { exports: freezeExports, requireUnifiedLiveDatabase: () => database });
  vm.runInNewContext(runtime, {
    exports, auditUnifiedLiveCustody, runOrphanProtectionCleanup,
    ensureUnifiedLiveAccount: async () => { calls.push("ensure"); return { ok: true }; },
    readUnifiedLiveExchangeSnapshot: async () => { calls.push("exchange"); return exchanges[Math.min(ei++, exchanges.length - 1)]; },
    getUnifiedLiveAccount: async () => {
      calls.push("ledger");
      const value = si < accounts.length ? accounts[si++] : current;
      if (value instanceof Error) throw value;
      return { migrationRequired: false, account: value };
    },
    markUnifiedLivePendingSlicesOpen: async (_, ids) => writes.push({ kind: "open", ids }),
    markUnifiedLiveManualClosures: async (_, ids) => writes.push({ kind: "close", ids }),
    cancelBitgetDemoStrategyOrder: async order => { writes.push({ kind: "cancel", order }); return { status: "CONFIRMED" }; },
    recordUnifiedLiveEvents: async (_, issues) => events.push(...issues),
    freezeUnifiedLiveEntries: freezeExports.freezeUnifiedLiveEntries,
    readUnifiedLiveRuntimeConfig: () => ({ mode: "MANAGE_ONLY", positionManagementEnabled: true }),
  });
  return { ...exports, calls, writes, events, current: () => current };
}
const run = h => h.runUnifiedLiveCustodyCycle({ trigger: "TEST_ONLY" });

test("new exchange fill followed by ledger registration does not permanently freeze", async () => {
  const h = harness({ accounts: [{ ...account, slices: [] }, account] });
  const result = await run(h);
  assert.equal(result.audit.freezeNewEntries, false);
  assert.deepEqual(h.writes, []);
  assert.deepEqual(h.calls, ["ensure", "exchange", "ledger", "exchange", "ledger"]);
});
test("stale exchange absence cannot close a slice or cancel its protection after fresh match", async () => {
  const h = harness({ exchanges: [{ ...empty, orders: [protection] }, healthy] });
  assert.equal((await run(h)).audit.freezeNewEntries, false);
  assert.deepEqual(h.writes, []);
});
test("WARN-only site absence is also confirmed before ledger closure", async () => {
  const h = harness({ exchanges: [empty, healthy] });
  await run(h);
  assert.deepEqual(h.writes, []);
  assert.equal(h.calls.filter(x => x === "exchange").length, 2);
});
test("confirmed absent position reconciles; unknown-side protection never cancels", async () => {
  const h = harness({ exchanges: [{ ...empty, orders: [{ ...protection, side: null }] }] });
  const result = await run(h);
  assert.equal(result.audit.freezeNewEntries, true);
  assert.deepEqual(h.writes.map(w => w.kind), ["close", "freeze"]);
  assert.equal(h.events.filter(e => e.code === "CUSTODY_NEW_ENTRIES_FROZEN").length, 1);
});
test("persistent genuine orphan still freezes with an attributable reason", async () => {
  const h = harness({ accounts: [{ ...account, slices: [] }] });
  assert.equal((await run(h)).mode, "MANAGE_ONLY");
  assert.deepEqual(plain(h.writes), [{ kind: "freeze", data: { mode: "MANAGE_ONLY", newEntriesEnabled: false } }]);
  assert.match(h.events.find(e => e.code === "CUSTODY_NEW_ENTRIES_FROZEN").detail, /TEST_ONLY: ORPHAN_EXCHANGE_POSITION\(SOLUSDT\)/);
});
test("confirmation failure blocks but never applies first-snapshot closure, cancellation or promotion", async () => {
  for (const first of [{ ...empty, orders: [protection] }, healthy]) {
    const h = harness({ exchanges: [first, { ...empty, available: false }],
      accounts: [{ ...account, slices: [{ ...slice, status: "PENDING", openedAt: new Date(Date.now() - 180_000) }] }] });
    const result = await run(h);
    assert.equal(result.audit.snapshotAvailable, false);
    assert.equal(result.audit.freezeNewEntries, true);
    assert.deepEqual(h.writes.map(w => w.kind), ["freeze"]);
    assert.equal(result.settledPendingSlices.length, 0);
  }
});
test("DB error or missing account during confirmation aborts before custody mutations", async () => {
  for (const second of [new Error("DB_READ_FAILED"), null]) {
    const h = harness({ exchanges: [empty], accounts: [account, second] });
    await assert.rejects(run(h), /DB_READ_FAILED|ACCOUNT_UNAVAILABLE/);
    assert.deepEqual(h.writes, []);
    assert.deepEqual(h.events, []);
  }
});
test("pending promotion uses confirmed state only", async () => {
  const h = harness({ accounts: [{ ...account, slices: [{ ...slice, status: "PENDING" }] }] });
  const result = await run(h);
  assert.deepEqual(plain(h.writes), [{ kind: "open", ids: ["sol"] }]);
  assert.equal(result.audit.freezeNewEntries, false);
  assert.equal(h.calls.filter(x => x === "exchange").length, 2);
});
test("healthy steady state does not double exchange or DB reads", async () => {
  const h = harness();
  await run(h);
  assert.deepEqual(h.calls, ["ensure", "exchange", "ledger"]);
  assert.deepEqual(h.writes, []);
});
test("read-only inspection uses same confirmation but performs zero writes even for real blockers", async () => {
  for (const accounts of [[{ ...account, slices: [] }, account], [{ ...account, slices: [] }]]) {
    const h = harness({ accounts });
    await h.inspectUnifiedLiveCustody();
    assert.deepEqual(h.calls, ["exchange", "ledger", "exchange", "ledger"]);
    assert.deepEqual(h.writes, []);
    assert.deepEqual(h.events, []);
  }
});
test("freeze CAS cannot overwrite a concurrent pause or later enable; no false freeze event", async () => {
  for (const action of [
    { mode: "PAUSED", newEntriesEnabled: false, positionManagementEnabled: false, updatedAt: new Date(+account.updatedAt + 1000) },
    { mode: "LIVE", newEntriesEnabled: true, updatedAt: new Date(+account.updatedAt + 1000) },
  ]) {
    const h = harness({ accounts: [{ ...account, slices: [] }], concurrentAction: action });
    const result = await run(h);
    assert.equal(result.mode, action.mode);
    assert.equal(result.positionManagementContinues, action.positionManagementEnabled !== false);
    assert.deepEqual(h.writes, []);
    assert.ok(!h.events.some(e => e.code === "CUSTODY_NEW_ENTRIES_FROZEN"));
    assert.equal(result.audit.freezeNewEntries, true, "current execution still blocked by audit; CAS never authorizes new orders");
  }
});
test("account reader retains all active long slices beyond 200 recent history rows", async () => {
  for (const count of [199, 200]) {
    const recent = Array.from({ length: count }, (_, i) => ({ ...slice, id: `closed-${i}`, status: "CLOSED" }));
    const active = ["PENDING", "OPEN", "PARTIALLY_CLOSED", "ORPHAN_PENDING_CLAIM"].map(status => ({ ...slice, id: status, horizon: "LONG", status }));
    const queries = [], exports = {};
    vm.runInNewContext(reader, { exports, prisma: {
      mooxUnifiedLiveAccount: { findUnique: async () => ({ ...account, slices: recent }) },
      mooxUnifiedLiveSlice: { findMany: async query => { queries.push(query); return active; } },
    }, isMissingTableError: () => false });
    const result = await exports.getUnifiedLiveAccount("official");
    assert.equal(queries.length, count === 200 ? 1 : 0);
    if (count === 200) {
      assert.equal(result.account.slices.length, 204);
      assert.deepEqual(plain(queries[0].where.status.in), active.map(s => s.status));
      assert.equal(queries[0].where.accountId, account.id);
      assert.equal(queries[0].take, undefined);
      assert.equal(queries[0].where.id.notIn.length, 200);
    }
  }
});
