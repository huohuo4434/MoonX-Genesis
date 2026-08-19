import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.env.MOOX_PROJECT_ROOT || process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

test("four sleeves are explicit and approval-gated", () => {
  const core = read("lib/trading-signals/strategy-ensemble.ts");
  const route = read("app/api/admin/strategy-ensemble/route.ts");
  assert.match(core, /"LIUYAO"/);
  assert.match(core, /"QIMEN"/);
  assert.match(core, /"TECHNICAL"/);
  assert.match(core, /"COMPOSITE"/);
  assert.match(route, /ADMIN_CONFIRMATION_REQUIRED/);
  assert.doesNotMatch(route, /placeOrder|submitOrder|setLeverage|closePosition/);
});

test("focus watch includes user-requested names without auto execution", () => {
  const core = read("lib/trading-signals/strategy-ensemble.ts");
  assert.match(core, /SPCX/);
  assert.match(core, /GOOGL/);
  assert.match(core, /MU/);
  assert.match(core, /SNDK/);
  assert.match(core, /researchOnly: true/);
});

test("custodian can run ensemble without placing orders", () => {
  const route = read("app/api/cron/live-trading-custodian/route.ts");
  assert.match(route, /buildStrategyEnsembleSnapshot/);
  assert.match(route, /persistStrategyEnsembleSnapshot/);
});
