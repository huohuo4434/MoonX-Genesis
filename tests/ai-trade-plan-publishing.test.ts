import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  classifyDynamicPlanAudit,
  requireDynamicPlanMaintenanceStore,
  requireAuthoritativePlanMaintenanceSnapshots,
  resolveDynamicPlanStatus,
  readAuthoritativePlanMaintenanceRows,
  runClassifiedPlanMaintenance,
  selectAuthoritativePlanSnapshot,
  shouldPersistPlanDecisionLink,
} from "../lib/trading-signals/ai-plan-dynamic-sync-core";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const plans = read("lib/trading-signals/ai-trade-plans.ts");
const engine = read("lib/trading-signals/three-horizon-strategy.ts");
const runtime = read("lib/bitget/demo-runtime.ts");
const migration = read("prisma/migrations/20260804070000_ai_trade_plan_publishing/migration.sql");
const member = read("components/member/AiTradingDeskClient.tsx");
const admin = read("components/admin/AiTradePlanAdminClient.tsx");
const memberTypes = read("types/ai-trading-desk.ts");
const pkg = JSON.parse(read("package.json")) as { scripts: { test: string } };

test("pre-entry blocks stay audit-only while order lifecycle decisions own the plan link", () => {
  for (const status of ["OBSERVING", "READY", "SHADOW_READY", "BLOCKED", "EXPIRED"] as const) {
    assert.equal(shouldPersistPlanDecisionLink(status), false, `${status} must not create a durable plan binding`);
  }
  for (const status of ["ORDER_SUBMITTED", "OPEN", "PARTIAL", "CLOSING", "CLOSED", "ERROR"] as const) {
    assert.equal(shouldPersistPlanDecisionLink(status), true, `${status} must preserve order lifecycle linkage`);
  }

  const auditEvents: Array<{ decisionId: string; status: string; rejection: string }> = [];
  const linkedDecisions = new Map<string, string>();
  const persistAudit = (decision: { id: string; status: "BLOCKED" | "OPEN"; rejectionReason: string }) => {
    auditEvents.push({
      decisionId: decision.id,
      status: decision.status,
      rejection: decision.rejectionReason,
    });
    if (shouldPersistPlanDecisionLink(decision.status)) linkedDecisions.set(decision.id, "plan-1");
  };

  persistAudit({ id: "lead-time-block", status: "BLOCKED", rejectionReason: "PLAN_LEAD_TIME" });
  assert.deepEqual(auditEvents, [{
    decisionId: "lead-time-block",
    status: "BLOCKED",
    rejection: "PLAN_LEAD_TIME",
  }], "the post-gate block remains auditable in the same turn");
  assert.equal(linkedDecisions.size, 0, "the audit-only block must not become a second maintenance binding");

  persistAudit({ id: "confirmed-open", status: "OPEN", rejectionReason: "" });
  assert.deepEqual([...linkedDecisions.entries()], [["confirmed-open", "plan-1"]]);
  assert.equal(new Set(linkedDecisions.values()).size, 1, "one lifecycle decision produces one plan identity");

  const createBody = plans.slice(plans.indexOf("async function createPlan"), plans.indexOf("async function supersedePlan"));
  const refreshBody = plans.slice(plans.indexOf("async function refreshForecastBoundPlan"), plans.indexOf("async function auditFailedLiveCommissioningPlan"));
  const updateBody = plans.slice(plans.indexOf("async function updateDynamicPlan"), plans.indexOf("async function batchCheckpointDynamicPlans"));
  assert.match(createBody, /source_decision_id/);
  assert.doesNotMatch(createBody, /UPDATE trade_three_horizon_decisions SET plan_id/);
  assert.match(refreshBody, /source_decision_id=\$29/);
  assert.doesNotMatch(refreshBody, /UPDATE trade_three_horizon_decisions SET plan_id/);
  assert.match(updateBody, /shouldPersistPlanDecisionLink\(decision\.status\)/);
  assert.match(updateBody, /decisionId: decision\.id[\s\S]*rejectionCode: decision\.rejectionCode/);
  assert.match(plans, /link_decision: shouldPersistPlanDecisionLink\(decision\.status\)/);
  assert.match(plans, /plan_id = CASE WHEN input\.link_decision THEN input\.plan_id ELSE d\.plan_id END/);
});

