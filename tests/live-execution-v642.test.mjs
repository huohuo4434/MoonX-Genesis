import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("V6.4.2 keeps legacy Demo header signature without leaking it into live requests", () => {
  const client = read("lib/bitget/demo-client.ts");
  assert.match(client, /paptrading:\s*"1"/);
  assert.match(client, /if \(env\.mode === "DEMO"\) headers\.paptrading = "1"/);
  assert.doesNotMatch(client, /if\s*\(env\.mode\s*===\s*"LIVE_EXPERIMENT"\)[\s\S]{0,160}paptrading/);
});
