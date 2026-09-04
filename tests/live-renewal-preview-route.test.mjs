import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as core from "../lib/trading-signals/live-renewal-preview-core.ts";
const source = readFileSync("app/api/admin/live-trading/renewal-preview/route.ts", "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function harness(admin = true, failure = false, configuration = null, configurationFailure = false) {
  const exports = {}; let reads = 0, configurationReads = 0;
  vm.runInNewContext(code, { exports, require(name) {
    if (name === "next/server") return { NextResponse: { json: (data, options) => ({ data, ...options }) } };
    if (name.endsWith("unified-live-auth")) return { resolveUnifiedLiveActor: async () => ({}), isUnifiedLiveAdmin: async () => admin };
    if (name.endsWith("live-renewal-preview-core")) return core;
    if (name.endsWith("live-configuration-draft-store")) return { getLiveConfigurationDraft: async () => {
      configurationReads++;
      if (configurationFailure) throw new Error("secret configuration details");
      return configuration;
    } };
    if (name.endsWith("demo-client")) return { getBitgetDemoEnvironment: () => ({ mode: "LIVE_EXPERIMENT", liveDailyLossUsdt: 100, liveMaxDrawdownUsdt: 500 }) };
    if (name === "@/lib/prisma") return { prisma: { $queryRaw: async (sql) => {
      reads++; const query = sql.join("?");
      assert.doesNotMatch(query, /INSERT|UPDATE|DELETE|ALTER|CREATE|FOR UPDATE/);
      assert.match(query, /environment_mode = 'LIVE_EXPERIMENT'/);
      assert.match(query, /trade_date = \?::date/);
      assert.match(query, /attempt_count < max_attempts/);
      if (failure) throw new Error("secret connection details");
      return [{}];
    } } };
    throw new Error(`unexpected dependency ${name}`);
  } });
  return { exports, reads: () => reads, configurationReads: () => configurationReads };
}
test("preview is admin-only GET and performs no mutation or exchange request", async () => {
  const denied = harness(false); assert.equal((await denied.exports.GET({})).status, 404); assert.equal(denied.reads(), 0); assert.equal(denied.configurationReads(), 0);
  for (const failed of [false, true]) {
    const api = harness(true, failed); const result = await api.exports.GET({});
    assert.equal(api.reads(), 1); assert.equal(result.data.canRenew, false); assert.equal(result.data.writeAttempted, false);
    assert.equal(result.headers["Cache-Control"], "no-store");
    assert.equal(result.data.checks.find((row) => row.key === "account").state, "UNKNOWN");
    assert.doesNotMatch(JSON.stringify(result), /secret connection/);
    assert.equal(api.exports.POST, undefined);
  }
  assert.doesNotMatch(source, /syncBitget|ensureBitget|setUnifiedLiveMode|executeRaw|signedRequest|placeOrder/);
});

test("route reads the saved configuration without writes and fails unknown on a failed settings read", async () => {
  const configuration = { applied: false, revision: "saved-r1", savedAt: "2026-01-01T00:00:00Z", draft: { schemaVersion: 1, state: "PENDING", durationMode: "CONTINUOUS", durationDays: null, capitalUsdt: "2500.50", leverage: 1 } };
  const api = harness(true, false, configuration);
  const result = await api.exports.GET({});
  assert.equal(api.configurationReads(), 1);
  assert.equal(result.data.proposedConfiguration.draft.capitalUsdt, "2500.50");
  assert.equal(result.data.proposedConfiguration.draft.leverage, 1);
  assert.equal(result.data.proposedEndsAt, null);
  const failed = await harness(true, false, configuration, true).exports.GET({});
  assert.equal(failed.data.proposedConfiguration, null);
  assert.equal(failed.data.checks.find((row) => row.key === "configuration").state, "UNKNOWN");
  assert.doesNotMatch(JSON.stringify(failed), /secret configuration/);
  assert.equal(failed.data.canRenew, false);
});
