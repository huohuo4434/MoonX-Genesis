import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const runtime = fs.readFileSync("app/api/admin/bitget-demo/runtime/route.ts", "utf8");
const reconcile = fs.readFileSync("app/api/admin/bitget-demo/reconcile-legacy-order-errors/route.ts", "utf8");
const legacy = fs.readFileSync("lib/bitget/legacy-order-reconciliation.ts", "utf8");
const client = fs.readFileSync("lib/bitget/demo-client.ts", "utf8");
const admin = fs.readFileSync("components/admin/BitgetDemoClient.tsx", "utf8");

test("RESUME is server-gated and RESUME itself cannot run the trader", () => {
  assert.match(runtime, /strictResumeGate:\s*live/);
  assert.match(runtime, /auditFailures:\s*async\s*\(\)\s*=>\s*live\s*\?\s*auditBitgetLiveResumeReadiness\(\)/);
  const gateAt = runtime.indexOf("const gate = await guardRuntimeAdminAction(");
  const runAt = runtime.indexOf('runBitgetDemoServerRuntime(now, "ADMIN")');
  assert.ok(gateAt >= 0 && runAt > gateAt);
  assert.match(runtime, /if \(gate\.handled\)/);
});

test("legacy reconciliation route cannot resume, run now, or place an order", () => {
  for (const forbidden of ["setBitgetRuntimePaused", "runBitgetDemoServerRuntime", "placeBitgetDemoMarketOrder", "RUN_NOW"]) {
    assert.equal(reconcile.includes(forbidden), false, forbidden);
  }
});

test("legacy reconciliation preserves original row and writes an idempotent reconciliation marker", () => {
  assert.match(legacy, /SET rejection_code='LEGACY_RECONCILED'/);
  assert.match(legacy, /raw_payload=jsonb_set/);
  assert.match(legacy, /AND rejection_code='ORDER_ERROR'/);
  assert.match(legacy, /COALESCE\(raw_payload->'legacyReconciliation'->>'status',''\)=''/);
  assert.equal(/DELETE\s+FROM\s+trade_three_horizon_decisions/i.test(legacy), false);
});

test("legacy audit uses paged Bitget history surfaces required for reconciliation", () => {
  for (const endpoint of [
    "/api/v3/trade/history-orders",
    "/api/v3/trade/fills",
    "/api/v3/trade/unfilled-orders",
    "/api/v3/trade/unfilled-strategy-orders",
    "/api/v3/trade/history-strategy-orders",
    "/api/v3/position/current-position",
    "/api/v3/position/history-position",
    "/api/v3/account/financial-records",
  ]) assert.equal(client.includes(endpoint), true, endpoint);
  assert.match(client, /cursor/);
  assert.match(client, /Bitget分页游标重复/);
});

test("admin UI separates legacy confirmation from resume confirmation", () => {
  assert.match(admin, /CONFIRM_LEGACY_ORDER_ERRORS_RECONCILED/);
  assert.match(admin, /RESUME_LIVE_EXPERIMENT/);
  assert.match(admin, /核对旧版订单错误（只读、不下单）/);
  assert.match(admin, /检查恢复条件（只读）/);
  assert.match(admin, /实验进行中 · 新开仓安全暂停/);
});
