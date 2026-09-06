import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { evaluateLiveDuration } from "../lib/bitget/live-duration-core.ts";
import { livePeriodReadiness, requireCurrentLiveEquity } from "../lib/bitget/live-period-readiness-core.ts";

// Execute the real reader/synchronizer with DB/exchange boundaries mocked.
// No credentials, request headers, network or persistent writes are available.
const file = ts.createSourceFile("client.ts", readFileSync("lib/bitget/demo-client.ts", "utf8"), ts.ScriptTarget.Latest, true);
const names = ["readBitgetLiveExperimentStatus", "syncBitgetLiveExperimentStatus", "dateIso"];
const functions = file.statements.filter(s => ts.isFunctionDeclaration(s) && names.includes(s.name?.text));
assert.equal(functions.length, 3);
const compiled = ts.transpileModule(functions.map(f => f.getText(file)).join("\n"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const now = new Date("2026-09-06T00:00:00Z");
const base = { status: "ACTIVE", duration_mode: "CONTINUOUS", started_at: "2026-08-04T00:00:00Z", ends_at: null,
  initial_equity_usdt: 1000, current_equity_usdt: 1002, peak_equity_usdt: 1005,
  max_drawdown_usdt: 6, max_drawdown_pct: 0.6, stop_reason: "" };
function harness(row = base, { securitySafe = true, equity = 1002, dailyPnl = 2, failRead = false, casMiss = false } = {}) {
  const writes = [], exports = {};
  const current = { date: "2026-09-06", pnlUsdt: dailyPnl, pnlPct: dailyPnl / 10, trades: 0 };
  vm.runInNewContext(compiled, {
    exports, Date, evaluateLiveDuration, livePeriodReadiness, requireCurrentLiveEquity,
    getBitgetDemoEnvironment: () => ({ mode: "LIVE_EXPERIMENT", executionAllowed: true,
      liveInitialCapitalUsdt: 1000, liveDailyLossUsdt: 10, liveMaxDrawdownUsdt: 50 }),
    ensureBitgetLiveExperimentTable: async () => true,
    prisma: {
      $queryRawUnsafe: async () => { if (failRead) throw new Error("READ_FAILED"); return [casMiss && writes.length ? base : row]; },
      $executeRaw: async (sql, ...values) => { writes.push({ sql: sql.join("?"), values }); return casMiss ? 0 : 1; },
    },
    beijingDateKey: () => "2026-09-06",
    readLiveDailyHistory: async () => [current],
    syncLiveDailySnapshot: async () => ({ current, history: [current] }),
    getBitgetRuntimeAccountBalance: async () => ({ equityUsdt: equity, availableUsdt: equity }),
    getBitgetApiSecurity: async () => ({ safeForLiveExperiment: securitySafe, message: "checked" }),
  });
  return { exports, writes };
}
test("real reader and sync agree on explicitly continuous operation; baselines are retained", async () => {
  const h = harness();
  const read = await h.exports.readBitgetLiveExperimentStatus(now);
  const sync = await h.exports.syncBitgetLiveExperimentStatus(now);
  for (const result of [read, sync]) {
    assert.equal(result.active, true); assert.equal(result.durationMode, "CONTINUOUS");
    assert.equal(result.endsAt, null); assert.equal(result.initialEquityUsdt, 1000);
    assert.equal(result.peakEquityUsdt, 1005); assert.equal(result.maxDrawdownUsdt, 6);
    assert.equal(result.pnlUsdt, 2);
  }
  assert.equal(h.writes.length, 1);
  assert.doesNotMatch(h.writes[0].sql, /started_at|ends_at|initial_equity_usdt|newEntriesEnabled/);
  assert.match(h.writes[0].sql, /GREATEST/);
});
test("completed legacy and stopped continuous records are not reinitialized even with allowStart", async () => {
  for (const status of ["COMPLETED", "STOPPED"]) {
    const h = harness({ ...base, status, stop_reason: "retained" });
    const result = await h.exports.syncBitgetLiveExperimentStatus(now, { allowStart: true });
    assert.equal(result.status, status); assert.equal(result.active, false);
    assert.equal(result.stopReason, "retained");
    assert.doesNotMatch(h.writes[0].sql, /started_at|ends_at|initial_equity_usdt/);
  }
});
test("old schema without mode keeps expiry, while missing/corrupt deadline fails closed", async () => {
  for (const ends_at of ["2026-09-03T00:00:00Z", null, "invalid"]) {
    const h = harness({ ...base, duration_mode: undefined, ends_at });
    assert.equal((await h.exports.readBitgetLiveExperimentStatus(now)).active, false);
    const synced = await h.exports.syncBitgetLiveExperimentStatus(now);
    assert.equal(synced.active, false);
    assert.equal(synced.status, ends_at?.startsWith("2026") ? "COMPLETED" : "STOPPED");
  }
});
test("continuous operation retains exact daily loss, drawdown and permission limits", async () => {
  for (const settings of [{ dailyPnl: -10 }, { equity: 955 }, { securitySafe: false }]) {
    const h = harness(base, settings);
    const result = await h.exports.syncBitgetLiveExperimentStatus(now);
    assert.ok(result.stopReason);
    if (settings.dailyPnl === -10) {
      assert.equal(result.dailyPnlUsdt, -10); assert.match(result.stopReason, /日止损/);
    } else assert.equal(result.active, false);
    assert.doesNotMatch(h.writes[0].sql, /started_at|ends_at|initial_equity_usdt/);
  }
});
test("database read error is never converted to an active empty record", async () => {
  const h = harness(base, { failRead: true });
  await assert.rejects(h.exports.readBitgetLiveExperimentStatus(now), /READ_FAILED/);
  await assert.rejects(h.exports.syncBitgetLiveExperimentStatus(now), /READ_FAILED/);
  assert.equal(h.writes.length, 0);
});
test("old synchronizer CAS miss reloads converted state rather than reporting expiry", async () => {
  const h = harness({ ...base, status: "COMPLETED", duration_mode: "FIXED", ends_at: "2026-09-03T00:00:00Z", stop_reason: "old expiry" }, { casMiss: true });
  const result = await h.exports.syncBitgetLiveExperimentStatus(now);
  assert.equal(result.durationMode, "CONTINUOUS"); assert.equal(result.status, "ACTIVE"); assert.equal(result.endsAt, null);
  assert.match(h.writes[0].sql, /AND status=.*duration_mode/s);
});
