import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

test("public verification snapshot is fresh and not wrapped in unstable_cache", () => {
  const text = read("lib/accuracy/public-verification-snapshot.ts");
  assert.match(text, /unstable_noStore/);
  assert.doesNotMatch(text, /import\s*\{[^}]*unstable_cache/);
  assert.match(text, /getPublicVerificationSnapshot/);
});

test("verification page disables route revalidation cache", () => {
  const text = read("app/verification/page.tsx");
  assert.match(text, /dynamic\s*=\s*["']force-dynamic["']/);
  assert.match(text, /revalidate\s*=\s*0/);
});

test("lock phase immediately bridges generated forecasts into verification", () => {
  const text = read("lib/forecasts/daily-pipeline.ts");
  assert.match(text, /syncGeneratedDailyForecastsToVerificationStore/);
  assert.match(text, /phase\s*===\s*["']lock["']/);
  assert.match(text, /verification-sync/);
});

test("fresh sync gap is presented as syncing before becoming an alert", () => {
  const status = read("lib/accuracy/verification-pipeline-status.ts");
  const view = read("components/verification/VerificationPipelineStatus.tsx");
  assert.match(status, /"SYNCING"/);
  assert.match(status, /10 \* 60 \* 1000/);
  assert.match(view, /新锁定预测正在自动入链/);
  assert.match(view, /5 分钟内完成/);
});

test("verification sync retry cron is additive and limited to publication hour", () => {
  const route = read("app/api/cron/sync-verification/route.ts");
  const vercel = JSON.parse(read("vercel.json"));
  assert.match(route, /CRON_SECRET/);
  assert.match(route, /syncGeneratedDailyForecastsToVerificationStore/);
  const job = vercel.crons.find((item) => item.path === "/api/cron/sync-verification");
  assert.ok(job);
  assert.equal(job.schedule, "*/5 12 * * *");
  assert.ok(vercel.crons.some((item) => item.path === "/api/cron/prediction-auto-trader"));
  assert.ok(vercel.crons.some((item) => item.path === "/api/cron/reconcile-payments"));
});
