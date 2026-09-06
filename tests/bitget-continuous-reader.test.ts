import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { assertEmptyExchangePayloads, continuousPayloadShape } from "../lib/bitget/live-continuous-transition-core";
const file = ts.createSourceFile("client.ts", readFileSync("lib/bitget/demo-client.ts", "utf8"), ts.ScriptTarget.Latest, true);
const fn = file.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === "readBitgetContinuousTransitionSnapshot")!;
const code = ts.transpileModule(fn.getText(file), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
test("real snapshot only reads and logs sanitized shapes on unknown exchange data", async () => {
  for (const malformed of [false, true]) {
    const exports: Record<string, () => Promise<unknown>> = {}; const logs: unknown[] = [];
    vm.runInNewContext(code, { exports, Date, assertEmptyExchangePayloads, continuousPayloadShape, PRODUCT_TYPE: "USDT-FUTURES",
      console: { warn: (...args: unknown[]) => logs.push(args) },
      getBitgetDemoEnvironment: () => ({ mode: "LIVE_EXPERIMENT", configured: true, liveConfirmationAccepted: true, liveDailyLossUsdt: 10, liveMaxDrawdownUsdt: 50 }),
      signedRequest: async (input: { method: string; path: string }) => {
        assert.equal(input.method, "GET");
        if (input.path.includes("strategy")) return [];
        return malformed ? { list: null, privateValue: "secret-account" } : { list: [] };
      },
      getBitgetRuntimeAccountBalance: async () => ({ equityUsdt: 1000 }),
      getBitgetApiSecurity: async () => ({ failClosedReady: true }),
      getBitgetUtaSettingsSnapshot: async () => ({ accountMode: "unified" }),
      credentials: () => ({ apiKey: "test", secretKey: "test", passphrase: "test" }), serverClockOffsetMs: 0,
      assertBitgetClockSafe: async () => ({ safe: true, syncedAt: new Date().toISOString(), offsetMs: 0 }),
      confirmEmptyUtaPositionSnapshot: async () => { throw new Error("EXCHANGE_UNKNOWN"); },
    });
    if (malformed) { await assert.rejects(exports.readBitgetContinuousTransitionSnapshot(), /EXCHANGE_UNKNOWN/); }
    else { await exports.readBitgetContinuousTransitionSnapshot(); assert.equal(logs.length, 0); }
    assert.doesNotMatch(JSON.stringify(logs), /secret-account|privateValue/);
  }
});

test("explicit REST null-list requires independent proof; missing list never uses fallback", async () => {
  for (const state of ["valid", "missing", "stale", "unsafe", "failed"]) {
    const positions = state === "missing" ? {} : { list: null };
    let proofs = 0;
    const exports: Record<string, () => Promise<unknown>> = {};
    vm.runInNewContext(code, { exports, Date, assertEmptyExchangePayloads, continuousPayloadShape, PRODUCT_TYPE: "USDT-FUTURES",
      console: { warn() {}, info() {} },
      getBitgetDemoEnvironment: () => ({ mode: "LIVE_EXPERIMENT", configured: true, liveConfirmationAccepted: true, liveDailyLossUsdt: 10, liveMaxDrawdownUsdt: 50 }),
      signedRequest: async (input: {method: string; path: string}) => {
        assert.equal(input.method, "GET");
        return input.path.includes("current-position") ? positions : input.path.includes("strategy") ? [] : { list: [] };
      },
      getBitgetRuntimeAccountBalance: async () => ({ equityUsdt: 1000 }),
      getBitgetApiSecurity: async () => ({ failClosedReady: true }),
      getBitgetUtaSettingsSnapshot: async () => ({ accountMode: "unified" }),
      credentials: () => ({ apiKey: "test", secretKey: "test", passphrase: "test" }), serverClockOffsetMs: 0,
      assertBitgetClockSafe: async () => {
        if (state === "failed") throw new Error("clock offline");
        return { safe: state !== "unsafe", syncedAt: new Date(Date.now() - (state === "stale" ? 60000 : 0)).toISOString(), offsetMs: 0 };
      },
      confirmEmptyUtaPositionSnapshot: async () => { proofs++; },
    });
    if (state === "valid") { await exports.readBitgetContinuousTransitionSnapshot(); assert.equal(proofs, 1); }
    else { await assert.rejects(exports.readBitgetContinuousTransitionSnapshot(), /EXCHANGE_UNKNOWN/); assert.equal(proofs, 0); }
  }
});
