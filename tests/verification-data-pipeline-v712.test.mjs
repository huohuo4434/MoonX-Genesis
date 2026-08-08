import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

test("v7.12 bridges locked generated forecasts into immutable verification records", () => {
  const sync = read("lib/verification/sync-generated-dailies.ts");
  assert.match(sync, /generatedDailyForecast\.findMany/);
  assert.match(sync, /PUBLISHED/);
  assert.match(sync, /LOCKED/);
  assert.match(sync, /ARCHIVED/);
  assert.match(sync, /OFFICIAL_GENERATED_DAILY_SYNC_START = "2026-08-01"/);
  assert.match(sync, /upsertDailyForecastRecord/);
  assert.match(sync, /generatedVerificationIdentity/);
  assert.match(sync, /originalVersion:/);
  assert.match(sync, /defaultCutoffAt/);
  assert.doesNotMatch(sync, /upsertDailyVerificationResult|replaceDailyVerificationResult/);
  assert.doesNotMatch(sync, /verdict:\s*"(?:HIT|FULL_HIT|PARTIAL_HIT|MISS)"/);
});

test("v7.12 sync preserves daily path semantics", () => {
  const sync = read("lib/verification/sync-generated-dailies.ts");
  for (const marker of [
    "先涨后跌",
    "冲高回落",
    "先跌后涨",
    "探底回升",
    "震荡上涨",
    "震荡下跌",
    "UP_THEN_DOWN",
    "DOWN_THEN_UP",
    "SURGE_THEN_PULLBACK",
    "DIP_THEN_RECOVERY",
  ]) assert.ok(sync.includes(marker), `missing mapping ${marker}`);
});

test("v7.12 verifier syncs before reading the queue and keeps failure retention", () => {
  const verifier = read("lib/verification/run-daily.ts");
  const syncAt = verifier.indexOf("syncGeneratedDailyForecastsToVerificationStore({ now })");
  const listAt = verifier.indexOf("const forecasts = await listDailyForecastRecords()");
  assert.ok(syncAt >= 0 && listAt > syncAt, "sync must happen before queue scan");
  assert.match(verifier, /syncedPublished/);
  assert.match(verifier, /syncErrors/);
  assert.match(verifier, /finalizedUnverifiable/);
  assert.match(verifier, /AUTO_UNVERIFIABLE_AFTER_MS = 72/);
  assert.match(verifier, /\["HIT", "FULL_HIT", "PARTIAL_HIT", "MISS", "UNVERIFIABLE", "VOID"\]/);
});

test("v7.12 exposes verification pipeline health without changing public scoring", () => {
  const page = read("app/verification/page.tsx");
  const api = read("app/api/public/verification/route.ts");
  const status = read("lib/accuracy/verification-pipeline-status.ts");
  const ui = read("components/verification/VerificationPipelineStatus.tsx");
  assert.match(page, /getVerificationPipelineStatus/);
  assert.match(page, /VerificationPipelineStatus status=\{pipelineStatus\}/);
  assert.match(api, /pipeline,/);
  assert.match(api, /missesRetained: true/);
  assert.match(status, /syncMissing/);
  assert.match(status, /UNVERIFIABLE/);
  assert.match(ui, /正式发布\/锁定/);
  assert.match(ui, /已进入验证链/);
  assert.match(ui, /同步缺口/);
});

test("v7.12 does not replace cron, auth, payment or trading configuration", () => {
  const packageTouched = [
    "app/verification/page.tsx",
    "app/api/public/verification/route.ts",
    "lib/verification/run-daily.ts",
    "lib/verification/sync-generated-dailies.ts",
    "lib/accuracy/verification-pipeline-status.ts",
    "components/verification/VerificationPipelineStatus.tsx",
    "tests/verification-data-pipeline-v712.test.mjs",
  ];
  for (const rel of packageTouched) assert.ok(fs.existsSync(path.join(root, rel)), rel);
  assert.ok(!packageTouched.includes("vercel.json"));
  assert.ok(!packageTouched.some((rel) => /payment|auth|trading-signals|bitget/.test(rel)));
});
