import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const projectRoot = process.cwd();
const tsPath = path.join(projectRoot, "node_modules", "typescript", "lib", "typescript.js");
const ts = fs.existsSync(tsPath)
  ? require(tsPath)
  : require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js");
const sourcePath = path.join(projectRoot, "lib", "research", "october-2026-flash-crash-risk.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: sourcePath,
}).outputText;
const module = { exports: {} };
new Function("exports", "module", "require", compiled)(module.exports, module, require);
const risk = module.exports;

function bj(value) { return new Date(`${value}T12:00:00+08:00`); }

assert.equal(risk.getOctober2026FlashCrashRisk(bj("2026-08-20")).state, "PREWATCH");
assert.equal(risk.getOctober2026FlashCrashRisk(bj("2026-09-15")).state, "WATCH");
assert.equal(risk.getOctober2026FlashCrashRisk(bj("2026-10-03")).state, "ELEVATED");
assert.equal(risk.getOctober2026FlashCrashRisk(bj("2026-10-12")).state, "HIGH_ALERT");
assert.equal(risk.getOctober2026FlashCrashRisk(bj("2026-10-12"), {
  qimenBearish: true,
  liuyaoRiskStrong: true,
  h4Bearish: true,
  m30Bearish: true,
}).state, "REALIZING");
assert.equal(risk.getOctober2026FlashCrashRisk(bj("2026-11-03")).state, "POST_WINDOW");

const spy = risk.getOctober2026AssetRisk("SPYUSDT", bj("2026-10-12"));
const btc = risk.getOctober2026AssetRisk("BTCUSDT", bj("2026-10-12"));
const gold = risk.getOctober2026AssetRisk("XAUTUSDT", bj("2026-10-12"));
assert.equal(spy.sensitivity, "DIRECT_US_RISK");
assert.equal(spy.longRiskScale, 0.55);
assert.equal(btc.sensitivity, "HIGH_BETA_TRANSMISSION");
assert.equal(btc.longRiskScale, 0.65);
assert.equal(gold.sensitivity, "MACRO_TRANSMISSION");
assert.equal(gold.longRiskScale, 0.8);

assert.equal(risk.applyOctober2026LongRiskScale(1, "LONG", spy), 0.55);
assert.equal(risk.applyOctober2026LongRiskScale(0.45, "LONG", spy), 0.45);
assert.equal(risk.applyOctober2026LongRiskScale(0.45, "SHORT", spy), 0.45);
assert.equal(risk.applyOctober2026LongRiskScale(1, "NEUTRAL", spy), 1);

console.log("V7.20.10.2 October flash-crash risk tests passed");
