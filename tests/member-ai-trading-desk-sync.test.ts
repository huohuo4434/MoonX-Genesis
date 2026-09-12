import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { applyAiDeskOperationalState } from "../lib/trading-signals/ai-desk-status";
import { isUnifiedNewEntryBlockedForDisplay } from "../lib/presentation/bitget-live-status";
import { encodeDeskCache, decodeDeskCache } from "../lib/presentation/desk-cache-codec";

const source = (path: string) => readFileSync(path, "utf8");

// Execute the real publisher with database/exchange boundaries replaced; never use credentials.
function harness(fakeTimers = false) {
  const now = new Date();
  const stamp = now.toISOString();
  const settings = { enabled: true, show_current_positions: true, show_trade_history: true,
    show_absolute_pnl: false, history_limit: 20, updated_at: stamp };
  const runtime = { executionAllowed: true, serverHealthy: true, paused: false,
    lastReport: { message: "ACCOUNT_NEW_ENTRIES_DISABLED" }, recentEvents: [],
    lastHeartbeatAt: stamp, lastMarketAt: stamp, lastStrategyAt: stamp, lastReconcileAt: stamp,
    heartbeatAgeSeconds: 0, quoteAgeSeconds: 0, freshQuotesCount: 18, totalSymbols: 18,
    decisionStatsToday: {}, liveExperiment: { status: "ACTIVE", startedAt: stamp,
      endsAt: new Date(now.getTime() + 600_000).toISOString() } };
  const state = { payload: { old: true }, synced: now.getTime() - 60_000, error: null as string | null,
    writes: [] as string[], settingsFail: false, settingsQueries: 0,
    settingsRead: null as null | (() => Promise<any[]>), snapshotFail: false, snapshotDelay: 0,
    positions: async () => [] as any[] };
  const timers: Array<{ callback: () => void; delay: number; cleared: boolean }> = [];
  const forbidden = () => { throw new Error("FORBIDDEN_TRADING_INITIALIZER"); };
  const db = {
    $queryRawUnsafe: async (sql: string) => {
      if (sql.includes("FROM trade_member_ai_desk_snapshot")) {
        if (state.snapshotFail) throw new Error("PRIVATE_DATABASE_HOST_AND_SQL");
        if (state.snapshotDelay) await new Promise(resolve => setTimeout(resolve, state.snapshotDelay));
        return [{ payload: state.payload, last_synced_at: new Date(state.synced), last_error: state.error }];
      }
      assert.match(sql, /trade_member_ai_desk_settings/);
      state.settingsQueries += 1;
      if (state.settingsRead) return state.settingsRead();
      if (state.settingsFail) throw new Error("PRIVATE_SETTINGS_ERROR");
      return [settings];
    },
    $executeRaw: async (parts: TemplateStringsArray, ...values: any[]) => {
      const sql = parts.join("?");
      state.writes.push(sql);
      assert.match(sql, /UPDATE trade_member_ai_desk_snapshot/);
      assert.doesNotMatch(sql, /CREATE|INSERT|trade_three_horizon_profiles/);
      assert.match(sql, /last_synced_at IS NULL OR last_synced_at < \?/);
      const cutoff = values[values.length - 1].getTime();
      if (state.synced >= cutoff) return 0;
      if (sql.includes("payload =")) {
        state.payload = JSON.parse(values[0]); state.synced = values[1].getTime(); state.error = null;
      } else { state.error = values[0]; }
      return 1;
    },
  };
  const modules: Record<string, any> = {
    "server-only": {},
    "@/lib/prisma": { prisma: db },
    "@/lib/bitget/demo-client": {
      getBitgetDemoEnvironment: () => ({ mode: "LIVE_EXPERIMENT", liveAllowedSymbols: ["HYPEUSDT"] }),
      getBitgetDemoCurrentPositions: () => state.positions(),
      getBitgetDemoClosedPositions: async () => [], getBitgetDemoPendingStrategyOrders: async () => [],
    },
    "@/lib/bitget/demo-runtime": { getBitgetRuntimeState: forbidden },
    "@/lib/bitget/demo-connector": { getBitgetDemoDashboard: forbidden },
    "@/lib/bitget/live-admin-snapshot": { getBitgetLiveAdminSnapshot: async (_: Date, options: any) => {
      assert.equal(options.strict, true); return { runtime };
    } },
    "@/lib/presentation/bitget-live-status": { isUnifiedNewEntryBlockedForDisplay },
    "@/lib/trading-signals/prediction-auto-trader": {
      ensurePredictionAutoTraderTables: forbidden, getPredictionAutoTraderSettings: forbidden,
    },
    "@/lib/trading-signals/three-horizon-strategy": { getThreeHorizonPublicStrategies: async (_: Date, options: any) => {
      assert.equal(options.readOnly, true); return [{ enabled: true }];
    } },
    "@/lib/trading-signals/ai-trade-plans": { getAiTradePlanDashboard: async (_: Date, options: any) => {
      assert.equal(options.readOnly, true); assert.equal(options.strict, true);
      return { plans: [], decisions: [], quotes: [] };
    } },
    "@/lib/trading-signals/ai-desk-status": { applyAiDeskOperationalState },
    "@/lib/trading-signals/member-desk-persisted-plan-core": {
      buildMemberDeskPlansFromPersistedAudit: () => [], summarizePersistedPlans: () => ({}),
    },
  };
  const exports: any = {};
  const compiled = ts.transpileModule(source("lib/trading-signals/member-ai-trading-desk.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(compiled, { exports, Date,
    setTimeout: fakeTimers ? (callback: () => void, delay: number) => { const timer = { callback, delay, cleared: false }; timers.push(timer); return timer; } : setTimeout,
    clearTimeout: fakeTimers ? (timer: { cleared: boolean }) => { timer.cleared = true; } : clearTimeout,
    console: { ...console, warn: () => undefined },
    require: (id: string) => { assert.ok(id in modules, `unreviewed dependency ${id}`); return modules[id]; } });
  return { now, state, runtime, settings, timers, sync: exports.syncMemberAiTradingDeskSnapshot,
    getSettings: exports.getMemberAiTradingDeskSettings, read: exports.getMemberAiTradingDeskSnapshot };
}

