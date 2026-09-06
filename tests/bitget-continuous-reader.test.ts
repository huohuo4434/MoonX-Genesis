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
    });
    if (malformed) { await assert.rejects(exports.readBitgetContinuousTransitionSnapshot(), /EXCHANGE_UNKNOWN/); assert.equal(logs.length, 1); }
    else { await exports.readBitgetContinuousTransitionSnapshot(); assert.equal(logs.length, 0); }
    assert.doesNotMatch(JSON.stringify(logs), /secret-account|privateValue/);
  }
});
