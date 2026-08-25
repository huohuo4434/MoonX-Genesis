import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { auditUnifiedLiveCustody } from "../lib/trading-signals/unified-live-custody-core";
import { runOrphanProtectionCleanup } from "../lib/trading-signals/orphan-protection-cleanup-core";
import { parseBitgetPositionSide } from "../lib/bitget/bitget-side-parser-core";
import { mapUnifiedLiveProtectionOrder } from "../lib/trading-signals/unified-live-exchange-mapping-core";

const order = {
  orderKey: "protection-1",
  orderId: "protection-1",
  clientOid: "client-1",
  symbol: "BTCUSDT",
  side: "long",
  stopLoss: true,
  takeProfit: true,
  status: "TPSL_PENDING",
};

test("无持仓残留保护单成为阻断项并进入托管清理清单", () => {
  const audit = auditUnifiedLiveCustody({
    snapshotAvailable: true,
    positions: [],
    orders: [order],
    slices: [],
    now: new Date("2026-08-26T00:10:00.000Z"),
  });
  assert.equal(audit.freezeNewEntries, true);
  assert.deepEqual(audit.orphanOrders.map((row) => row.orderKey), ["protection-1"]);
  assert.ok(audit.issues.some((issue) => issue.code === "ORPHAN_EXCHANGE_PROTECTION"));
});

test("新开仓两分钟结算宽限内的保护单不误判为孤立单", () => {
  const audit = auditUnifiedLiveCustody({
    snapshotAvailable: true,
    positions: [],
    orders: [order],
    slices: [{
      id: "slice-1",
      symbol: "BTCUSDT",
      horizon: "SHORT",
      side: "LONG",
      status: "PENDING",
      quantity: 0.01,
      openedAt: "2026-08-26T00:09:00.000Z",
      maxHoldMinutes: 90,
    }],
    now: new Date("2026-08-26T00:10:00.000Z"),
  });
  assert.deepEqual(audit.orphanOrders, []);
  assert.ok(!audit.issues.some((issue) => issue.code === "ORPHAN_EXCHANGE_PROTECTION"));
});

test("LONG持仓不能借用SHORT保护单，反向残单必须同时进入清理", () => {
  const shortOrder = { ...order, orderKey: "short-protection", orderId: "short-protection", side: "short" };
  const audit = auditUnifiedLiveCustody({
    snapshotAvailable: true,
    positions: [{
      positionKey: "BTCUSDT:long",
      symbol: "BTCUSDT",
      side: "LONG",
      quantity: 0.01,
      entryPrice: 100,
    }],
    orders: [shortOrder],
    slices: [{
      id: "long-slice",
      symbol: "BTCUSDT",
      horizon: "SHORT",
      side: "LONG",
      status: "OPEN",
      quantity: 0.01,
      openedAt: "2026-08-26T00:00:00.000Z",
      maxHoldMinutes: 90,
      exchangePositionKey: "BTCUSDT:long",
    }],
    now: new Date("2026-08-26T00:10:00.000Z"),
  });
  assert.deepEqual(audit.protectionMissing, ["BTCUSDT:long"]);
  assert.deepEqual(audit.orphanOrders.map((row) => row.orderKey), ["short-protection"]);
  assert.ok(audit.issues.some((issue) => issue.code === "PROTECTION_MISSING"));
  assert.ok(audit.issues.some((issue) => issue.code === "ORPHAN_EXCHANGE_PROTECTION"));
});

test("真实解析链保留未知方向，不能伪装LONG或进入自动取消", () => {
  const parsed = parseBitgetPositionSide(undefined);
  assert.equal(parsed, null);
  assert.equal(parseBitgetPositionSide("unexpected-side"), null);
  const mapped = mapUnifiedLiveProtectionOrder({
    orderId: "unknown-side-order",
    clientOid: "unknown-side-client",
    symbol: "BTCUSDT",
    posSide: parsed,
    stopLoss: 99,
    takeProfit: 103,
  });
  const audit = auditUnifiedLiveCustody({
    snapshotAvailable: true,
    positions: [{
      positionKey: "BTCUSDT:long",
      symbol: "BTCUSDT",
      side: "LONG",
      quantity: 0.01,
      entryPrice: 100,
    }],
    orders: [mapped],
    slices: [{
      id: "long-slice",
      symbol: "BTCUSDT",
      horizon: "SHORT",
      side: "LONG",
      status: "OPEN",
      quantity: 0.01,
      openedAt: "2026-08-26T00:00:00.000Z",
      maxHoldMinutes: 90,
      exchangePositionKey: "BTCUSDT:long",
    }],
  });
  assert.deepEqual(audit.protectionMissing, ["BTCUSDT:long"]);
  assert.deepEqual(audit.orphanOrders, []);
  assert.deepEqual(audit.unknownSideOrders.map((row) => row.orderKey), ["unknown-side-order"]);
  assert.ok(audit.issues.some((issue) => issue.code === "UNKNOWN_EXCHANGE_PROTECTION_SIDE"));
});

