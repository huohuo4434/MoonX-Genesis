import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const source = readFileSync("app/api/admin/live-trading/configuration-draft/route.ts", "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function harness(admin = true, failure = "") {
  let reads = 0, writes = 0;
  const exports = {};
  vm.runInNewContext(code, { exports, URL, SyntaxError, Error, require(name) {
    if (name === "next/server") return { NextResponse: { json: (data, options) => ({ data, ...options }) } };
    if (name.endsWith("unified-live-auth")) return { resolveUnifiedLiveActor: async () => ({ id: "admin" }), isUnifiedLiveAdmin: async () => admin };
    if (name.endsWith("live-configuration-draft-store")) return {
      getLiveConfigurationDraft: async () => { reads++; if (failure) throw new Error(failure); return { applied: false }; },
      saveLiveConfigurationDraft: async (input) => { writes++; assert.equal(input.actorId, "admin"); if (failure) throw new Error(failure); return { applied: false }; },
    };
    throw new Error(`unexpected dependency ${name}`);
  } });
  return { api: exports, reads: () => reads, writes: () => writes };
}
const request = (origin = "https://mooxintel.com", body = "{}") => ({ url: "https://mooxintel.com/api/admin/live-trading/configuration-draft", headers: new Headers({ origin, "content-type": "application/json" }), text: async () => body });
const validBody = JSON.stringify({ draft: { durationMode: "CONTINUOUS", durationDays: null, capitalUsdt: "1000.00", leverage: 2 }, expectedRevision: null, requestId: "00000000-0000-4000-8000-000000000001" });
test("authorization and same-origin JSON required before draft persistence", async () => {
  const denied = harness(false);
  assert.equal((await denied.api.GET(request())).status, 404);
  assert.equal((await denied.api.POST(request())).status, 404);
  assert.equal(denied.writes(), 0); assert.equal(denied.reads(), 0);
  const h = harness();
  assert.equal((await h.api.POST(request("https://other.test"))).status, 403);
  assert.equal((await h.api.POST(request("null"))).status, 403);
  assert.equal((await h.api.POST(request("https://mooxintel.com", "x".repeat(4097)))).status, 400);
  assert.equal((await h.api.POST(request("https://mooxintel.com", '{"mode":"LIVE"}'))).status, 400);
  assert.equal(h.writes(), 0);
  assert.equal((await h.api.POST(request("https://mooxintel.com", validBody))).data.applied, false);
  assert.equal(h.writes(), 1);
  assert.equal((await h.api.POST(request("https://mooxintel.com", JSON.stringify({ draft: { durationMode: "CONTINUOUS", capitalUsdt: "1000.00" }, expectedRevision: null, requestId: "00000000-0000-4000-8000-000000000001" })))).status, 400);
  assert.equal(h.writes(), 1);
});
test("failures are safe, no raw DB details, reads cannot save or start", async () => {
  const h = harness(); const read = await h.api.GET(request());
  assert.equal(h.writes(), 0); assert.equal(read.headers["Cache-Control"], "no-store");
  for (const [error, status] of [["CONFIGURATION_CONFLICT", 409], ["INVALID_BUDGET", 400], ["secret database connection", 503]]) {
    const result = await harness(true, error).api.POST(request("https://mooxintel.com", validBody));
    assert.equal(result.status, status); assert.doesNotMatch(JSON.stringify(result), /secret database/);
  }
  assert.doesNotMatch(source, /demo-client|unified-live-store|syncBitget|setUnifiedLiveMode|processBitget/);
});
