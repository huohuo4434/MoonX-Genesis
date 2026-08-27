import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), "utf8");
const cron = read("app/api/cron/prediction-auto-trader/route.ts");
const runtime = read("lib/bitget/demo-runtime.ts");
const client = read("lib/bitget/demo-client.ts");
const strategy = read("lib/trading-signals/three-horizon-strategy.ts");
const store = read("lib/trading-signals/unified-live-store.ts");
const adapter = read("lib/trading-signals/unified-live-exchange-adapter.ts");
const custody = read("lib/trading-signals/unified-live-custody-core.ts");
const adminLive = read("app/api/admin/live-trading/route.ts");
const adminControlCore = read("lib/trading-signals/unified-live-admin-control-core.ts");
const runtimeObservability = read("lib/bitget/runtime-observability-core.ts");
const unifiedRuntime = read("lib/trading-signals/unified-live-runtime.ts");
const custodianCron = read("app/api/cron/live-trading-custodian/route.ts");
const memberLive = read("app/api/member/live-trading/route.ts");
const memberSettings = read("app/api/member/live-trading/settings/route.ts");
const memberClient = read("components/live-trading/MemberLiveTradingClient.tsx");
const adminClient = read("components/live-trading/AdminLiveTradingClient.tsx");
const vercel = JSON.parse(read("vercel.json"));

