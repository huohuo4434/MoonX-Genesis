import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("app/api/admin/bitget-demo/runtime/route.ts", "utf8");

test("runtime admin POST routes every action through guardRuntimeAdminAction before runtime execution", () => {
  assert.match(source, /const gate = await guardRuntimeAdminAction\(/);
  assert.match(source, /if \(gate\.handled\)/);
  const gateAt = source.indexOf("const gate = await guardRuntimeAdminAction(");
  const runAt = source.indexOf("const report = await runBitgetDemoServerRuntime(now, \"ADMIN\")");
  assert.ok(gateAt >= 0 && runAt > gateAt, "server gate must execute before RUN_NOW runtime execution");
});
