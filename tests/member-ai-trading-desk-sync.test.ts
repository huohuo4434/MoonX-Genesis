import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { applyAiDeskOperationalState } from "../lib/trading-signals/ai-desk-status";
import { isUnifiedNewEntryBlockedForDisplay } from "../lib/presentation/bitget-live-status";

const source = (path: string) => readFileSync(path, "utf8");

// Execute the real publisher with database/exchange boundaries replaced; never use credentials.
function harness() {
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
    writes: [] as string[], settingsFail: false, positions: async () => [] as any[] };
  const forbidden = () => { throw new Error("FORBIDDEN_TRADING_INITIALIZER"); };
  const db = {
    $queryRawUnsafe: async (sql: string) => {
      assert.match(sql, /trade_member_ai_desk_settings/);
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
  runInNewContext(compiled, { exports, Date, setTimeout, clearTimeout, console,
    require: (id: string) => { assert.ok(id in modules, `unreviewed dependency ${id}`); return modules[id]; } });
  return { now, state, runtime, settings, sync: exports.syncMemberAiTradingDeskSnapshot };
}

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
