import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

test("v7.12.6 treats VOID as terminal but never as a scored public result", () => {
  const filter = read("lib/accuracy/public-history-filter.ts");
  const pending = read("lib/accuracy/get-pending-verification.ts");
  const status = read("lib/accuracy/verification-pipeline-status.ts");
  assert.match(filter, /TERMINAL_VERIFICATION_VERDICTS/);
  assert.match(filter, /"VOID"/);
  assert.match(pending, /isTerminalVerificationVerdict/);
  assert.match(status, /excluded/);
  assert.match(status, /publicCompletedResults/);
  assert.doesNotMatch(pending, /isPublicFinalVerdict/);
});

test("v7.12.6 verification UI cannot show processed VOID rows as pending", () => {
  const ui = read("components/verification/VerificationPipelineStatus.tsx");
  assert.match(ui, /不计统计/);
  assert.match(ui, /不会再显示为“待处理”/);
  assert.match(ui, /Math\.max\(status\.generatedLocked, status\.verificationRecords\)/);
});

test("v7.12.6 generated source has additive runtime schema self-heal", () => {
  const schema = read("lib/weekly-source/generated-source-schema.ts");
  const sync = read("lib/verification/sync-generated-dailies.ts");
  const store = read("lib/weekly-source/store.ts");
  assert.match(schema, /CREATE TABLE IF NOT EXISTS "GeneratedDailyForecast"/);
  assert.match(schema, /ADD COLUMN IF NOT EXISTS/);
  assert.match(schema, /CREATE UNIQUE INDEX IF NOT EXISTS/);
  assert.doesNotMatch(schema, /DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM/i);
  assert.match(sync, /ensureGeneratedForecastSourceSchema/);
  assert.match(sync, /recovered after additive schema bootstrap/);
  assert.match(store, /ensureGeneratedForecastSourceSchema/);
});

test("v7.12.6 can re-open a legacy VOID caused by an outdated cutoff rule without changing the forecast", () => {
  const verifier = read("lib/verification/run-daily.ts");
  assert.match(verifier, /shouldReopenLegacyVoid/);
  assert.match(verifier, /isPublishedBeforeCutoff\(forecast\)/);
  assert.match(verifier, /!reopenLegacyVoid/);
  assert.match(verifier, /原预测内容与发布时间均未修改/);
  assert.match(verifier, /reopenedLegacyVoid/);
});
