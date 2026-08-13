import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("collector ingest route is secret protected and size limited", () => {
  const route = read("app/api/internal/x-intelligence/ingest/route.ts");
  assert.match(route, /MOOX_X_COLLECTOR_SECRET/);
  assert.match(route, /timingSafeEqual/);
  assert.match(route, /MAX_BODY_BYTES/);
  assert.match(route, /UNAUTHORIZED/);
});

test("collector ingestion is observation only for custom accounts", () => {
  const source = read("lib/trading-signals/external-analyst-signals.ts");
  const aggregation = read("lib/trading-signals/external-analyst-aggregation-core.ts");
  assert.match(source, /MOOX_X_WATCH_ACCOUNTS/);
  assert.match(source, /prepareExternalAnalystCollectorPosts/);
  assert.doesNotMatch(source, /forcedSource: ExternalAnalystSource = "BTCKIK"/);
  assert.match(aggregation, /if \(source === "BTCKIK"\) return false/);
});

test("collector is read only and never calls twitter write commands", () => {
  const collector = read("tools/x-collector/collector.py");
  assert.match(collector, /"user-posts"/);
  for (const forbidden of ["twitter post", "twitter reply", "twitter quote", "twitter like", "twitter retweet", "twitter follow"]) {
    assert.ok(!collector.toLowerCase().includes(forbidden), `forbidden write command found: ${forbidden}`);
  }
});

test("credentials are locally encrypted with Windows DPAPI", () => {
  const configure = read("tools/x-collector/configure.ps1");
  assert.match(configure, /ProtectedData\]::Protect/);
  assert.match(configure, /DataProtectionScope\]::CurrentUser/);
  assert.match(configure, /auth_token/);
  assert.match(configure, /ct0/);
});

test("scheduled collection runs at a conservative interval", () => {
  const task = read("tools/x-collector/install-task.ps1");
  assert.match(task, /\/SC MINUTE \/MO 15/);
});
