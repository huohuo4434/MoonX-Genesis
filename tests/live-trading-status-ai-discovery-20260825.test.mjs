import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");

test("member live status is bounded and never reports unknown state as clear", () => {
  const route = read("app/api/member/live-trading/route.ts");
  const client = read("components/live-trading/MemberLiveTradingClient.tsx");
  const page = read("app/member/live-trading/page.tsx");
  const readOnly = read("lib/live-status-readonly.ts");
  assert.match(route, /LIVE_STATUS_DEADLINE_MS = 9_000/);
  assert.match(route, /LIVE_STATUS_TIMEOUT/);
  assert.match(route, /status: 503/);
  assert.match(client, /const \[loadError, setLoadError\]/);
  assert.match(client, /liveState !== null && loadError === null/);
  assert.match(client, /状态仍在读取，尚不能判断是否存在阻断项/);
  assert.match(client, /statusLoaded && !\(feed\?\.diagnosis \?\? \[\]\)\.length/);
  assert.doesNotMatch(client, /20秒内仍未取得状态/);
  assert.doesNotMatch(route, /ensureUnifiedLiveAccount|getThreeHorizonStrategyDashboard|getBitgetRuntimeState|evaluateUnifiedLiveNewEntryGate|runUnifiedLiveCustodyCycle/);
  assert.match(route, /actor\.raw\.isActiveMember !== true/);
  assert.match(route, /ACTIVE_MEMBERSHIP_REQUIRED/);
  assert.match(route, /freshPositionsReadOk = true/);
  assert.match(route, /if \(!freshPositionsReadOk\)/);
  assert.match(route, /READ_ONLY_CUSTODY_AUDIT_NOT_AUTHORITATIVE/);
  assert.match(route, /const custodyReady = false/);
  assert.match(route, /const eligibleForServerPreflight = databaseReady/);
  assert.match(route, /custodyAuditAuthoritative: false/);
  assert.match(route, /liveConfigured/);
  assert.match(client, /disabled=\{busy \|\| !activation\?\.eligibleForServerPreflight\}/);
  assert.match(client, /提交完整审计并启用1000U实盘/);
  assert.match(page, /getAccessUser/);
  assert.match(page, /!access\.isActiveMember/);
  assert.doesNotMatch(readOnly, /\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE)\b/i);
});

test("AI discovery uses the canonical production domain without exposing private routes", () => {
  const sitemap = read("app/sitemap.ts");
  const robots = read("app/robots.ts");
  const llms = read("public/llms.txt");
  assert.match(sitemap, /siteConfig\.url/);
  assert.doesNotMatch(sitemap, /NEXT_PUBLIC_SITE_URL/);
  assert.match(robots, /OAI-SearchBot/);
  assert.match(robots, /"\/member\/"/);
  assert.match(robots, /"\/api\/"/);
  assert.match(robots, /"\/account\/"/);
  assert.match(robots, /"\/checkout\/"/);
  assert.match(llms, /Canonical site: https:\/\/mooxintel\.com\//);
  assert.match(llms, /Do not infer or expose content from disallowed member/);
});

test("public live trading never counts pending reconciliation rows as current positions", () => {
  const publicSnapshot = read("lib/trading-signals/unified-live-public.ts");
  const store = read("lib/trading-signals/unified-live-store.ts");
  const publicBoard = read("components/live-trading/PublicLiveTradingBoard.tsx");
  assert.match(publicSnapshot, /positions: slices\.active\.map\(mapRecord\)/);
  assert.match(publicSnapshot, /pendingReconciliation: slices\.pending\.map\(mapRecord\)/);
  assert.match(store, /status: \{ in: \["OPEN", "PARTIALLY_CLOSED"\] \}/);
  assert.match(store, /status: "PENDING"/);
  assert.match(store, /status: \{ notIn: \["OPEN", "PARTIALLY_CLOSED", "PENDING"\] \}/);
  assert.match(publicBoard, /PENDING 不再冒充已开仓/);
  assert.match(publicBoard, /持续存在说明托管\/对账链需要排查/);
});

test("read-only daily trading aggregates use the complete Beijing business day", () => {
  const readOnly = read("lib/live-status-readonly.ts");
  assert.match(readOnly, /timezone\('Asia\/Shanghai', updated_at\)::date/);
  assert.match(readOnly, /COUNT\(DISTINCT run_id\)::int AS scans_today/);
  assert.doesNotMatch(readOnly, /updatedAt\.slice\(0, 10\)/);
});
