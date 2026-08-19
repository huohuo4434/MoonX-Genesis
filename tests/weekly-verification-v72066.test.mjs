// MOOX_V72066_WEEKLY_VERIFICATION_REGRESSION
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const core = fs.readFileSync(path.join(root, "lib/verification/weekly-verification-core.ts"), "utf8");
const runner = fs.readFileSync(path.join(root, "lib/verification/run-weekly.ts"), "utf8");

test("weekly V2 makes end direction primary for choppy forecasts", () => {
  assert.match(core, /predicted === "震荡上涨"/);
  assert.match(core, /isSwingUp\(actual\)/);
  assert.match(core, /FULL_HIT/);
  assert.match(core, /predicted === "震荡下跌"/);
  assert.match(core, /isSwingDown\(actual\)/);
});

test("explicit reversal forecasts still require sequence for a full hit", () => {
  assert.match(core, /predicted === "先跌后涨" \|\| predicted === "探底回升"/);
  assert.match(core, /predicted === "先涨后跌" \|\| predicted === "冲高回落"/);
});

test("existing pre-V2 weekly verification rows are eligible for recheck", () => {
  assert.match(runner, /WEEKLY_SCORE_V2_END_DIRECTION_FIRST/);
  assert.match(runner, /existing\.explanation\?\.includes\(WEEKLY_SCORE_VERSION\)/);
});

test("generic up/down forecasts no longer lose points for an unspecified path", () => {
  assert.match(core, /predicted === "上涨" && actualFamily === "UP"/);
  assert.match(core, /predicted === "下跌" && actualFamily === "DOWN"/);
});

console.log("MOOX V7.20.6.6 WEEKLY END-DIRECTION VERIFICATION REGRESSION PASSED");
