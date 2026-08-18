import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");
const types = read("types/unified-live-trading.ts");
const sizing = read("lib/trading-signals/unified-live-position-sizing.ts");
const doctrine = read("lib/trading-signals/unified-live-doctrine.ts");
const custody = read("lib/trading-signals/unified-live-custody-core.ts");
const gate = read("lib/trading-signals/unified-live-entry-gate.ts");
const store = read("lib/trading-signals/unified-live-store.ts");
const runtime = read("lib/trading-signals/unified-live-runtime.ts");
const adminClient = read("components/live-trading/AdminLiveTradingClient.tsx");
const memberClient = read("components/live-trading/MemberLiveTradingClient.tsx");
const exchangeAdapter = read("lib/trading-signals/unified-live-exchange-adapter.ts");
const strategiesRoute = read("app/api/admin/bitget-demo/strategies/route.ts");
const schema = read("prisma/schema.prisma");
const legacy = read("app/api/admin/prediction-auto-trader/run/route.ts");

assert.match(types, /SHORT.*MEDIUM.*LONG/s);
assert.match(types, /FIXED_MARGIN.*EQUITY_PERCENT.*FIXED_NOTIONAL.*RISK_PERCENT/s);
assert.match(sizing, /Math\.min\(10, Math\.max\(1/);
assert.match(sizing, /projectedLoss/);
assert.match(doctrine, /technicalCanOverrideDirection:\s*false/);
assert.match(doctrine, /FOCUS_ASSET_REQUIRES_QIMEN_LIUYAO_RESONANCE/);
assert.match(custody, /ORPHAN_EXCHANGE_POSITION/);
assert.match(custody, /PROTECTION_MISSING/);
assert.match(custody, /TIME_EXIT_DUE/);
assert.match(gate, /ENV_NEW_ENTRIES_DISABLED/);
assert.match(schema, /model MooxUnifiedLiveAccount/);
assert.match(schema, /model MooxUnifiedLiveSlice/);
assert.match(legacy, /newOrdersPlaced:\s*0/);
assert.doesNotMatch(legacy, /placeOrder|executeOrder|setLeverage/);

// V7.20.3.4 strict-TypeScript regressions from the real Windows build.
assert.doesNotMatch(store, /UnifiedLiveSide/);
assert.match(store, /const database = prisma;/);
assert.match(store, /UNIFIED_LIVE_DATABASE_UNAVAILABLE/);
assert.match(store, /if \(!database\) return \[\];/);
assert.match(runtime, /type StoredUnifiedLiveSlice/);
assert.match(memberClient, /type ChangeEvent/);
assert.match(strategiesRoute, /return legacyUnifiedSourceGET\(\);/);
assert.doesNotMatch(strategiesRoute, /legacyUnifiedSourceGET\(request\)/);

// V7.20.3.4 real Next.js production-lint regressions.
assert.doesNotMatch(adminClient, /\bany\b/);
assert.doesNotMatch(adminClient, /_props/);
assert.doesNotMatch(memberClient, /_props/);
assert.match(exchangeAdapter, /const snapshotModule =/);
assert.doesNotMatch(exchangeAdapter, /\b(?:const|let|var)\s+module\b/);

const lintSourcePaths = [
  "app/admin/live-trading/page.tsx",
  "app/api/admin/live-trading/route.ts",
  "app/api/cron/live-trading-custodian/route.ts",
  "app/api/member/live-trading/route.ts",
  "app/api/member/live-trading/settings/route.ts",
  "app/api/public/live-trading/route.ts",
  "app/live-trading/page.tsx",
  "app/member/live-trading/page.tsx",
  "components/live-trading/AdminLiveTradingClient.tsx",
  "components/live-trading/MemberLiveTradingClient.tsx",
  "components/live-trading/PublicLiveTradingBoard.tsx",
  "lib/trading-signals/unified-live-auth.ts",
  "lib/trading-signals/unified-live-config.ts",
  "lib/trading-signals/unified-live-custody-core.ts",
  "lib/trading-signals/unified-live-doctrine.ts",
  "lib/trading-signals/unified-live-entry-gate.ts",
  "lib/trading-signals/unified-live-exchange-adapter.ts",
  "lib/trading-signals/unified-live-position-sizing.ts",
  "lib/trading-signals/unified-live-public.ts",
  "lib/trading-signals/unified-live-runtime.ts",
  "lib/trading-signals/unified-live-store.ts",
  "types/unified-live-trading.ts",
];

for (const sourcePath of lintSourcePaths) {
  const source = read(sourcePath);
  assert.doesNotMatch(source, /(?:\:\s*any\b|\bas\s+any\b|<[^>]*\bany\b[^>]*>|\([^)]*\:\s*any\b)/, `explicit any in ${sourcePath}`);
  assert.doesNotMatch(source, /\b(?:const|let|var)\s+module\b/, `reserved module variable in ${sourcePath}`);
}
console.log("MOOX V7.20.3.4 UNIFIED LIVE STATIC REGRESSION PASSED");
