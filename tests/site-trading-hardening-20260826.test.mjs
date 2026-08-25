import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");

test("HSTECH intraday feed is canonical and every member fallback checks index scale", () => {
  const intraday = read("lib/market-data/intraday-chan-levels.ts");
  const member = read("lib/forecasts/member-daily-live-levels.ts");
  assert.match(intraday, /HSTECH: YAHOO\("HSTECH", HSTECH_YAHOO_SYMBOL/);
  assert.match(intraday, /HSTECH_MIN_INDEX_LEVEL/);
  assert.doesNotMatch(intraday, /HSTECH: YAHOO\("HSTECH", "\^HSTECH"/);
  assert.match(member, /isPlausibleMemberTechnicalScale/);
  assert.match(member, /live\.currentPrice, live\.supportValue, live\.resistanceValue/);
  assert.match(member, /numericLevelValues\(supportRaw!/);
});

test("expired member sessions fail closed before stale private content can remain visible", () => {
  const heartbeat = read("components/access/MemberDeviceHeartbeat.tsx");
  const livePage = read("app/member/live-trading/page.tsx");
  assert.match(heartbeat, /response\.status === 401 \|\| response\.status === 403/);
  assert.match(heartbeat, /window\.location\.replace\(href\)/);
  assert.match(heartbeat, /fixed inset-0 z-\[100\]/);
  assert.match(heartbeat, /bg-\[#07080b\]/);
  assert.match(heartbeat, /requestRef\.current\?\.abort\(\)/);
  assert.match(heartbeat, /isCurrentHeartbeatGeneration/);
  assert.match(heartbeat, /role=\{blocking \? "alertdialog"/);
  assert.match(heartbeat, /createPortal\(notice, portalRoot\)/);
  assert.match(heartbeat, /setBlocking\(false\);\s+setPortalRoot\(null\);/);
  assert.match(heartbeat, /node !== root/);
  assert.match(heartbeat, /item\.node\.setAttribute\("inert"/);
  assert.doesNotMatch(heartbeat, /querySelector\("main"\)/);
  assert.match(heartbeat, /event\.key !== "Tab"/);
  assert.match(livePage, /getMemberDevicePageAccess/);
  assert.match(livePage, /MemberDeviceHeartbeat/);
});

test("health acceptance labels historical reports and never caches them as current", () => {
  const route = read("app/api/health/acceptance/route.ts");
  const freshness = read("lib/health/acceptance-freshness-core.ts");
  assert.match(route, /acceptanceReportFreshness/);
  assert.match(freshness, /reportAgeSeconds/);
  assert.match(freshness, /ACCEPTANCE_FUTURE_TOLERANCE_SECONDS/);
  assert.match(freshness, /current: !stale/);
  assert.match(route, /Cache-Control": "no-store/);
});

test("admin live GET is read-only while mutation remains explicit POST", () => {
  const route = read("app/api/admin/live-trading/route.ts");
  const runtime = read("lib/trading-signals/unified-live-runtime.ts");
  const cron = read("app/api/cron/live-trading-custodian/route.ts");
  const admin = read("components/live-trading/AdminLiveTradingClient.tsx");
  const getBody = route.slice(route.indexOf("export async function GET"), route.indexOf("export async function POST"));
  assert.match(getBody, /inspectUnifiedLiveCustody/);
  assert.doesNotMatch(getBody, /runUnifiedLiveCustodyCycle|getUnifiedLiveRuntimeStatus|setUnifiedLiveMode/);
  const inspection = runtime.slice(runtime.indexOf("export async function inspectUnifiedLiveCustody"), runtime.indexOf("export async function getUnifiedLiveRuntimeStatus"));
  assert.doesNotMatch(inspection, /ensureUnifiedLiveAccount|markUnifiedLiveManualClosures|recordUnifiedLiveEvents|setUnifiedLiveMode/);
  assert.match(cron, /export const maxDuration = 300/);
  assert.match(admin, /立即执行托管对账/);
  assert.doesNotMatch(admin, /立即只读审计/);
});
