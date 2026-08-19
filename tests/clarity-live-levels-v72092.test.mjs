import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

const layout = read("app/layout.tsx");
const guard = read("components/system/SiteClarityGuards.tsx");
const engine = read("lib/market-data/actionable-intraday-levels.ts");
const route = read("app/api/public/actionable-levels/route.ts");
const protocol = read("lib/research/research-protocol.ts");
const migration = read("prisma/migrations/20260818143000_moox_unified_live_v72031/migration.sql");
const analystPage = read("app/admin/external-analyst-horizons/page.tsx");
const protocolPage = read("app/admin/research-protocol/page.tsx");
const matrixLayout = read("app/admin/x-opinion-matrix/layout.tsx");

assert.match(layout, /MOOX_CLARITY_LIVE_LEVELS_V72092/);
assert.match(layout, /<SiteClarityGuards\s*\/>/);
assert.match(guard, /MOOX_SITE_CLARITY_V72092/);
assert.match(guard, /上涨情景权重/);
assert.match(guard, /震荡情景权重/);
assert.match(guard, /下跌情景权重/);
assert.match(guard, /技术点位 · 只负责位置与风控/);
assert.match(guard, /\/api\/public\/actionable-levels/);
assert.match(guard, /gap <= 0/);
assert.match(guard, /reference \* 0\.0035/);

assert.match(engine, /interval=1h&range=30d/);
assert.match(engine, /minCorridor = Math\.max\(atr \* 0\.8, referencePrice \* 0\.004\)/);
assert.match(engine, /SPX: \["SPY", "\^GSPC"\]/);
assert.match(engine, /NDX: \["QQQ", "\^NDX"\]/);
assert.match(engine, /1H_SWING_CLUSTER/);
assert.match(engine, /1H_SWING_FALLBACK/);
assert.match(route, /UNSUPPORTED_SYMBOL/);
assert.match(route, /ACTIONABLE_LEVELS_UNAVAILABLE/);

assert.match(protocol, /MOOX_RESEARCH_PROTOCOL_V72092/);
assert.match(protocol, /7\.20\.9\.2/);
assert.match(protocol, /PRIMARY/);
assert.match(protocol, /AUXILIARY/);
for (const specialModule of [analystPage, protocolPage, matrixLayout]) {
  assert.match(specialModule, /MOOX_RESEARCH_PROTOCOL_V72092/);
  assert.doesNotMatch(specialModule, /export\s+const\s+MOOX_RESEARCH_PROTOCOL/);
}

for (const pattern of [/\bDROP\b/i, /\bTRUNCATE\b/i, /\bDELETE\s+FROM\b/i]) {
  assert.equal(pattern.test(migration), false, `migration must stay additive: ${pattern}`);
}

console.log("MOOX V7.20.9.2 FOCUSED REGRESSION PASSED");
