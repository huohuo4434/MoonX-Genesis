import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

const layout = read("app/layout.tsx");
const deferredCompatibility = read("components/system/DeferredLegacyCompatibility.tsx");
const guard = read("components/system/SiteClarityGuards.tsx");
const multiViewCore = read("lib/research/member-multi-view-core.ts");
const alphaFeed = read("app/member/alpha-feed/page.tsx");
const engine = read("lib/market-data/actionable-intraday-levels.ts");
const route = read("app/api/public/actionable-levels/route.ts");
const protocol = read("lib/research/research-protocol.ts");
const migration = read("prisma/migrations/20260818143000_moox_unified_live_v72031/migration.sql");
const analystPage = read("app/admin/external-analyst-horizons/page.tsx");
const protocolPage = read("app/admin/research-protocol/page.tsx");
const matrixLayout = read("app/admin/x-opinion-matrix/layout.tsx");

assert.doesNotMatch(layout, /import SiteClarityGuards/);
assert.doesNotMatch(layout, /<SiteClarityGuards\s*\/>/);
assert.match(deferredCompatibility, /DeferredSiteClarityGuards/);
assert.match(deferredCompatibility, /lazy\(\(\) => import\("@\/components\/system\/SiteClarityGuards"\)\)/);
for (const route of ["/member/daily", "/member/weekly", "/member/alpha-feed"]) {
  assert.match(deferredCompatibility, new RegExp(route.replaceAll("/", "\\/")));
}
assert.match(guard, /MOOX_SITE_CLARITY_V72093/);
assert.match(guard, /多方观点｜今日/);
assert.match(guard, /博主名称、用户名和原帖链接全部隐藏/);
assert.match(guard, /不能覆盖 MOOX 正式方向/);
assert.match(guard, /\/member\/alpha-feed/);
assert.match(guard, /guessMultiViewIdentitySeed/);
assert.match(guard, /stripMultiViewIdentity/);
assert.match(guard, /研究者/);
assert.match(guard, /今日共识/);
assert.match(guard, /主要分歧/);
assert.match(guard, /理论 \/ 方法/);
assert.match(guard, /全部方法/);
assert.match(guard, /data-moox-multi-view-original/);
assert.doesNotMatch(guard, /href\s*=\s*["']https?:\/\/(?:x\.com|twitter\.com)/i);

assert.match(multiViewCore, /MOOX_MEMBER_MULTI_VIEW_CORE_V720107_ASSET_MATRIX/);
for (const theory of ["缠论", "江恩", "艾略特波浪", "周期", "宏观", "基本面\/财报", "量价", "价格行为", "六爻", "奇门", "八字\/命理"]) {
  assert.match(multiViewCore, new RegExp(theory.replace("/", "\\/")));
}
assert.match(multiViewCore, /maxChars = 180/);
assert.ok(multiViewCore.includes("@[A-Za-z0-9_]{2,30}"));
assert.ok(multiViewCore.includes("x\\.com|twitter\\.com"));
assert.match(multiViewCore, /anonymizeMultiViewResearcher/);
assert.match(multiViewCore, /当前摘要未出现足够鲜明的流派术语/);
assert.ok(alphaFeed.length > 100, "existing member alpha-feed must remain the upstream source page");

// Cumulative V7.20.9.2 protections stay in place.
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
assert.match(protocol, /PRIMARY/);
assert.match(protocol, /AUXILIARY/);
for (const specialModule of [analystPage, protocolPage, matrixLayout]) {
  assert.match(specialModule, /MOOX_RESEARCH_PROTOCOL_V72092/);
  assert.doesNotMatch(specialModule, /export\s+const\s+MOOX_RESEARCH_PROTOCOL/);
}

for (const pattern of [/\bDROP\b/i, /\bTRUNCATE\b/i, /\bDELETE\s+FROM\b/i]) {
  assert.equal(pattern.test(migration), false, `migration must stay additive: ${pattern}`);
}

console.log("MOOX V7.20.9.3 MEMBER MULTI-VIEW REGRESSION PASSED");
