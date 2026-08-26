import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("content freshness has its own 15-minute production schedule", () => {
  const config = JSON.parse(read("vercel.json")) as {
    crons?: Array<{ path?: string; schedule?: string }>;
  };
  const matches = (config.crons ?? []).filter((cron) => cron.path === "/api/cron/content-freshness");
  assert.deepEqual(matches, [{ path: "/api/cron/content-freshness", schedule: "*/15 * * * *" }]);
  assert.equal((config.crons ?? []).some((cron) => cron.path === "/api/cron/x-intelligence-report"), false);
  assert.equal((config.crons ?? []).some((cron) => cron.path === "/api/cron/external-analysts"), false);
});

test("dedicated freshness cron stays authorized and runs the direct self-check", () => {
  const route = read("app/api/cron/content-freshness/route.ts");
  assert.match(route, /process\.env\.CRON_SECRET/);
  assert.match(route, /authorization/);
  assert.match(route, /runContentFreshnessSelfCheck\(\{ repair: true \}\)/);
  assert.doesNotMatch(route, /generateAndStoreXScanReport|generateAndStoreEarlyAltcoinRadar/);
});

test("repair self-check has exactly one production cron owner", () => {
  const owners = [
    "app/api/cron/content-freshness/route.ts",
    "app/api/cron/x-intelligence-report/route.ts",
    "app/api/cron/generate-daily-forecasts/route.ts",
  ].filter((file) => /runContentFreshnessSelfCheck\(\{ repair: true/.test(read(file)));
  assert.deepEqual(owners, ["app/api/cron/content-freshness/route.ts"]);
});

test("the single freshness owner refreshes posts before building both X reports", () => {
  const source = read("lib/automation/content-freshness.ts");
  const refreshAt = source.indexOf("await refreshExternalAnalystSignals(now, { force: true })");
  const scanAt = source.indexOf("generateAndStoreXScanReport(now)", refreshAt);
  const altcoinAt = source.indexOf("generateAndStoreEarlyAltcoinRadar(now)", refreshAt);
  assert.ok(refreshAt >= 0);
  assert.ok(scanAt > refreshAt);
  assert.ok(altcoinAt > refreshAt);
  assert.match(source, /sole production scheduler/);
});

test("failed repairs downgrade the report and both repair routes return non-200", () => {
  const source = read("lib/automation/content-freshness.ts");
  const cronRoute = read("app/api/cron/content-freshness/route.ts");
  const adminRoute = read("app/api/admin/content-freshness/route.ts");
  assert.match(source, /repairs\.some\(\(item\) => !item\.ok\)\) after\.status = "ATTENTION"/);
  for (const route of [cronRoute, adminRoute]) {
    assert.match(route, /ok: report\.status === "OK"/);
    assert.match(route, /status: report\.status === "OK" \? 200 : 207/);
  }
});
