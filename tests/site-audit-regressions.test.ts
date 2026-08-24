import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";

const root = process.cwd();
const read = (relative: string) => readFileSync(join(root, relative), "utf8");

test("admin routes reject unauthenticated requests and middleware accepts role admins", () => {
  const middleware = read("middleware.ts");
  assert.match(middleware, /isAdminUser/);
  assert.doesNotMatch(middleware, /isAdminEmail/);

  for (const route of [
    "app/api/admin/conviction-assets/route.ts",
    "app/api/admin/vibe-evidence/route.ts",
  ]) {
    const text = read(route);
    assert.match(text, /if \(!\(await requireAdmin\(\)\)\)/);
    assert.doesNotMatch(text, /^\s*await requireAdmin\(\);/m);
  }
});

test("public health endpoint does not expose admin details to anonymous callers", () => {
  const text = read("app/api/health/auth/route.ts");
  assert.match(text, /requesterIsAdmin/);
  assert.match(text, /\? \{ \.\.\.publicStatus, serviceRoleConfigured, adminUserExists, adminRole \}/);
});

test("SEO and pricing copy no longer contain known regressions", () => {
  assert.doesNotMatch(read("app/layout.tsx"), /canonical:\s*siteConfig\.url/);
  const i18n = read("lib/i18n/server.ts");
  assert.match(i18n, /Remove legacy trailing brand fragments/);
  assert.match(i18n, /MOOX\(\?:\\s\+Intelligence\|会员\|\\s\+Members\)/);
  const pricing = read("app/pricing/page.tsx");
  assert.match(pricing, /MOOX会员方案/);
  assert.doesNotMatch(pricing, /Unlock MOOX Intelligence|不降价。/);

  const client = read("components/payments/PricingPlansClient.tsx");
  assert.equal((client.match(/4\. 链上确认后自动开通会员/g) ?? []).length, 1);
  assert.doesNotMatch(client, /等待人工审核开通|管理员审核后开通/);
  assert.match(client, /@jackuwin/);
});

test("Asteroid and homepage focus cards use the canonical research store", () => {
  const seed = read("lib/data/conviction/seed.ts");
  assert.match(seed, /network: "Ethereum \/ 以太坊"/);
  assert.doesNotMatch(read("lib/data/featured-stocks.ts"), /symbol: "ASTER"/);
  assert.doesNotMatch(read("lib/presentation/asset-catalog.ts"), /aliases: \["ASTER"\]/);

  const home = read("components/home/HomeFeaturedAssets.tsx");
  assert.match(home, /listPublicConvictionCards/);
  assert.doesNotMatch(home, /listFeaturedStocks/);
});

test("forecast generation uses the unified nine-market pipeline", () => {
  const cycle = read("lib/automation/cycle.ts");
  assert.match(cycle, /runDailyForecastPipeline/);
  assert.match(cycle, /forecast-unified/);
  assert.doesNotMatch(cycle, /generateForecastBatch|forecast-asia|forecast-wti|forecast-us/);

  const today = read("components/home/HomeTodaySection.tsx");
  assert.doesNotMatch(today, /US_BATCH_KEYS|WTI_BATCH_KEYS|按批次发布时间/);
});

test("member pages hide internal recovery wording and security headers are enabled", () => {
  assert.doesNotMatch(read("components/signals/MemberTradingSignals.tsx"), /可由管理员在.*行情录入/);
  const vibe = read("components/conviction/VibeEvidencePanel.tsx");
  assert.doesNotMatch(vibe, /管理员证据|接入前置快照/);

  const config = read("next.config.ts");
  assert.match(config, /X-Content-Type-Options/);
  assert.match(config, /Permissions-Policy/);
});

test("site health covers focus assets and Vibe evidence", () => {
  const health = read("lib/admin/site-health.ts");
  assert.match(health, /key: "focus"/);
  assert.match(health, /key: "vibe"/);
  assert.match(health, /vibeEvidenceReady/);
});
