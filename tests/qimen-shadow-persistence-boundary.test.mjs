import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

test("ledger schema is append-only and isolated from trading tables", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/20260830180000_qimen_shadow_research/migration.sql");
  const model = schema.slice(schema.indexOf("model QimenShadowObservation"), schema.indexOf("model MasterRule"));
  assert.match(model, /model QimenShadowObservation/);
  assert.match(model, /evaluationDueAt\s+DateTime/);
  assert.match(model, /observationId\s+String\s+@unique/);
  assert.match(model, /contentSha256\s+String\s+@unique/);
  assert.doesNotMatch(model, /updatedAt|MooxUnifiedLive|Bitget|Trade/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "QimenShadowObservation"/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "QimenShadowExperiment"/);
  assert.doesNotMatch(migration, /ALTER TABLE|DROP TABLE|DELETE FROM|trade_|Bitget|MooxUnifiedLive/);
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
  assert.match(store, /lockedAt: serverNow/);
  assert.match(store, /row\.lockedAt\.getTime\(\) > row\.decisionAt\.getTime\(\)/);
  assert.ok(store.indexOf("const existing = await db.qimenShadowObservation.findUnique") < store.indexOf("观察单必须在决策时间之前"));
  assert.match(store, /evaluatedAt\) > serverNow\.getTime\(\)/);
  assert.match(store, /contentSha256 !== sha256/);
  assert.match(route, /validation \? 422 : 500/);
  assert.doesNotMatch(store, /qimenShadow(Observation|Experiment)\.(update|delete|upsert)/);
  assert.doesNotMatch(`${route}\n${capture}\n${store}`, /lib\/bitget|lib\/trading-signals|placeOrder|submitOrder|newEntriesEnabled/);
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
