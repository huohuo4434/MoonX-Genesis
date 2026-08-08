import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

test("GeneratedDailyForecast source has progressive compatibility projections", () => {
  const text = read("lib/verification/sync-generated-dailies.ts");
  assert.match(text, /type GeneratedQueryMode = "full" \| "core" \| "minimum"/);
  assert.match(text, /queryGeneratedDailyRows/);
  assert.match(text, /const modes: GeneratedQueryMode\[\] = \["full", "core", "minimum"\]/);
  assert.match(text, /rows\.filter\(formalGeneratedStatus\)/);
  assert.doesNotMatch(text, /status:\s*\{\s*in:/);
});

test("pipeline status preserves immutable verification counters when generated source fails", () => {
  const text = read("lib/accuracy/verification-pipeline-status.ts");
  assert.match(text, /SOURCE_DEGRADED/);
  assert.match(text, /generatedSourceHealthy/);
  assert.match(text, /verificationRecords:\s*formalRecords\.length/);
  assert.match(text, /error:\s*"generated_source_unavailable"/);
  assert.match(text, /legacy_store_unavailable/);
});

test("public pipeline UI hides internal error codes and unknown source counts", () => {
  const text = read("components/verification/VerificationPipelineStatus.tsx");
  assert.match(text, /正式验证记录正常，补充预测源同步暂时不可用/);
  assert.match(text, /补充生成预测源暂时无法读取；既有锁定记录仍是正式验证依据/);
  assert.match(text, /Math\.max\(status\.generatedLocked, status\.verificationRecords\)/);
  assert.match(text, /status\.generatedSourceHealthy \? status\.syncMissing : "—"/);
  assert.doesNotMatch(text, /状态详情.*status\.error/);
  assert.doesNotMatch(text, />\{status\.error\}</);
});

test("daily verifier still retries and finalizes stale unavailable market data", () => {
  const text = read("lib/verification/run-daily.ts");
  assert.match(text, /syncGeneratedDailyForecastsToVerificationStore/);
  assert.match(text, /AUTO_UNVERIFIABLE_AFTER_MS = 72 \* 60 \* 60 \* 1000/);
  assert.match(text, /finalizedUnverifiable/);
  assert.match(text, /verdict:\s*"UNVERIFIABLE"/);
});
