import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

function assertOnlyExpectedRlsEnables(migration, expectedTables) {
  const allowedStatement = /ALTER\s+TABLE\s+"([^"]+)"\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY\s*;/gi;
  const actualTables = [...migration.matchAll(allowedStatement)].map((match) => match[1]).sort();
  assert.deepEqual(actualTables, [...expectedTables].sort());

  const withoutAllowedStatements = migration.replace(allowedStatement, "");
  assert.doesNotMatch(withoutAllowedStatements, /ALTER\s+TABLE/i);
  assert.doesNotMatch(
    migration,
    /(?:CREATE|ALTER|DROP)\s+POLICY|\bGRANT\b|\bREVOKE\b|DROP\s+TABLE|DELETE\s+FROM|trade_|Bitget|MooxUnifiedLive/i,
  );
}

test("RLS migration allowlist rejects duplicate, non-RLS and policy changes", () => {
  const allowed = 'ALTER TABLE "QimenShadowReading" ENABLE ROW LEVEL SECURITY;';
  assert.doesNotThrow(() => assertOnlyExpectedRlsEnables(allowed, ["QimenShadowReading"]));
  assert.throws(() => assertOnlyExpectedRlsEnables(`${allowed}\n${allowed}`, ["QimenShadowReading"]));
  assert.throws(() => assertOnlyExpectedRlsEnables(`${allowed}\nALTER TABLE "QimenShadowReading" OWNER TO anon;`, ["QimenShadowReading"]));
  assert.throws(() => assertOnlyExpectedRlsEnables(`${allowed}\nCREATE POLICY public_read ON "QimenShadowReading" FOR SELECT USING (true);`, ["QimenShadowReading"]));
  assert.throws(() => assertOnlyExpectedRlsEnables(`${allowed}\nGRANT SELECT ON "QimenShadowReading" TO anon;`, ["QimenShadowReading"]));
});

test("ledger schema is append-only and isolated from trading tables", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/20260830180000_qimen_shadow_research/migration.sql");
  const automationMigration = read("prisma/migrations/20260830213000_qimen_shadow_automation/migration.sql");
  const readingMigration = read("prisma/migrations/20260830223000_qimen_shadow_reading_inbox/migration.sql");
  const model = schema.slice(schema.indexOf("model QimenShadowObservation"), schema.indexOf("model MasterRule"));
  assert.match(model, /model QimenShadowObservation/);
  assert.match(model, /evaluationDueAt\s+DateTime/);
  assert.match(model, /observationId\s+String\s+@unique/);
  assert.match(model, /contentSha256\s+String\s+@unique/);
  assert.doesNotMatch(model, /updatedAt|MooxUnifiedLive|Bitget|Trade/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "QimenShadowObservation"/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "QimenShadowExperiment"/);
  assert.match(migration, /ALTER TABLE "QimenShadowObservation" ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /ALTER TABLE "QimenShadowExperiment" ENABLE ROW LEVEL SECURITY/);
  assertOnlyExpectedRlsEnables(migration, ["QimenShadowObservation", "QimenShadowExperiment"]);
  assert.match(model, /model QimenShadowCandidate/);
  assert.match(model, /model QimenShadowAutomationRun/);
  assert.match(automationMigration, /CREATE TABLE IF NOT EXISTS "QimenShadowCandidate"/);
  assert.match(automationMigration, /CREATE TABLE IF NOT EXISTS "QimenShadowAutomationRun"/);
  assert.match(automationMigration, /ALTER TABLE "QimenShadowCandidate" ENABLE ROW LEVEL SECURITY/);
  assert.match(automationMigration, /ALTER TABLE "QimenShadowAutomationRun" ENABLE ROW LEVEL SECURITY/);
  assertOnlyExpectedRlsEnables(automationMigration, ["QimenShadowCandidate", "QimenShadowAutomationRun"]);
  assert.match(model, /model QimenShadowReading/);
  assert.match(readingMigration, /CREATE TABLE IF NOT EXISTS "QimenShadowReading"/);
  assert.match(readingMigration, /QimenShadowReading_studyKey_schoolId_idx/);
  assert.match(readingMigration, /ALTER TABLE "QimenShadowReading" ENABLE ROW LEVEL SECURITY/);
  assertOnlyExpectedRlsEnables(readingMigration, ["QimenShadowReading"]);
});

