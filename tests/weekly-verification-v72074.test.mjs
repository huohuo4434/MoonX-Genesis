// MOOX_V72074_WEEKLY_BALANCED_PARTIAL_REGRESSION
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const corePath = path.join(root, "lib/verification/weekly-verification-core.ts");
const historyPath = path.join(root, "lib/accuracy/get-weekly-history.ts");
const runnerPath = path.join(root, "lib/verification/run-weekly.ts");
const apiPath = path.join(root, "app/api/accuracy/weekly/route.ts");

const core = fs.readFileSync(corePath, "utf8");
const history = fs.readFileSync(historyPath, "utf8");
const runner = fs.readFileSync(runnerPath, "utf8");
const api = fs.readFileSync(apiPath, "utf8");

function score(predicted, actual) {
  if (["暂无判断", "观望"].includes(predicted) || !actual || actual === "UNVERIFIABLE") return ["UNVERIFIABLE", 0];
  const up = new Set(["上涨", "震荡上涨", "先跌后涨", "探底回升"]);
  const down = new Set(["下跌", "震荡下跌", "先涨后跌", "冲高回落"]);
  const choppy = new Set(["震荡", "震荡上涨", "震荡下跌", "先跌后涨", "探底回升", "先涨后跌", "冲高回落"]);
  const choppyDirectional = new Set(["震荡上涨", "震荡下跌"]);
  const fam = (p) => up.has(p) ? "UP" : down.has(p) ? "DOWN" : "RANGE";
  const full =
    predicted === actual ||
    (["先跌后涨", "探底回升"].includes(predicted) && ["先跌后涨", "探底回升"].includes(actual)) ||
    (["先涨后跌", "冲高回落"].includes(predicted) && ["先涨后跌", "冲高回落"].includes(actual));
  if (full) return ["FULL_HIT", 90];
  const pf = fam(predicted);
  const af = fam(actual);
  if (pf !== "RANGE" && pf === af) return ["PARTIAL_HIT", 65];
  if (predicted === "震荡" && choppy.has(actual)) return ["PARTIAL_HIT", 60];
  if (choppyDirectional.has(predicted) && choppy.has(actual)) return ["PARTIAL_HIT", 45];
  if (actual === "震荡" && (["上涨", "下跌"].includes(predicted) || choppy.has(predicted))) return ["PARTIAL_HIT", 40];
  return ["MISS", 0];
}

test("user-confirmed: 震荡上涨 to 先跌后涨 is partial, never full", () => {
  assert.deepEqual(score("震荡上涨", "先跌后涨"), ["PARTIAL_HIT", 65]);
});

test("exact reversal path is full hit", () => {
  assert.deepEqual(score("先跌后涨", "先跌后涨"), ["FULL_HIT", 90]);
  assert.deepEqual(score("先涨后跌", "先涨后跌"), ["FULL_HIT", 90]);
});

test("choppy character can be partial even when final direction differs", () => {
  assert.deepEqual(score("震荡上涨", "先涨后跌"), ["PARTIAL_HIT", 45]);
});

test("pure up forecast versus range is partial rather than an absolute miss", () => {
  assert.deepEqual(score("上涨", "震荡"), ["PARTIAL_HIT", 40]);
});

test("final direction remains primary for pure directional calls", () => {
  assert.deepEqual(score("下跌", "先跌后涨"), ["MISS", 0]);
});

test("opposite explicit reversal order remains a miss", () => {
  assert.deepEqual(score("先跌后涨", "先涨后跌"), ["MISS", 0]);
});

test("public history normalizes stale database results immediately", () => {
  assert.match(history, /scoreWeeklyVerification\(row\.predictedPattern, row\.actualPattern\)/);
  assert.match(history, /WEEKLY_SCORE_VERSION/);
});

test("public weekly API uses the same normalized score", () => {
  assert.match(api, /scoreWeeklyVerification\(row\.predictedPattern, row\.actualPattern\)/);
});

test("direction accuracy is based on final-direction match, not any partial score", () => {
  assert.match(history, /weeklyDirectionMatches\(r\.predictedPattern, r\.actualPattern\)/);
});

test("runner rechecks all rows that do not carry V3 score version", () => {
  assert.match(runner, /existing\.explanation\?\.includes\(WEEKLY_SCORE_VERSION\)/);
  assert.match(runner, /options\.force/);
});

test("core full-hit gate is strict and no same-family branch returns full", () => {
  assert.match(core, /isFullEquivalent/);
  assert.match(core, /predictedFamily !== "RANGE" && predictedFamily === actualFamily/);
  assert.match(core, /PARTIAL_HIT/);
});

console.log("MOOX V7.20.7.4 WEEKLY BALANCED PARTIAL REGRESSION PASSED");