test("an unlinked blocked checkpoint remains unlinked and cannot manufacture a duplicate", () => {
  const classification = classifyDynamicPlanAudit({
    current: {
      id: "plan-1",
      status: "ARMED",
      conditionsMet: 5,
      conditionsTotal: 5,
      lastCheckedAt: new Date("2026-08-14T00:00:00.000Z"),
      clientOid: null,
      bitgetOrderId: null,
      submittedAt: null,
      firstFillAt: null,
      averageFillPrice: null,
      closedAt: null,
      closeReason: null,
    },
    decision: {
      id: "lead-time-block",
      planId: null,
      status: "BLOCKED",
      conditionsMet: 5,
      conditionsTotal: 5,
      clientOid: null,
      bitgetOrderId: null,
      rejectionReason: "PLAN_LEAD_TIME",
    },
    desiredStatus: "ARMED",
    now: new Date("2026-08-14T00:06:00.000Z"),
  });
  assert.equal(classification, "CHECKPOINT");
  assert.equal(shouldPersistPlanDecisionLink("BLOCKED"), false);
});

test("mixed maintenance writes material rows immediately and batches eight checkpoints in one call", async () => {
  const rows = [
    { id: "checkpoint-1", kind: "CHECKPOINT" as const },
    { id: "material-status", kind: "MATERIAL" as const },
    ...Array.from({ length: 7 }, (_, index) => ({ id: `checkpoint-${index + 2}`, kind: "CHECKPOINT" as const })),
    { id: "none", kind: "NONE" as const },
    { id: "material-order", kind: "MATERIAL" as const },
  ];
  const calls: string[] = [];
  let concurrent = 0;
  let maximumConcurrent = 0;
  let checkpointDatabaseCalls = 0;
  const clock = [0, 4, 4, 9, 9, 15];
  const result = await runClassifiedPlanMaintenance({
    rows,
    classify: (row) => row.kind,
    writeMaterial: async (row) => {
      concurrent += 1;
      maximumConcurrent = Math.max(maximumConcurrent, concurrent);
      await Promise.resolve();
      calls.push(`material:${row.id}`);
      concurrent -= 1;
    },
    writeCheckpoints: async (checkpoints) => {
      checkpointDatabaseCalls += 1;
      concurrent += 1;
      maximumConcurrent = Math.max(maximumConcurrent, concurrent);
      calls.push(`batch:${checkpoints.map((row) => row.id).join(",")}`);
      concurrent -= 1;
    },
    queryMs: 11,
    monotonicNowMs: () => clock.shift() ?? 15,
  });

  assert.deepEqual(result, {
    selected: 11,
    none: 1,
    material: 2,
    duplicateFresh: 0,
    checkpointRows: 8,
    checkpointBatchCalls: 1,
    queryMs: 11,
    materialMs: 9,
    duplicateFreshMs: 0,
    checkpointBatchMs: 6,
  });
  assert.equal(checkpointDatabaseCalls, 1);
  assert.deepEqual(calls.slice(0, 2), ["material:material-status", "material:material-order"]);
  assert.match(calls[2] ?? "", /^batch:checkpoint-1,checkpoint-2,[\s\S]*checkpoint-8$/);
  assert.equal(maximumConcurrent, 1);
  assert.match(plans, /selected\.plan_id IS NOT NULL AND p\.id = selected\.plan_id[\s\S]*UNION ALL[\s\S]*selected\.plan_id IS NULL AND p\.source_decision_id = selected\.id/);
  assert.doesNotMatch(plans, /p\.id = selected\.plan_id OR p\.source_decision_id = selected\.id/);
  const maintenanceBody = plans.slice(
    plans.indexOf("export async function syncAiTradePlansFromRecentDecisions"),
    plans.indexOf("async function loadEvents")
  );
  assert.match(maintenanceBody, /runClassifiedPlanMaintenance/);
  assert.match(engine, /const planMaintenance = await syncAiTradePlansFromRecentDecisions[\s\S]*await reportProgress\("PLAN_MAINTENANCE_COMPLETE"/);
  assert.doesNotMatch(engine, /syncAiTradePlansFromRecentDecisions\([\s\S]{0,180}\.catch\(/);
  for (const field of [
    "selected", "none", "material", "duplicateFresh", "checkpointRows", "checkpointBatchCalls",
    "queryMs", "materialMs", "duplicateFreshMs", "checkpointBatchMs",
  ]) {
    assert.match(engine, new RegExp(`${field}: planMaintenance\\.${field}`));
  }
  assert.match(maintenanceBody, /checkpointIdentity: \(\{ current \}\) => current\.id/);
  for (const field of [
    "audit_submitted_at",
    "audit_first_fill_at",
    "audit_average_fill_price",
    "audit_closed_at",
  ]) {
    assert.match(maintenanceBody, new RegExp(field));
  }
  assert.equal([...maintenanceBody.matchAll(/syncAiTradePlanFromDecision\(decision/g)].length, 1,
    "only duplicate plan bindings may use the per-row authoritative fresh read");
  assert.equal([...maintenanceBody.matchAll(/\$queryRawUnsafe/g)].length, 1);
  const checkpointWriter = plans.slice(
    plans.indexOf("async function batchCheckpointDynamicPlans"),
    plans.indexOf("function statusFromDecision")
  );
  assert.equal([...checkpointWriter.matchAll(/\$queryRawUnsafe/g)].length, 1);
  assert.match(checkpointWriter, /updated_plans AS[\s\S]*updated_decisions AS[\s\S]*inserted_events AS/);
  assert.match(checkpointWriter, /ON CONFLICT \(event_key\) DO NOTHING/);
  assert.match(checkpointWriter, /CONDITION_PROGRESS:\$\{decision\.id\}:\$\{decision\.conditionsMet\}/);
  for (const field of ["plan_id", "decision_id", "current_price", "distance_to_entry_pct", "event_id", "event_key", "event_at"]) {
    assert.match(checkpointWriter, new RegExp(`${field}:`));
  }
  assert.match(checkpointWriter, /expected_count \/ CASE[\s\S]*updated_plan_count = expected_count[\s\S]*updated_decision_count = expected_count/);
  const materialWriter = plans.slice(
    plans.indexOf("async function updateDynamicPlan"),
    plans.indexOf("async function batchCheckpointDynamicPlans")
  );
  assert.match(materialWriter, /client_oid = COALESCE\(\$9, client_oid\)/);
  assert.match(materialWriter, /bitget_order_id = COALESCE\(\$10, bitget_order_id\)/);
  assert.match(materialWriter, /submitted_at = CASE WHEN \$2 = 'ORDER_SUBMITTED' THEN COALESCE\(submitted_at, \$7\)/);
  assert.match(materialWriter, /first_fill_at = CASE WHEN \$2 IN \('PARTIALLY_FILLED','OPEN','REDUCED','CLOSED'\) THEN COALESCE\(first_fill_at, \$7\)/);
  assert.match(materialWriter, /average_fill_price = CASE WHEN \$2 IN \('PARTIALLY_FILLED','OPEN','REDUCED','CLOSED'\) THEN COALESCE\(average_fill_price, \$5\)/);
  assert.match(materialWriter, /closed_at = CASE WHEN \$2 IN \('CLOSED','EXPIRED','INVALIDATED','EXECUTION_ERROR'\) THEN COALESCE\(closed_at, \$7\)/);
});

test("authoritative plan id wins and legacy source lookup only runs for a null plan id", () => {
  const plansForDecision = [
    { id: "source-v1", sourceDecisionId: "decision-1", version: 1 },
    { id: "source-v3", sourceDecisionId: "decision-1", version: 3 },
    { id: "source-v3-a", sourceDecisionId: "decision-1", version: 3 },
    { id: "authoritative", sourceDecisionId: "other-decision", version: 1 },
  ];
  assert.equal(selectAuthoritativePlanSnapshot({
    decisionId: "decision-1",
    planId: "authoritative",
    plans: plansForDecision,
  })?.id, "authoritative");
  assert.equal(selectAuthoritativePlanSnapshot({
    decisionId: "decision-1",
    planId: null,
    plans: plansForDecision,
  })?.id, "source-v3");
  assert.equal(selectAuthoritativePlanSnapshot({
    decisionId: "decision-1",
    planId: "dangling-authoritative-id",
    plans: plansForDecision,
  }), null, "a dangling authoritative id must not fall back to a source-linked plan");

  const maintenanceBody = plans.slice(
    plans.indexOf("export async function syncAiTradePlansFromRecentDecisions"),
    plans.indexOf("async function loadEvents")
  );
  assert.match(maintenanceBody, /active_direct[\s\S]*d\.plan_id IS NOT NULL[\s\S]*active_legacy[\s\S]*d\.plan_id IS NULL[\s\S]*EXISTS \([\s\S]*source_plan\.source_decision_id = d\.id/);
  assert.match(maintenanceBody, /nonactive_direct[\s\S]*nonactive_legacy[\s\S]*EXISTS \([\s\S]*source_plan\.source_decision_id = d\.id[\s\S]*nonactive_eligible[\s\S]*recent_increment/);
  assert.ok(maintenanceBody.indexOf("nonactive_eligible AS") < maintenanceBody.indexOf("LIMIT $1"),
    "plan eligibility must be established before the recent increment limit");
  assert.match(maintenanceBody, /ORDER BY candidate\.selection_priority ASC, candidate\.version DESC, candidate\.id ASC/);
  assert.match(maintenanceBody, /selectAuthoritativePlanSnapshot\(\{/,
    "the production adapter must enforce the same authoritative/fallback contract tested above");
});

test("production maintenance query adapter rejects a dangling authoritative plan before completion", async () => {
  assert.throws(() => requireAuthoritativePlanMaintenanceSnapshots([{
    id: "active-open-decision",
    planId: "missing-plan",
    snapshotPlanId: null,
  }]), /authoritative plan missing/);
  assert.doesNotThrow(() => requireAuthoritativePlanMaintenanceSnapshots([{
    id: "legacy-source-decision",
    planId: null,
    snapshotPlanId: "legacy-plan-v2",
  }]));
  let queryCalls = 0;
  await assert.rejects(readAuthoritativePlanMaintenanceRows(async () => {
    queryCalls += 1;
    return [{ id: "active-open-decision", planId: "missing-plan", snapshotPlanId: null }];
  }), /authoritative plan missing/);
  assert.equal(queryCalls, 1);
  const legacyRows = await readAuthoritativePlanMaintenanceRows(async () => [{
    id: "legacy-source-decision",
    planId: null,
    snapshotPlanId: "legacy-plan-v2",
  }]);
  assert.equal(legacyRows[0]?.snapshotPlanId, "legacy-plan-v2");
  const maintenanceBody = plans.slice(
    plans.indexOf("export async function syncAiTradePlansFromRecentDecisions"),
    plans.indexOf("async function loadEvents")
  );
  const validationIndex = maintenanceBody.indexOf("readAuthoritativePlanMaintenanceRows");
  const classificationIndex = maintenanceBody.indexOf("runClassifiedPlanMaintenance");
  assert.ok(validationIndex >= 0 && validationIndex < classificationIndex,
    "the production query result must fail closed before any maintenance write or complete telemetry");
});

test("checkpoint batch failure propagates after serial material writes and cannot report success", async () => {
  const calls: string[] = [];
  await assert.rejects(
    runClassifiedPlanMaintenance({
      rows: [
        { id: "checkpoint", kind: "CHECKPOINT" as const },
        { id: "material", kind: "MATERIAL" as const },
      ],
      classify: (row) => row.kind,
      writeMaterial: async (row) => { calls.push(`material:${row.id}`); },
      writeCheckpoints: async () => {
        calls.push("batch:start");
        throw new Error("atomic batch failed");
      },
    }),
    /atomic batch failed/
  );
  assert.deepEqual(calls, ["material:material", "batch:start"]);
});

test("runtime and engine progress use one wall-clock origin without replacing business now", () => {
  assert.match(runtime, /captureWallClockRunTiming\(\{ businessNow: now \}\)/);
  assert.match(runtime, /progressStartedAtMs: runtimeTiming\.startedAtMs/);
  assert.match(runtime, /durationMs: wallFinish\.durationMs/);
  assert.match(runtime, /updateRuntimeState\(\{[\s\S]*now,/);
  assert.match(engine, /startedAtMs: options\.progressStartedAtMs \?\? Date\.now\(\)/);
  assert.match(runtime, /resolveRuntimeEngineFailureGate\([\s\S]*allowPostEngineOrders/);
  assert.match(runtime, /!engineFailure && environment\.mode !== "LIVE_EXPERIMENT"/);
  assert.match(runtime, /ok: resolveRuntimeEngineFailureGate\([\s\S]*runtimeOk/);
});

test("plan maintenance store unavailability throws instead of reporting an empty successful maintenance", () => {
  const maintenanceBody = plans.slice(
    plans.indexOf("export async function syncAiTradePlansFromRecentDecisions"),
    plans.indexOf("async function loadEvents")
  );
  assert.throws(() => requireDynamicPlanMaintenanceStore({ schemaReady: false, adapterReady: true }), /store unavailable/);
  assert.throws(() => requireDynamicPlanMaintenanceStore({ schemaReady: true, adapterReady: false }), /store unavailable/);
  assert.doesNotThrow(() => requireDynamicPlanMaintenanceStore({ schemaReady: true, adapterReady: true }));
  assert.match(maintenanceBody, /requireDynamicPlanMaintenanceStore\(\{ schemaReady, adapterReady: Boolean\(prisma\) \}\)/);
  assert.doesNotMatch(maintenanceBody, /emptyDynamicPlanMaintenanceTelemetry/);
});

test("duplicate plan bindings fresh-read every row and terminal state cannot be reopened", async () => {
  for (const statuses of [
    ["CLOSED", "OPEN"] as const,
    ["OPEN", "CLOSED"] as const,
  ]) {
    let persistedStatus: "OPEN" | "CLOSED" = "OPEN";
    let freshReads = 0;
    let concurrent = 0;
    let maximumConcurrent = 0;
    const linkedDecisions: string[] = [];
    const events: Array<{ decisionId: string; status: string }> = [];
    const result = await runClassifiedPlanMaintenance({
      rows: statuses.map((status, index) => ({
        id: `decision-${index}`,
        planId: "shared-plan",
        kind: index === 0 ? "MATERIAL" as const : "CHECKPOINT" as const,
        status,
      })),
      classify: (row) => row.kind,
      checkpointIdentity: (row) => row.planId,
      writeMaterial: async () => { throw new Error("duplicate must not use stale prefetched material writer"); },
      writeDuplicateFresh: async (row) => {
        concurrent += 1;
        maximumConcurrent = Math.max(maximumConcurrent, concurrent);
        freshReads += 1;
        const freshlyReadStatus = persistedStatus;
        persistedStatus = resolveDynamicPlanStatus({
          currentStatus: freshlyReadStatus,
          decisionStatus: row.status,
          rejectionCode: "",
          conditionsMet: 5,
          conditionsTotal: 5,
          bitgetOrderId: "order-1",
        }) as typeof persistedStatus;
        linkedDecisions.push(row.id);
        events.push({ decisionId: row.id, status: persistedStatus });
        await Promise.resolve();
        concurrent -= 1;
      },
      writeCheckpoints: async () => { throw new Error("duplicate must never enter checkpoint batch"); },
      queryMs: 7,
      monotonicNowMs: (() => {
        const values = [0, 2, 2, 5];
        return () => values.shift() ?? 5;
      })(),
    });
    assert.deepEqual(result, {
      selected: 2,
      none: 0,
      material: 0,
      duplicateFresh: 2,
      checkpointRows: 0,
      checkpointBatchCalls: 0,
      queryMs: 7,
      materialMs: 0,
      duplicateFreshMs: 5,
      checkpointBatchMs: 0,
    });
    assert.equal(freshReads, 2);
    assert.equal(persistedStatus, "CLOSED");
    assert.deepEqual(linkedDecisions, ["decision-0", "decision-1"]);
    assert.deepEqual(events.map((event) => event.decisionId), linkedDecisions);
    assert.equal(maximumConcurrent, 1);
  }
  assert.match(plans, /writeDuplicateFresh:[\s\S]*syncAiTradePlanFromDecision\(decision, now, \{ force: true \}\)/);
});

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
  assert.match(plans, /closedAt: iso\(row\.closed_at\)/);
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
