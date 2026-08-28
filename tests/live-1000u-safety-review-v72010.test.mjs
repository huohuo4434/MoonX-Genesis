import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");
const changed = [
  "app/api/cron/prediction-auto-trader/route.ts",
  "app/api/admin/bitget-demo/runtime/route.ts",
  "app/api/admin/live-trading/route.ts",
  "app/api/member/live-trading/route.ts",
  "app/api/member/live-trading/settings/route.ts",
  "components/live-trading/MemberLiveTradingClient.tsx",
  "lib/bitget/demo-runtime.ts",
  "lib/bitget/demo-client.ts",
  "lib/trading-signals/three-horizon-strategy.ts",
  "lib/trading-signals/unified-live-exchange-adapter.ts",
  "lib/trading-signals/unified-live-store.ts",
  "lib/trading-signals/unified-live-custody-core.ts",
  "types/three-horizon-strategy.ts",
];

test("changed source contains no credential literals or secret payloads", () => {
  const source = changed.map(read).join("\n");
  assert.doesNotMatch(source, /BITGET_LIVE_API_KEY\s*=\s*["'][^"']+/);
  assert.doesNotMatch(source, /BITGET_LIVE_SECRET_KEY\s*=\s*["'][^"']+/);
  assert.doesNotMatch(source, /BITGET_LIVE_PASSPHRASE\s*=\s*["'][^"']+/);
  assert.doesNotMatch(source, /Authorization:\s*Bearer\s+[A-Za-z0-9._-]{10,}/i);
});

test("cron does not bypass the existing idempotent execution outbox", () => {
  const cron = read("app/api/cron/prediction-auto-trader/route.ts");
  const client = read("lib/bitget/demo-client.ts");
  assert.doesNotMatch(cron, /\/api\/v3\/trade\/place-order/);
  assert.match(client, /clientOid\(paperOrderId/);
  assert.match(client, /createOutboxIntent/);
  assert.match(client, /runIdempotentOrderDispatch/);
  assert.match(client, /getBitgetDemoOrderByClientOid/);
  assert.match(client, /readUnifiedLiveRuntimeConfig\(\)\.allowNewEntriesByEnv/);
  assert.match(client, /officialAccount\?\.mode !== "LIVE"/);
  assert.match(client, /!officialAccount\.newEntriesEnabled/);
  assert.match(client, /!officialAccount\.positionManagementEnabled/);
});

test("no code default silently flips unified runtime to LIVE", () => {
  const config = read("lib/trading-signals/unified-live-config.ts");
  assert.match(config, /String\(value \?\? "MANAGE_ONLY"\)/);
  assert.match(config, /return \{ configured: true, mode: "PAUSED" \}/);
  assert.match(config, /MOOX_UNIFIED_LIVE_NEW_ENTRIES, false/);
  assert.match(config, /MOOX_UNIFIED_LIVE_ALLOW_LIVE_SWITCH, false/);
});

test("official live switch always preserves position management and MANAGE_ONLY is risk-reducing", () => {
  const route = read("app/api/admin/live-trading/route.ts");
  const reliability = read("lib/trading-signals/trading-reliability.ts");
  assert.match(route, /newEntriesEnabled: nextMode === "LIVE"/);
  assert.match(route, /positionManagementEnabled: nextMode !== "PAUSED"/);
  assert.match(route, /isUnifiedLiveActiveExecutionEnabled/);
  assert.match(reliability, /readUnifiedLiveRuntimeConfig\(\)\.positionManagementEnabled/);
});

test("live daily target cannot bypass explicit activation, custody or execution safety", () => {
  const strategy = read("lib/trading-signals/three-horizon-strategy.ts");
  assert.match(strategy, /BITGET_LIVE_COMMISSIONING_ENABLED\?\.toLowerCase\(\) === "true"/);
  assert.match(strategy, /"MOOX_LIVE_ACTIVITY_TARGET_V641", 1, 1, 5/);
  assert.match(strategy, /LIVE_ACTIVITY_CONTROL\.configured && LIVE_ACTIVITY_CONTROL\.mode === "LIVE"/);
  assert.match(strategy, /isActivityPromotionEligible\(decision\)/);
  assert.match(strategy, /!entrySafetyStop/);
  assert.match(strategy, /custodyRegistrationFailed/);
  assert.match(strategy, /本轮立即停止继续新开仓/);
});
