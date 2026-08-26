import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");

test("blocked live entry runs a bounded shadow scan instead of stopping research", () => {
  const runtime = read("lib/bitget/demo-runtime.ts");
  assert.match(runtime, /const scanOnly = forcedManageOnly && marketOk && account\.connected/);
  assert.match(runtime, /action: scanOnly \? "THREE_HORIZON_SHADOW_SCAN"/);
  assert.match(runtime, /eligibleSymbols: scanOnly \? freshSymbols : undefined/);
  assert.match(runtime, /maxNewSymbols: scanOnly && environment\.mode === "LIVE_EXPERIMENT"/);
});

test("shadow scan refreshes candidates but every new-exposure path remains fenced", () => {
  const strategy = read("lib/trading-signals/three-horizon-strategy.ts");
  assert.match(strategy, /scanOnly\?: boolean/);
  assert.match(strategy, /options\.scanOnly[\s\S]*?"SHADOW_READY"/);
  assert.match(strategy, /rejectionCode = "NEW_ENTRIES_DISABLED"/);
  assert.match(strategy, /LIVE_COMMISSIONING_ENABLED && !options\.scanOnly/);
  assert.match(strategy, /liveExperimentMode &&\s*!options\.scanOnly &&\s*LIVE_ACTIVITY_ENABLED/);
  assert.match(strategy, /environment\.mode === "DEMO" &&\s*!options\.scanOnly &&\s*DEMO_ACTIVE_EXECUTION_ENABLED/);
  assert.match(strategy, /if \(evaluation\.ready && status === "READY"\)/);
});

test("custody and research collection have independent authenticated schedules", () => {
  const custody = read("app/api/cron/live-trading-custodian/route.ts");
  const ensemble = read("app/api/cron/strategy-ensemble/route.ts");
  const vercel = JSON.parse(read("vercel.json"));
  assert.doesNotMatch(custody, /buildStrategyEnsembleSnapshot|persistStrategyEnsembleSnapshot/);
  assert.match(ensemble, /CRON_SECRET/);
  assert.match(ensemble, /execution: "RESEARCH_ONLY"/);
  assert.equal(vercel.crons.find((item) => item.path === "/api/cron/strategy-ensemble")?.schedule, "*/15 * * * *");
});

test("ensemble market reads are bounded-concurrent instead of serial", () => {
  const ensemble = read("lib/trading-signals/strategy-ensemble.ts");
  assert.match(ensemble, /mapWithConcurrency/);
  assert.match(ensemble, /mapWithConcurrency\(rows, 4/);
  assert.match(ensemble, /mapWithConcurrency\(FOCUS_WATCH, 4/);
});