test("异常历史平仓让风险统计失败关闭，但不会阻断当前仓位管理", () => {
  assert.equal(parseBitgetPositionSide("future-enum"), null);
  const client = readFileSync(resolve(process.cwd(), "lib/bitget/demo-client.ts"), "utf8");
  const strategy = readFileSync(resolve(process.cwd(), "lib/trading-signals/three-horizon-strategy.ts"), "utf8");
  const closedReader = client.slice(
    client.indexOf("export async function getBitgetDemoClosedPositions"),
    client.indexOf("export async function getBitgetDemoPendingStrategyOrders")
  );
  const management = strategy.slice(
    strategy.indexOf("async function manageActiveDecisions"),
    strategy.indexOf("async function buildCandidate")
  );
  assert.match(closedReader, /requireBitgetPositionSide\(row\.posSide\)/);
  assert.match(management, /getBitgetDemoClosedPositions\(100\)\.catch\(\(\) => \[\]\)/);
  assert.match(management, /getBitgetDemoCurrentPositions\(\)/);
  assert.match(management, /getBitgetDemoPendingStrategyOrders\(\)/);
  const riskSnapshot = strategy.slice(
    strategy.indexOf("async function buildRiskSnapshot"),
    strategy.indexOf("function chooseLeverage")
  );
  assert.match(riskSnapshot, /getBitgetDemoClosedPositions\(100\)/);
  assert.match(riskSnapshot, /blocked: true/);
});

test("孤立保护单清理逐笔传播状态，失败后继续下一笔", async () => {
  const orders = [
    { ...order, orderKey: "confirmed", orderId: "confirmed" },
    { ...order, orderKey: "failed", orderId: "failed" },
    { ...order, orderKey: "ack", orderId: "ack" },
  ];
  const calls: string[] = [];
  const results = await runOrphanProtectionCleanup({
    orders,
    cancel: async (candidate) => {
      calls.push(candidate.orderKey);
      if (candidate.orderKey === "failed") throw new Error("exchange timeout");
      return { status: candidate.orderKey === "ack" ? "ACKNOWLEDGED" : "CONFIRMED" };
    },
  });
  assert.deepEqual(calls, ["confirmed", "failed", "ack"]);
  assert.deepEqual(results, [
    { orderKey: "confirmed", status: "CONFIRMED" },
    { orderKey: "failed", status: "FAILED", error: "exchange timeout" },
    { orderKey: "ack", status: "ACKNOWLEDGED" },
  ]);
  const audit = auditUnifiedLiveCustody({ snapshotAvailable: true, positions: [], orders, slices: [] });
  assert.equal(audit.freezeNewEntries, true, "同轮清理结果不能跳过下一次权威快照直接解冻");
});

test("取消接口暴露ACK状态，托管周期对孤立保护单执行幂等清理", () => {
  const client = readFileSync(resolve(process.cwd(), "lib/bitget/demo-client.ts"), "utf8");
  const runtime = readFileSync(resolve(process.cwd(), "lib/trading-signals/unified-live-runtime.ts"), "utf8");
  const strategy = readFileSync(resolve(process.cwd(), "lib/trading-signals/three-horizon-strategy.ts"), "utf8");
  assert.match(client, /Promise<\{ status: "CONFIRMED" \| "ACKNOWLEDGED"; outboxId: string \}>/);
  assert.match(runtime, /runOrphanProtectionCleanup/);
  assert.match(client, /idempotencyKey: `cancel-protection:\$\{ref\}`/);
  assert.match(strategy, /cancellation\?\.status !== "CONFIRMED"/);
});

test("管理员和Cron路由在任何可变托管操作前完成鉴权", () => {
  const admin = readFileSync(resolve(process.cwd(), "app/api/admin/bitget-demo/strategies/route.ts"), "utf8");
  const watchdog = readFileSync(resolve(process.cwd(), "app/api/cron/trading-watchdog/route.ts"), "utf8");
  const adminGet = admin.slice(admin.indexOf("export async function GET"), admin.indexOf("export async function POST"));
  const adminPost = admin.slice(admin.indexOf("export async function POST"));
  assert.ok(adminGet.indexOf("requireAdmin") < adminGet.indexOf("inspectUnifiedLiveCustody"));
  assert.doesNotMatch(adminGet, /runUnifiedLiveCustodyCycle/);
  assert.match(adminGet, /evaluateUnifiedLiveNewEntryGateReadOnly/);
  assert.doesNotMatch(adminGet, /evaluateUnifiedLiveNewEntryGate\("official"\)/);
  assert.ok(adminPost.indexOf("requireAdmin") < adminPost.indexOf("runUnifiedLiveCustodyCycle"));
  const watchdogGet = watchdog.slice(watchdog.indexOf("export async function GET"), watchdog.indexOf("export async function POST"));
  const watchdogPost = watchdog.slice(watchdog.indexOf("export async function POST"));
  assert.ok(watchdogGet.indexOf("authorizeCron") < watchdogGet.indexOf("runUnifiedLiveCustodyCycle"));
  assert.doesNotMatch(watchdogPost, /runUnifiedLiveCustodyCycle/);
  assert.match(watchdogPost, /return GET\(request\)/);
  const gate = readFileSync(resolve(process.cwd(), "lib/trading-signals/unified-live-entry-gate.ts"), "utf8");
  const readOnlyGate = gate.slice(gate.indexOf("export async function evaluateUnifiedLiveNewEntryGateReadOnly"));
  assert.match(readOnlyGate, /inspectUnifiedLiveCustody/);
  assert.doesNotMatch(readOnlyGate, /getUnifiedLiveRuntimeStatus|runUnifiedLiveCustodyCycle/);
  assert.match(adminGet, /evaluateUnifiedLiveNewEntryGateReadOnly\("official", custody\)/);
});