test("prediction cron now delegates to the existing three-horizon server runtime behind the unified gate", () => {
  assert.match(cron, /evaluateUnifiedLiveNewEntryGate\("official"\)/);
  assert.match(cron, /runBitgetDemoServerRuntime\(now, "CRON"/);
  assert.match(cron, /forceManageOnly: !autoEntryAllowed/);
  assert.match(cron, /forceManageOnlyReason: !autoEntryAllowed \? effectiveGate\.reasons\.join\(","\) : undefined/);
  assert.match(cron, /catch\(\(\) => \(\{[\s\S]*reasons: \["UNIFIED_LIVE_GATE_UNAVAILABLE"\]/);
  assert.doesNotMatch(cron, /error instanceof Error \? error\.message/);
  assert.match(cron, /isUnifiedLiveActiveExecutionEnabled/);
  assert.match(cron, /export const maxDuration = 120/);
  assert.match(cron, /const requestStartedAtMs = Date\.now\(\)/);
  assert.match(cron, /new Date\(requestStartedAtMs \+ 105_000\)/);
  assert.match(cron, /\[prediction-auto-trader\]/);
  assert.match(cron, /orderAttempts: reportCount\(report\.threeHorizon, "orderAttempts"\)/);
  assert.doesNotMatch(cron, /console\.info[\s\S]{0,500}(orderId|quantity|credentials)/);
  const routeBody = cron.slice(cron.indexOf("export async function GET"));
  assert.ok(routeBody.indexOf("const requestStartedAtMs = Date.now()") < routeBody.indexOf("evaluateUnifiedLiveNewEntryGate"));
  assert.match(cron, /CRON_SECRET/);
  assert.doesNotMatch(cron, /placeBitgetDemoMarketOrder/);
  assert.doesNotMatch(cron, /fetch\(/);
  const entry = vercel.crons.find((row) => row.path === "/api/cron/prediction-auto-trader");
  assert.equal(entry?.schedule, "* * * * *");
});

test("runtime cannot start live experiment or new exposure while unified gate forces manage-only", () => {
  assert.match(runtime, /forceManageOnly\?: boolean/);
  assert.match(runtime, /forceManageOnlyReason\?: string/);
  assert.match(runtime, /composeRuntimePauseMessage/);
  assert.match(runtimeObservability, /阻断码：\$\{codes\}/);
  assert.match(runtime, /allowStart: syncOptions\.allowStart && !options\.forceManageOnly/);
  assert.match(runtime, /startup\.policy\.allowNewEntries && !forcedManageOnly/);
  assert.match(runtime, /const scanOnly = forcedManageOnly && marketOk && account\.connected/);
  assert.match(runtime, /scanOnly,/);
  assert.match(runtime, /runThreeHorizonStrategyEngine/);
  assert.match(runtime, /LIVE_STRATEGY_SYMBOLS_PER_RUN/);
  assert.match(strategy, /scanOnly\?: boolean/);
  assert.match(strategy, /options\.scanOnly[\s\S]*?"SHADOW_READY"/);
  assert.match(strategy, /!options\.scanOnly && Date\.now\(\) < newEntryCutoffMs/);
});

test("1000U experiment has hard capital and loss caps independent of stale larger env aliases", () => {
  assert.match(client, /Math\.min\(1000, numericEnv\("BITGET_LIVE_INITIAL_CAPITAL_USDT"/);
  assert.match(client, /liveDailyLossUsdt = Math\.min\(requestedLiveDailyLossUsdt, Math\.max\(1, liveInitialCapitalUsdt \* 0\.01\)\)/);
  assert.match(client, /liveMaxDrawdownUsdt = Math\.min\(requestedLiveMaxDrawdownUsdt, Math\.max\(5, liveInitialCapitalUsdt \* 0\.05\)\)/);
  assert.match(client, /liveMaxPositionNotionalUsdt: Math\.min\(400,/);
  assert.match(client, /liveMaxConcurrentPositions: Math\.min\(4,/);
  assert.match(client, /liveMaxTradesPerDay: Math\.min\(6,/);
  assert.match(client, /leverageOverride\?: number/);
  assert.match(client, /configureUtaSymbol\(payload\.symbol, posSide, preparedSettings, payload\.leverage\)/);
});

test("short-term execution is 4H -> 30m -> 5m and only execution timing can change, not official direction", () => {
  assert.match(strategy, /environmentTimeframe: "4H"/);
  assert.match(strategy, /directionTimeframe: "30m"/);
  assert.match(strategy, /entryTimeframe: "5m\/1m"/);
  assert.match(strategy, /analyzeChanStructure\(m30\)/);
  assert.match(strategy, /analyzeChanStructure\(m5\)/);
  assert.match(strategy, /strictChanTrigger/);
  assert.match(strategy, /rightSideTrigger/);
  assert.match(strategy, /Direction is owned by formal MOOX research/);
  assert.match(strategy, /Math\.min\(rawEquity, environment\.liveInitialCapitalUsdt, 1000\)/);
  assert.match(strategy, /Math\.min\(unifiedSetting\.leverage, environment\.leverage\)/);
  assert.match(strategy, /const liveRiskScale = clamp\(input\.evaluation\.riskScale \?\? 1, 0\.1, 1\)/);
  assert.match(strategy, /Math\.min\(calculated\.notionalAmount \* liveRiskScale, environment\.liveMaxPositionNotionalUsdt, 400\)/);
});

test("live sizing comes from unified short-medium-long settings and successful orders are registered for custody", () => {
  assert.match(strategy, /getUnifiedLiveSetting\("official", unifiedHorizon\)/);
  assert.match(strategy, /calculateUnifiedLivePositionSize/);
  assert.match(strategy, /registerUnifiedLiveStrategySlice/);
  assert.match(store, /strategyDecisionId: input\.strategyDecisionId/);
  assert.match(store, /status: "PENDING"/);
  assert.match(store, /markUnifiedLivePendingSlicesOpen/);
  assert.match(unifiedRuntime, /audit\.matchedPendingSlices[\s\S]*markUnifiedLivePendingSlicesOpen/);
  assert.match(custody, /settlementGraceMs = 2 \* 60_000/);
});

test("unified custody reads authoritative UTA positions and protection orders and fails closed", () => {
  assert.match(adapter, /getBitgetDemoCurrentPositions/);
  assert.match(adapter, /getBitgetDemoPendingStrategyOrders/);
  assert.match(adapter, /available: false, positions: \[\], orders: \[\]/);
  assert.doesNotMatch(adapter, /live-admin-snapshot/);
});

test("custody status GET is read-only and the explicit cron retains enough time to reconcile", () => {
  const getBody = adminLive.slice(
    adminLive.indexOf("export async function GET"),
    adminLive.indexOf("export async function POST"),
  );
  assert.match(getBody, /inspectUnifiedLiveCustody/);
  assert.doesNotMatch(getBody, /runUnifiedLiveCustodyCycle|getUnifiedLiveRuntimeStatus|setUnifiedLiveMode/);
  const inspection = unifiedRuntime.slice(
    unifiedRuntime.indexOf("export async function inspectUnifiedLiveCustody"),
    unifiedRuntime.indexOf("export async function getUnifiedLiveRuntimeStatus"),
  );
  assert.doesNotMatch(inspection, /ensureUnifiedLiveAccount|markUnifiedLiveManualClosures|recordUnifiedLiveEvents|setUnifiedLiveMode/);
  assert.match(custodianCron, /export const maxDuration = 300/);
  assert.match(custodianCron, /runUnifiedLiveCustodyCycle/);
});

test("admin member page controls official 1000U settings, ordinary members remain local-agent scoped", () => {
  assert.match(memberLive, /officialControl \? "official" : `member:\$\{actor\.id\}`/);
  assert.doesNotMatch(memberLive, /runUnifiedLiveCustodyCycle/);
  assert.match(memberLive, /LIVE_STATUS_DEADLINE_MS = 9_000/);
  assert.match(memberSettings, /const leverageMax = officialControl \? 2 : 10/);
  assert.match(memberSettings, /officialControl \? "official" : `member:\$\{actor\.id\}`/);
  assert.match(memberClient, /启用1000U实盘/);
  assert.match(memberClient, /请输入 LIVE1000/);
  assert.match(memberClient, /停止新开仓/);
  assert.match(memberLive, /getReadOnlyLiveStatusSnapshot/);
  assert.match(memberLive, /strategyDiagnostics:/);
  assert.match(memberClient, /三周期自动扫描诊断/);
  assert.match(memberClient, /为什么现在没有下单 \/ 系统排查/);
});

test("LIVE mode switch is explicit and requires runtime, Bitget, 1000U and custody readiness", () => {
  assert.match(adminLive, /runtime\.mode === "LIVE"/);
  assert.match(adminLive, /runtime\.allowLiveSwitch/);
  assert.match(adminLive, /runtime\.allowNewEntriesByEnv/);
  assert.match(adminLive, /bitget\.mode === "LIVE_EXPERIMENT"/);
  assert.match(adminLive, /bitget\.executionAllowed/);
  assert.match(adminLive, /strategyActiveExecutionEnabled/);
  assert.match(adminLive, /applyUnifiedLiveModeChange/);
  assert.match(adminControlCore, /input\.confirmation !== "LIVE1000"/);
  assert.match(adminControlCore, /LIVE_CONFIRMATION_REQUIRED/);
  assert.match(adminLive, /Math\.abs\(bitget\.liveInitialCapitalUsdt - 1000\) < 0\.01/);
  assert.match(adminLive, /status\.audit\?\.freezeNewEntries/);
  assert.match(adminClient, /请输入 LIVE1000/);
  assert.match(adminClient, /mode: "LIVE", confirmation/);
  assert.match(adminClient, /account\?\.mode === "MANAGE_ONLY" && blockerCount === 0/);
  assert.match(adminClient, /restoreBlockers/);
});

test("runtime cold starts probe existing tables before schema compatibility DDL", () => {
  const probe = runtime.indexOf("SELECT runtime_state.id,");
  const ddl = runtime.indexOf("CREATE TABLE IF NOT EXISTS trade_bitget_runtime_state");
  assert.ok(probe >= 0);
  assert.ok(ddl > probe);
  assert.match(runtime, /runtime_state\.run_lock_owner[\s\S]{0,300}runtime_state\.last_account_error/);
  assert.match(runtime, /resolveRuntimeLeaseSeconds\(options\.absoluteDeadlineAt, runtimeTiming\.startedAtMs\)/);
});
