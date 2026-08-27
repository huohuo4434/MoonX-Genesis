import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const runtime = fs.readFileSync("lib/bitget/demo-runtime.ts", "utf8");
const route = fs.readFileSync("app/api/admin/bitget-demo/runtime/route.ts", "utf8");
const client = fs.readFileSync("components/admin/BitgetDemoClient.tsx", "utf8");
const cron = fs.readFileSync("app/api/cron/bitget-runtime-health/route.ts", "utf8");
const vercel = JSON.parse(fs.readFileSync("vercel.json", "utf8").replace(/^\uFEFF/, ""));

function section(source, from, to) {
  const a = source.indexOf(from);
  const b = source.indexOf(to, a + from.length);
  assert.ok(a >= 0, `missing start marker: ${from}`);
  assert.ok(b > a, `missing end marker: ${to}`);
  return source.slice(a, b);
}

test("read-only health refresher is present and cannot execute strategy/orders", () => {
  const body = section(runtime, "export async function refreshBitgetRuntimeHealthOnly(", "export async function runBitgetDemoServerRuntime(");
  assert.match(body, /getBitgetDemoMarketQuotes\(runtimeSymbols\)/);
  assert.match(body, /reconcileAccount\(now\)/);
  assert.match(body, /READ_ONLY_HEALTH_REFRESH/);
  assert.match(body, /pausedStateUnchanged: true/);
  for (const forbidden of [
    "runPredictionAutoTrader(",
    "runThreeHorizonStrategyEngine(",
    "placeBitgetDemoMarketOrder(",
    "placeBitgetDemoProtectionOrder(",
    "cancelBitgetDemoStrategyOrder(",
    "setBitgetRuntimePaused(",
    "acquireRuntimeLock(",
  ]) assert.equal(body.includes(forbidden), false, `read-only health body must not contain ${forbidden}`);
});

test("180 second fail-closed health thresholds remain unchanged", () => {
  assert.match(runtime, /const HEARTBEAT_HEALTH_SECONDS = 180;/);
  assert.match(runtime, /const QUOTE_HEALTH_SECONDS = 180;/);
  assert.match(runtime, /const LOCK_SECONDS = 330;/);
});

test("paused admin can request health refresh without calling RUN_NOW or RESUME", () => {
  assert.match(route, /z\.literal\("REFRESH_HEALTH"\)/);
  assert.match(route, /input\.action === "REFRESH_HEALTH"/);
  const branch = section(route, 'if (input.action === "REFRESH_HEALTH")', "const live = getBitgetDemoEnvironment()");
  assert.match(branch, /refreshBitgetRuntimeHealthOnly/);
  assert.equal(branch.includes("runBitgetDemoServerRuntime"), false);
  assert.equal(branch.includes("setBitgetRuntimePaused"), false);
  assert.match(client, /刷新健康快照（只读、不下单）/);
});

test("health endpoint remains authenticated but the minute runtime is the single scheduled heartbeat owner", () => {
  assert.match(cron, /authorization/);
  assert.match(cron, /Bearer \$\{secret\}/);
  assert.match(cron, /refreshBitgetRuntimeHealthOnly/);
  const crons = Array.isArray(vercel.crons) ? vercel.crons : [];
  const health = crons.filter((x) => x?.path === "/api/cron/bitget-runtime-health");
  const main = crons.filter((x) => x?.path === "/api/cron/prediction-auto-trader");
  assert.equal(health.length, 0);
  assert.equal(main.length, 1);
  assert.equal(main[0].schedule, "* * * * *");
  assert.match(runtime, /persistRuntimeHealthSnapshot/);
});