test("compressed trading cache preserves fields but reapplies fresh member privacy on cache hits", async () => {
  const h = harness();
  await h.sync(h.now);
  let snapshotReads = 0;
  const modules: Record<string, any> = {
    "server-only": {},
    "next/cache": { unstable_cache: (fn: () => Promise<string>, keys: string[], options: any) => {
      assert.match(keys[0], /gzip-private/); assert.equal(options.revalidate, 15);
      let packed: Promise<string> | undefined;
      return () => packed ??= fn();
    } },
    "@/lib/trading-signals/member-ai-trading-desk": {
      getMemberAiTradingDeskSnapshot: async () => { snapshotReads++; return h.read(); },
      getMemberAiTradingDeskSettings: h.getSettings,
    },
    "@/lib/presentation/desk-cache-codec": { encodeDeskCache, decodeDeskCache },
    "@/lib/trading-signals/ai-desk-status": { applyAiDeskOperationalState },
  };
  const exports: any = {};
  runInNewContext(ts.transpileModule(source("lib/trading-signals/member-ai-trading-desk-cache.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: (id: string) => { assert.ok(id in modules); return modules[id]; } });
  const first = await exports.getCachedMemberAiTradingDeskSnapshot();
  assert.equal(first.settings.enabled, true);
  assert.equal(first.executionAllowed, false);
  h.settings.enabled = false;
  const hidden = await exports.getCachedMemberAiTradingDeskSnapshot();
  assert.equal(snapshotReads, 1);
  assert.equal(hidden.settings.enabled, false);
  assert.equal(hidden.executionAllowed, false);
  assert.deepEqual(hidden.publishedPlans, []);
});

test("parallel settings reads share only the pending SELECT; next request sees changed privacy", async () => {
  const h = harness(true);
  let release!: (rows: any[]) => void;
  h.state.settingsRead = () => new Promise(resolve => { release = resolve; });
  const first = h.getSettings(); const second = h.getSettings({ strict: true });
  assert.equal(h.state.settingsQueries, 1);
  assert.equal(h.timers[0]!.delay, 6000);
  release([h.settings]);
  assert.equal((await first).enabled, true); assert.equal((await second).enabled, true);
  assert.equal(h.timers[0]!.cleared, true);
  h.state.settingsRead = null; h.settings.enabled = false;
  assert.equal((await h.getSettings()).enabled, false);
  assert.equal(h.state.settingsQueries, 2);
});

test("shared timeout fails closed, strict callers reject, subsequent reads recover", async () => {
  const h = harness(true);
  h.state.settingsRead = () => new Promise(() => undefined);
  const normal = h.getSettings();
  const strict = assert.rejects(h.getSettings({ strict: true }), /读取超时/);
  h.timers[0]!.callback();
  assert.equal((await normal).enabled, false); await strict;
  h.state.settingsRead = null;
  assert.equal((await h.getSettings()).enabled, true);
  assert.equal(h.state.settingsQueries, 2);
});

test("member read errors do not disclose database diagnostics", async () => {
  const h = harness(); h.state.snapshotFail = true;
  const result = await h.read();
  assert.equal(result.syncStatus, "ERROR");
  assert.equal(result.executionAllowed, false);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_DATABASE_HOST_AND_SQL/);
  assert.match(result.syncMessage, /暂时无法读取/);
});

test("a three-second snapshot read succeeds beyond the former 2.5-second budget", async () => {
  const h = harness();
  const baseline = await h.sync(h.now);
  h.state.snapshotDelay = 3000;
  const result = await h.read();
  assert.equal(result.lastSyncedAt, h.now.toISOString());
  assert.equal(result.syncStatus, baseline.syncStatus);
  assert.equal(result.settings.enabled, baseline.settings.enabled);
  assert.equal(result.executionAllowed, false);
});

test("LIVE publisher reads only; account entry gate remains closed and actual stop is not invented", async () => {
  const h = harness();
  h.state.positions = async () => [{ symbol: "HYPEUSDT", posSide: "long", avgPrice: 50,
    markPrice: 49, profitRate: -0.02, leverage: 2, marginMode: "isolated", createdAt: null, unrealisedPnl: -5 }];
  const result = await h.sync(h.now);
  assert.equal(result.executionAllowed, false);
  assert.equal(result.positions[0].stopLoss, null);
  assert.equal(result.positions[0].takeProfit, null);
  assert.equal(result.positions[0].riskSource, "NONE");
  assert.equal(result.positions[0].unrealisedPnlUsdt, null);
  assert.equal(result.settings.showAbsolutePnl, false);
  assert.equal(h.state.writes.length, 1);
});

test("continuous duration survives publisher and never opens a closed account gate", async () => {
  const h = harness();
  Object.assign(h.runtime.liveExperiment, { durationMode: "CONTINUOUS", endsAt: null });
  const result = await h.sync(h.now);
  assert.equal(result.experiment.durationMode, "CONTINUOUS");
  assert.equal(result.experiment.endsAt, null);
  assert.equal(result.executionAllowed, false);
  const permitted = applyAiDeskOperationalState({ ...result, executionAllowed: true,
    executionConfigured: true, serverHealthy: true, syncStatus: "OK" } as any, h.now);
  assert.equal(permitted.executionAllowed, true);
  const missing = applyAiDeskOperationalState({ ...permitted,
    experiment: { ...permitted.experiment, durationMode: undefined } }, h.now);
  assert.equal(missing.executionAllowed, false);
  assert.equal(missing.operationalStateLabel, "运行期限待核验");
});

test("exchange read failure preserves last successful positions and timestamp; private errors stay private", async () => {
  const h = harness(); const old = h.state.payload; const stamp = h.state.synced;
  h.state.positions = async () => { throw new Error("PRIVATE_EXCHANGE_ERROR"); };
  await assert.rejects(h.sync(h.now));
  assert.equal(h.state.payload, old); assert.equal(h.state.synced, stamp);
  assert.ok(h.state.error); assert.doesNotMatch(h.state.error!, /PRIVATE/);
});

test("settings failure does not enable default publication", async () => {
  const h = harness(); h.state.settingsFail = true;
  await assert.rejects(h.sync(h.now));
  assert.deepEqual(h.state.payload, { old: true });
});

test("a slower older run cannot overwrite a newer success or mark it failed", async () => {
  const h = harness();
  let release!: (rows: any[]) => void;
  let started!: () => void;
  const waiting = new Promise<void>((resolve) => { started = resolve; });
  h.state.positions = () => { started(); return new Promise((resolve) => { release = resolve; }); };
  const older = h.sync(h.now);
  await waiting;
  h.state.positions = async () => [];
  const newerTime = new Date(h.now.getTime() + 1);
  await h.sync(newerTime);
  const latest = h.state.payload;
  release([]);
  await assert.rejects(older, /快照未写入/);
  assert.equal(h.state.payload, latest); assert.equal(h.state.synced, newerTime.getTime());
  assert.equal(h.state.error, null);
});

test("snapshot health is reevaluated at real read time, not stored zero ages", async () => {
  const h = harness(); const result = await h.sync(h.now);
  const stale = applyAiDeskOperationalState(result, new Date(h.now.getTime() + 181_000));
  assert.equal(stale.executionAllowed, false); assert.equal(stale.serverHealthy, false);
  assert.equal(stale.syncStatus, "PARTIAL");
  const freshSnapshotOldHeartbeat = applyAiDeskOperationalState({ ...result, syncStatus: "OK",
    lastSyncedAt: new Date(h.now.getTime() + 181_000).toISOString() }, new Date(h.now.getTime() + 181_000));
  assert.equal(freshSnapshotOldHeartbeat.operationalState, "SERVICE_ERROR");
});

test("read errors, missing/future timestamps, disabled display and expired experiment never grant permission", async () => {
  const h = harness(); const result = await h.sync(h.now);
  for (const patch of [
    { syncStatus: "ERROR", syncMessage: "读取失败" }, { syncStatus: "PARTIAL", syncMessage: "读取失败" },
    { lastSyncedAt: null }, { lastSyncedAt: "bad" },
    { lastSyncedAt: new Date(h.now.getTime() + 61_000).toISOString() },
    { settings: { ...result.settings, enabled: false } },
    { experiment: { ...result.experiment, endsAt: h.now.toISOString() } },
  ]) {
    const checked = applyAiDeskOperationalState({ ...result, executionAllowed: true, ...patch }, h.now);
    assert.equal(checked.executionAllowed, false, JSON.stringify(patch));
    if (patch.syncMessage) assert.equal(checked.syncMessage, patch.syncMessage);
  }
});

test("market or reconcile failure cannot advertise a healthy open position; normal manage-only is not a failure", async () => {
  for (const report of [{ market: { ok: false } }, { reconcile: { connected: false } }]) {
    const h = harness(); h.runtime.lastReport = report as any;
    h.state.positions = async () => [{ symbol: "HYPEUSDT", posSide: "long", avgPrice: 50, markPrice: 49,
      profitRate: -0.02, leverage: 2, marginMode: "isolated", createdAt: null, unrealisedPnl: -5 }];
    const checked = await h.sync(h.now);
    assert.equal(checked.syncStatus, "PARTIAL"); assert.equal(checked.serverHealthy, false);
    assert.equal(checked.executionAllowed, false); assert.equal(checked.operationalState, "SERVICE_ERROR");
    assert.doesNotMatch(checked.syncMessage, /对账正常/);
  }
  const h = harness(); const healthy = await h.sync(h.now);
  assert.equal(healthy.serverHealthy, true); assert.equal(healthy.operationalState, "PAUSED");
  assert.equal(healthy.executionAllowed, false);
});

test("old snapshots are redacted when settings change, including nested account audit and disabled payloads", async () => {
  const h = harness(); const result = await h.sync(h.now);
  const privateAmount = 987654321;
  const old = { ...result, syncStatus: "OK", settings: { ...result.settings, showAbsolutePnl: false },
    positions: [{ unrealisedPnlUsdt: privateAmount }], recentTrades: [{ netProfitUsdt: privateAmount }],
    experiment: { ...result.experiment, initialEquityUsdt: privateAmount, currentEquityUsdt: privateAmount,
      pnlUsdt: privateAmount, maxDrawdownUsdt: privateAmount, dailyPnlUsdt: privateAmount,
      dailyHistory: [{ openingEquityUsdt: privateAmount, closingEquityUsdt: privateAmount, pnlUsdt: privateAmount }] },
    strategies: [{ stats: { netPnlUsdt: privateAmount }, decisions: [{ quantity: privateAmount, bitgetOrderId: "PRIVATE_ORDER" }] }],
    intentDecisions: [{ rejectionReason: "平仓订单PRIVATE_ORDER" }],
    plans: [{ actionText: "平仓订单PRIVATE_ORDER" }],
    publishedPlans: [{ bitgetOrderId: "PRIVATE_ORDER", clientOid: "PRIVATE_ORDER", sourceDecisionId: "PRIVATE_ORDER",
      closeReason: "平仓订单PRIVATE_ORDER",
      events: [{ quantity: privateAmount, bitgetOrderId: "PRIVATE_ORDER", clientOid: "PRIVATE_ORDER", detail: "PRIVATE_ORDER" }] }],
    stats: { ...result.stats, netProfitUsdt: privateAmount },
  };
  const redacted = applyAiDeskOperationalState(old as any, h.now);
  assert.doesNotMatch(JSON.stringify(redacted), /987654321|PRIVATE_ORDER/);
  const disabled = applyAiDeskOperationalState({ ...old, settings: { ...old.settings, enabled: false },
    runtime: { ...old.runtime, pauseReason: "PRIVATE_RUNTIME" } } as any, h.now);
  assert.doesNotMatch(JSON.stringify(disabled), /987654321|PRIVATE_ORDER|PRIVATE_RUNTIME/);
  assert.equal(disabled.positions.length, 0); assert.equal(disabled.experiment.pnlPct, null);
  assert.equal(disabled.stats.winRatePct, null);
  const absolute = applyAiDeskOperationalState({ ...old,
    settings: { ...old.settings, showAbsolutePnl: true } } as any, h.now);
  assert.equal(absolute.experiment.pnlUsdt, privateAmount);
  assert.equal(absolute.experiment.currentEquityUsdt, null);
  assert.equal(absolute.experiment.dailyHistory[0]!.closingEquityUsdt, null);
  assert.doesNotMatch(JSON.stringify(absolute), /PRIVATE_ORDER/);
});

test("a fresh timestamp cannot turn serverHealthy false into a healthy open position", async () => {
  const h = harness(); const result = await h.sync(h.now);
  const checked = applyAiDeskOperationalState({ ...result, syncStatus: "OK", serverHealthy: false,
    executionAllowed: true, positions: [{ symbol: "HYPEUSDT" }] } as any, h.now);
  assert.equal(checked.operationalState, "SERVICE_ERROR"); assert.equal(checked.executionAllowed, false);
  assert.equal(checked.serverHealthy, false); assert.equal(checked.syncStatus, "PARTIAL");
  assert.doesNotMatch(checked.syncMessage, /正常/);
});

test("cron authentication precedes reads; scheduler never invokes trading; strict readers do not use fallback", () => {
  const route = source("app/api/cron/member-ai-desk-sync/route.ts");
  assert.match(route, /!secret \|\| request.headers.get\("authorization"\) !== `Bearer \$\{secret\}`/);
  assert.ok(route.indexOf("status: 401") < route.indexOf("getBitgetDemoEnvironment().mode"));
  assert.ok(route.indexOf('!== "LIVE_EXPERIMENT"') < route.indexOf("await syncMemberAiTradingDeskSnapshot"));
  assert.doesNotMatch(route, /runBitgetDemoServerRuntime|runThreeHorizon|RUN_NOW|ensure.*Tables/);
  const schedules = JSON.parse(source("vercel.json")).crons;
  assert.equal(schedules.filter((r: any) => r.path === "/api/cron/member-ai-desk-sync").length, 1);
  assert.equal(schedules.find((r: any) => r.path === "/api/cron/member-ai-desk-sync").schedule, "*/2 * * * *");
  assert.equal(schedules.find((r: any) => r.path === "/api/cron/prediction-auto-trader").schedule, "* * * * *");
  const reader = source("lib/bitget/live-admin-snapshot.ts").split("export async function getBitgetLiveAdminSnapshot")[1]!;
  assert.match(reader, /if \(!options.strict && cache/);
  assert.ok(reader.indexOf("if (options.strict) throw error") < reader.indexOf("return fallbackDashboard"));
  const strategies = source("lib/trading-signals/three-horizon-strategy.ts").split("export async function getThreeHorizonPublicStrategies")[1]!;
  const readOnly = strategies.split(": await getThreeHorizonStrategyDashboard")[0]!;
  assert.doesNotMatch(readOnly, /ensure.*Tables|\$executeRaw|buildRiskSnapshot/);
  const planSource = source("lib/trading-signals/ai-trade-plans.ts");
  assert.match(planSource, /getRuntimeMarketQuotes\(now, options.strict\)/);
  assert.ok((planSource.match(/if \(options.strict\) throw error/g) ?? []).length >= 3);
  const cache = source("lib/trading-signals/member-ai-trading-desk-cache.ts");
  assert.match(cache, /readCachedSnapshot\(\), getMemberAiTradingDeskSettings\(\)/);
  assert.match(cache, /applyAiDeskOperationalState\(\{ \.\.\.snapshot, settings \}\)/);
  assert.match(source("app/api/member/ai-trading-desk/route.ts"), /"Cache-Control": "private, no-store"/);
});
