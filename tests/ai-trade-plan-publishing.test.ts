import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const plans = read("lib/trading-signals/ai-trade-plans.ts");
const engine = read("lib/trading-signals/three-horizon-strategy.ts");
const migration = read("prisma/migrations/20260804070000_ai_trade_plan_publishing/migration.sql");
const member = read("components/member/AiTradingDeskClient.tsx");
const admin = read("components/admin/AiTradePlanAdminClient.tsx");
const memberTypes = read("types/ai-trading-desk.ts");
const pkg = JSON.parse(read("package.json")) as { scripts: { test: string } };

test("AI计划在Bitget可执行订单前发布并锁定", () => {
  assert.match(engine, /prepareAiTradePlanBeforeExecution/);
  assert.match(engine, /if \(!planGate\.allowed\)/);
  assert.match(engine, /executeReadyDecision/);
  assert.ok(engine.indexOf("prepareAiTradePlanBeforeExecution") < engine.lastIndexOf("executeReadyDecision"));
  assert.match(plans, /PLAN_PUBLISHED_BEFORE_EXECUTION/);
  assert.match(plans, /PLAN_LEAD_TIME/);
});

test("计划发布门槛和执行门槛分开", () => {
  assert.match(migration, /planning_min_confidence/);
  assert.match(engine, /planningMinConfidence/);
  assert.match(plans, /CANDIDATE_PLAN_ONLY/);
  assert.match(plans, /executionThreshold/);
});

test("计划采用不可覆盖版本和内容哈希", () => {
  assert.match(migration, /content_hash TEXT NOT NULL/);
  assert.match(migration, /UNIQUE\(plan_group_id, version\)/);
  assert.match(plans, /hashContent/);
  assert.match(plans, /PLAN_SUPERSEDED/);
  assert.match(plans, /reconcileForecastBoundPlan/);
});

test("计划与事件账本是追加式结构", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS trade_ai_plans/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS trade_ai_plan_events/);
  assert.match(migration, /event_key TEXT NOT NULL UNIQUE/);
  assert.match(plans, /ON CONFLICT \(event_key\) DO NOTHING/);
  assert.doesNotMatch(migration, /DROP\s+TABLE|TRUNCATE|DELETE\s+FROM/i);
});

test("每个计划包含入场区止损三目标风险有效期和失效规则", () => {
  for (const token of [
    "entry_zone_low", "entry_zone_high", "protective_stop", "target_1",
    "target_2", "target_3", "risk_percent", "expires_at", "invalidation_rule", "cancel_if",
  ]) assert.ok(migration.includes(token), `缺少字段 ${token}`);
});

test("会员端把锁定计划、条件与时间线交给统一交易意图面板", () => {
  assert.match(member, /AiTradeIntentBoard/);
  assert.match(member, /plans: snapshot\.publishedPlans/);
  assert.match(member, /计划在执行前锁定/);
  assert.match(memberTypes, /publishedPlans: AiTradePlan\[\]/);
  assert.match(memberTypes, /planSummary: AiTradePlanSummary/);
});

test("管理员端通过统一交易意图面板展示计划审计", () => {
  assert.match(admin, /AiTradeIntentBoard/);
  assert.match(admin, /showHistory/);
  assert.match(admin, /dashboard/);
});

test("AI计划按实际交易环境区分Demo与实盘，同时保持请求隔离", () => {
  const client = read("lib/bitget/demo-client.ts");
  assert.match(plans, /BITGET_DEMO/);
  assert.match(plans, /BITGET_LIVE/);
  assert.match(client, /if \(env\.mode === "DEMO"\) headers\.paptrading = "1"/);
});

test("完整测试脚本包含计划发布回归", () => {
  assert.ok(pkg.scripts.test.includes("tests/ai-trade-plan-publishing.test.ts"));
});


test("计划数据库写入结果兼容noUncheckedIndexedAccess", () => {
  assert.doesNotMatch(plans, /return\s+rows\[0\];/);
  assert.match(plans, /const insertedPlan = rows\[0\]/);
  assert.match(plans, /AI交易计划写入后未返回记录/);
  assert.match(plans, /const updatedPlan = rows\[0\]/);
  assert.match(plans, /AI交易计划更新后未返回记录/);
});