test("admin API authenticates, validates strictly and has no trading dependency", () => {
  const route = read("app/api/admin/qimen-shadow/route.ts");
  const capture = read("lib/research/qimen-shadow-capture-core.ts");
  const store = read("lib/research/qimen-shadow-store.ts");
  assert.ok(route.indexOf("requireAdmin()") < route.indexOf("getQimenShadowDashboard()"));
  assert.ok(route.lastIndexOf("requireAdmin()") < route.indexOf("qimenShadowAdminRequestSchema.safeParse"));
  assert.match(capture, /qimenShadowAdminRequestSchema/);
  assert.match(capture, /\.strict\(\)/);
  assert.match(store, /weeklyForecastSource\.findUnique/);
  assert.match(store, /generatedDailyForecast\.findUnique/);
  assert.match(store, /qimenShadowObservation\.create/);
  assert.match(store, /qimenShadowExperiment\.create/);
  assert.match(store, /qimenShadowCandidate\.create/);
  assert.match(store, /qimenShadowReading\.create/);
  assert.match(store, /assertQimenFormalForecastAvailableNow\(formal, serverNow\)/);
  assert.match(store, /assertQimenWriteBeforeDecision\(prepared\.decisionAt, serverNow\)/);
  assert.match(store, /createdAt: serverNow/);
  assert.match(store, /lockedAt: serverNow/);
  assert.match(store, /row\.lockedAt\.getTime\(\) > row\.decisionAt\.getTime\(\)/);
  assert.ok(store.indexOf("const existing = await db.qimenShadowObservation.findUnique") < store.indexOf("观察单必须在决策时间之前"));
  assert.match(store, /evaluatedAt\) > serverNow\.getTime\(\)/);
  assert.match(store, /contentSha256 !== sha256/);
  assert.match(route, /validation \? 422 : 500/);
  assert.doesNotMatch(store, /qimenShadow(Reading|Observation|Experiment|Candidate|AutomationRun)\.(update|delete|upsert)/);
  assert.doesNotMatch(`${route}\n${capture}\n${store}`, /lib\/bitget|lib\/trading-signals|placeOrder|submitOrder|newEntriesEnabled/);
});

test("cron automation is header-authenticated, bounded, append-only and isolated from execution", () => {
  const route = read("app/api/cron/qimen-shadow/route.ts");
  const automation = read("lib/research/qimen-shadow-automation.ts");
  const core = read("lib/research/qimen-shadow-automation-core.ts");
  const pairer = read("lib/research/qimen-shadow-reading-pairer.ts");
  const pairCore = read("lib/research/qimen-shadow-reading-pair-core.ts");
  const vercel = read("vercel.json");
  assert.match(route, /process\.env\.CRON_SECRET/);
  assert.match(route, /CRON_SECRET_NOT_CONFIGURED/);
  assert.match(route, /request\.headers\.get\("authorization"\)/);
  assert.doesNotMatch(route, /searchParams|query|process\.env\.VERCEL/);
  assert.match(automation, /const BATCH_SIZE = 4/);
  assert.match(automation, /const RUN_BUDGET_MS = 55_000/);
  assert.match(automation, /candidatePool\.filter\(\(row\) => !existingObservationIds\.has\(row\.id\)\)\.slice\(0, BATCH_SIZE\)/);
  assert.match(automation, /qimenShadowAutomationRun\.create/);
  assert.match(automation, /qimenShadowCandidate\.findMany/);
  assert.match(automation, /qimenShadowObservation\.findMany/);
  assert.match(automation, /pairFutureQimenShadowReadings\(\{/);
  assert.match(automation, /const PAIR_BUDGET_MS = 10_000/);
  assert.match(automation, /deadlineMs: Math\.min\(Date\.now\(\) \+ PAIR_BUDGET_MS, deadlineMs - 2_000\)/);
  assert.ok(automation.indexOf("for (const row of dueRows)") < automation.indexOf("pairFutureQimenShadowReadings({"));
  assert.match(pairer, /qimenShadowReading\.findMany/);
  assert.match(pairer, /const PAIR_SCAN_LIMIT = 32/);
  assert.match(pairer, /const PAIR_GROUP_LIMIT = 8/);
  assert.match(pairer, /clock\(\)\.getTime\(\) >= options\.deadlineMs/);
  assert.ok(pairer.indexOf("clock().getTime() >= options.deadlineMs") < pairer.indexOf("registerQimenShadowCandidate(plan.candidate"));
  assert.match(pairer, /registerQimenShadowCandidate\(plan\.candidate, "AUTOMATION:qimen-reading-pairer", \{ clock \}\)/);
  assert.match(pairer, /planQimenShadowReadingPair/);
  assert.match(pairer, /registerQimenShadowCandidate/);
  assert.match(pairCore, /MISMATCHED_FORECAST_OR_WINDOW/);
  assert.match(pairCore, /AMBIGUOUS_DUPLICATE_SCHOOL/);
  assert.doesNotMatch(automation, /qimenShadow(Observation|Experiment|Candidate|AutomationRun)\.(update|delete|upsert)/);
  assert.doesNotMatch(`${route}\n${automation}\n${core}\n${pairer}\n${pairCore}`, /lib\/bitget|placeOrder|submitOrder|newEntriesEnabled|liveExecution|paptrading/);
  assert.match(automation, /mayTrade: false/);
  assert.match(automation, /mayChangeForecast: false/);
  assert.match(vercel, /"path": "\/api\/cron\/qimen-shadow"/);
  assert.match(vercel, /"schedule": "\*\/5 \* \* \* \*"/);
});

test("admin page is protected and discloses research-only authority", () => {
  const page = read("app/admin/qimen-shadow/page.tsx");
  const nav = read("components/admin/AdminNav.tsx");
  assert.match(page, /requireAdminOrNotFound\(\)/);
  assert.match(page, /决策前先由服务器锁定/);
  assert.match(page, /不产生正式方向，不连接交易所，也不能恢复实盘/);
  assert.match(page, /LIVE权限/);
  assert.match(nav, /\/admin\/qimen-shadow/);
});
