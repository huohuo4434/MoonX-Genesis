import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const demoClient = read("lib/bitget/demo-client.ts");
const reliability = read("lib/trading-signals/trading-reliability.ts");
const strategy = read("lib/trading-signals/three-horizon-strategy.ts");
const migration = read("prisma/migrations/20260804050000_trade_reliability_phase4/migration.sql");
const watchdog = read("app/api/cron/trading-watchdog/route.ts");
const adminRoute = read("app/api/admin/bitget-demo/reliability/route.ts");
const adminClient = read("components/admin/TradingReliabilityClient.tsx");
const page = read("app/admin/bitget-demo/page.tsx");
const pkg = JSON.parse(read("package.json")) as { scripts: { test: string } };
const vercel = JSON.parse(read("vercel.json")) as { crons: Array<{ path: string; schedule: string }> };

function all(text: string, values: string[]) {
  for (const value of values) assert.ok(text.includes(value), `缺少核心标记：${value}`);
}

test("Phase 4保持Bitget UTA V3 Demo硬隔离", () => {
  all(demoClient, ['const BASE_URL = "https://api.bitget.com"', 'paptrading: "1"', '/api/v3/trade/place-order']);
  all(migration, ["api_mode TEXT NOT NULL DEFAULT 'UTA_V3_DEMO'", "paptrading_required BOOLEAN NOT NULL DEFAULT TRUE", "real_trading_locked BOOLEAN NOT NULL DEFAULT TRUE"]);
  assert.doesNotMatch(demoClient + reliability, /BITGET_(LIVE|REAL)_|REAL_TRADING_ALLOWED|LIVE_TRADING_ALLOWED/);
});

test("服务器时间同步和写操作时钟闸门已安装", () => {
  all(demoClient, ["/api/v2/public/time", "MAX_SAFE_CLOCK_SKEW_MS", "syncBitgetServerClock", "assertBitgetClockSafe", "Date.now() + serverClockOffsetMs"]);
});

test("数据库发件箱具有唯一幂等键和状态机", () => {
  all(migration, ["CREATE TABLE IF NOT EXISTS trade_execution_outbox", "idempotency_key TEXT NOT NULL UNIQUE", "PENDING", "PROCESSING", "ACKNOWLEDGED", "CONFIRMED", "FAILED", "RECONCILED"]);
  all(demoClient, ["ON CONFLICT (idempotency_key)", "acquireOutboxTask", "processBitgetDemoExecutionOutbox", "locked_until"]);
});

test("订单必须按orderId或clientOid回查最终状态", () => {
  all(demoClient, ["/api/v3/trade/order-info", "orderTerminalStatus", 'status === "filled"', 'status === "cancelled"', "getBitgetDemoOrderByClientOid(oid)", "return getBitgetDemoOrderDetailsStrict({ clientOid: oid })"]);
});

test("超时或响应不明时只回查，不盲目重复下单", () => {
  all(demoClient, [
    "BitgetApiError",
    "ambiguousWrite",
    "getBitgetDemoOrderDetailsStrict",
    "响应异常后已按clientOid找回订单",
    "响应异常后已按clientOid找回保护单",
    "ORDER_STATUS_UNKNOWN",
    "FINAL_STATUS_QUERY_FAILED",
    "为防止重复下单，系统只回查、不自动重提",
  ]);
});

test("保护单同时检查当前与历史策略订单", () => {
  all(demoClient, ["/api/v3/trade/unfilled-strategy-orders", "/api/v3/trade/history-strategy-orders", "getStrategyOrderRecord", "history.list ?? []"]);
});

test("被交易所取消或拒绝的任务不会无限自动重开", () => {
  all(demoClient, ["terminal?: boolean", "max_attempts = CASE WHEN $7 THEN attempt_count ELSE max_attempts END", "terminal: true"]);
});

test("三周期新开仓进入Phase 4可靠性闸门", () => {
  all(strategy, ["getTradingReliabilityOpeningGate", "reliabilityGate.allowed", "reliabilityGate.code", "reliabilityGate.reason"]);
});

test("看门狗覆盖关键失效场景", () => {
  all(reliability, ["TRADING_HEARTBEAT_STALE", "MARKET_DATA_STALE", "CLOCK_SKEW", "OUTBOX_STUCK", "ORPHAN_EXCHANGE_POSITION", "UNPROTECTED_POSITION", "UNKNOWN_PROTECTION_ORDER"]);
});

test("异常后至少连续三轮健康检查才恢复开仓", () => {
  all(reliability, ["RECOVERY_HEALTHY_RUNS = 3", "连续健康检查", 'mode: "RECOVERING"', 'mode: "RUNNING"']);
});

test("无保护仓位连续出现两次后才尝试Demo补挂", () => {
  all(reliability, ["AUTO_REPAIR_AFTER_OCCURRENCES = 2", "occurrence_count", "phase4-repair", "placeBitgetDemoProtectionOrder"]);
});

test("孤儿仓位不自动全部平仓", () => {
  all(reliability, ["系统不会自动全部平仓", 'mode: "EMERGENCY_CLOSE_ONLY"']);
  assert.doesNotMatch(adminRoute + adminClient, /closeAll|liquidateAll|emergencyCloseAll/i);
});

test("独立看门狗Cron每五分钟运行并校验密钥", () => {
  const cron = vercel.crons.find((row) => row.path === "/api/cron/trading-watchdog");
  assert.deepEqual(cron, { path: "/api/cron/trading-watchdog", schedule: "*/5 * * * *" });
  all(watchdog, ["CRON_SECRET", "Bearer ${secret}", "runTradingReliabilityWatchdog"]);
});

test("管理员API与界面已接入且不暴露危险按钮", () => {
  all(adminRoute, ["requireAdmin", "retryFailedTradeOutbox", "clearTradingReliabilityAdminOverride"]);
  all(adminClient, ["Phase 4 交易可靠性与故障恢复", "执行发件箱", "最近可靠性异常", "真钱永久锁定", "只管理已有仓位", "申请恢复运行"]);
  all(page, ["TradingReliabilityClient", "getTradingReliabilityDashboard"]);
});

test("邮件只对真正的可靠性异常发送", () => {
  all(reliability, ["sendIncidentAlerts", "sendRawEmail", "paymentNotifyTo", 'item.severity !== "WARNING" && item.severity !== "CRITICAL"']);
  assert.doesNotMatch(reliability, /TRIGGER_WAITING.*sendRawEmail/s);
});

test("项目完整测试已包含Phase 4回归", () => {
  assert.ok(pkg.scripts.test.includes("tests/trading-reliability-phase4.test.ts"));
});

test("数据库迁移不含破坏性语句", () => {
  assert.doesNotMatch(migration, /DROP\s+TABLE|TRUNCATE|DELETE\s+FROM/i);
});
