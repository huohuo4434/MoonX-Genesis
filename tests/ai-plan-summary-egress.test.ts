import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { aiTradePlanDashboardReadPolicy } from "../lib/trading-signals/member-desk-persisted-plan-core";

// Exercise the real loaders with no network, credentials, or database writes.
function harness() {
  const date = new Date("2026-09-23T00:00:00Z");
  const plan = { id: "plan-1", symbol: "BTCUSDT", direction: "LONG", strategy_type: "SWING",
    status: "WATCHING", execution_mode: "BITGET_DEMO", version: 1,
    entry_zone_low: 80, entry_zone_high: 81, protective_stop: 70, target_1: 100,
    valid_from: date, expires_at: date, published_at: date, created_at: date, updated_at: date };
  const event = { id: "audit-1", plan_id: plan.id, event_type: "PLAN_PUBLISHED",
    title: "Published", detail: "Audit retained", event_at: date };
  const state = { queries: [] as string[], failEvents: false, failPlans: false };
  const modules: Record<string, unknown> = {
    "server-only": {}, "crypto": {},
    "@/lib/trading-signals/ai-plan-dynamic-sync-core": {},
    "@/lib/trading-signals/ai-plan-renewal-core": {},
    "@/lib/bitget/demo-client": {},
    "@/lib/trading-signals/member-desk-persisted-plan-core": { aiTradePlanDashboardReadPolicy },
    "@/lib/prisma": { prisma: { $queryRawUnsafe: async (sql: string) => {
      state.queries.push(sql);
      assert.match(sql.trim(), /^SELECT/i);
      if (sql.includes("FROM trade_ai_plan_events")) {
        if (state.failEvents) throw new Error("EVENT_READ_FAILED");
        return [event];
      }
      if (sql.includes("FROM trade_ai_plans")) {
        if (state.failPlans) throw new Error("PLAN_READ_FAILED");
        return [plan];
      }
      if (sql.includes("FROM trade_three_horizon_decisions") || sql.includes("FROM trade_bitget_runtime_state")) return [];
      throw new Error(`UNREVIEWED_QUERY: ${sql}`);
    } } },
  };
  const exports: any = {};
  runInNewContext(ts.transpileModule(readFileSync("lib/trading-signals/ai-trade-plans.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, Date, console, require: (id: string) => {
    assert.ok(id in modules, `unreviewed dependency ${id}`); return modules[id];
  } });
  return { state, date, read: exports.getPublishedAiTradePlans, dashboard: exports.getAiTradePlanDashboard };
}

test("summary skips event SQL while preserving every non-event plan field", async () => {
  const h = harness();
  const full = await h.read(60, { readOnly: true, strict: true });
  assert.equal(full[0].events.length, 1);
  h.state.queries = [];
  const summary = await h.read(60, { readOnly: true, strict: true, includeEvents: false });
  assert.equal(summary[0].events.length, 0);
  assert.equal(h.state.queries.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(summary)), JSON.parse(JSON.stringify(full.map((p: any) => ({ ...p, events: [] })))));
});

test("default and explicit full reads retain audit events and strict failures", async () => {
  const h = harness();
  assert.equal((await h.read(60, { readOnly: true, includeEvents: true }))[0].events[0].detail, "Audit retained");
  h.state.failEvents = true;
  await assert.rejects(h.read(60, { readOnly: true, strict: true }), /EVENT_READ_FAILED/);
  assert.equal((await h.read(60, { readOnly: true }))[0].events.length, 0);
  assert.equal((await h.read(60, { readOnly: true, strict: true, includeEvents: false }))[0].id, "plan-1");
});

test("summary still propagates plan read failures and preserves read-only dashboard policy", async () => {
  const h = harness();
  const dashboard = await h.dashboard(h.date, { readOnly: true, strict: true, includeEvents: false });
  assert.equal(dashboard.plans[0].events.length, 0);
  assert.ok(!h.state.queries.some(sql => sql.includes("FROM trade_ai_plan_events")));
  assert.ok(h.state.queries.every(sql => /^SELECT/i.test(sql.trim())));
  h.state.failPlans = true;
  await assert.rejects(h.read(60, { readOnly: true, strict: true, includeEvents: false }), /PLAN_READ_FAILED/);
});

test("member-only call sites opt out; admin retains full history and member views do not consume events", () => {
  const read = (file: string) => readFileSync(file, "utf8");
  assert.match(read("lib/trading-signals/member-ai-trading-desk.ts"), /getAiTradePlanDashboard\(now, \{ readOnly: true, strict: true, includeEvents: false \}\)/);
  assert.match(read("lib/trading-signals/member-trading-plan.server.ts"), /getPublishedAiTradePlans\(100, \{ readOnly: true, includeEvents: false \}\)/);
  for (const file of ["app/admin/bitget-demo/page.tsx", "app/api/admin/bitget-demo/plans/route.ts"]) {
    assert.match(read(file), /getAiTradePlanDashboard\(\)/);
    assert.doesNotMatch(read(file), /includeEvents: false/);
  }
  for (const file of ["components/trading/AiTradeIntentBoard.tsx", "components/member/ConciseTradePlans.tsx", "lib/trading-signals/member-trading-plan-core.ts"]) {
    assert.doesNotMatch(read(file), /\.events\b/);
  }
});
