import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

for (const rel of [
  "app/loading.tsx",
  "components/home/HomeOfficialAccountTile.tsx",
  "components/system/DeferredLegacyCompatibility.tsx",
  "lib/client/session-lite.ts",
]) assert.ok(exists(rel), `missing ${rel}`);

const home = read("components/home/HomeLandingBoard.tsx");
assert.match(home, /<Suspense fallback=\{<HomeLandingFallback \/>\}>/);
assert.match(home, /HomeMobileVerificationData/);
assert.match(home, /HomeDesktopVerificationData/);
assert.doesNotMatch(home, /await getPublicUnifiedLiveSnapshot\(/);
assert.doesNotMatch(home, /openOfficialPositions=|livePublicReadable=/);

const mobile = read("components/home/HomeMobileAppView.tsx");
assert.match(mobile, /HomeOfficialAccountTile/);
assert.doesNotMatch(mobile, /livePublicReadable|openOfficialPositions/);

const liveTile = read("components/home/HomeOfficialAccountTile.tsx");
assert.match(liveTile, /fetch\("\/api\/public\/live-trading"/);
assert.match(liveTile, /2_500/);
assert.doesNotMatch(liveTile, /method:\s*["']POST["']/);

const liveRoute = read("app/api/public/live-trading/route.ts");
assert.match(liveRoute, /s-maxage=15, stale-while-revalidate=45/);

const access = read("lib/prediction-access-server.ts");
assert.match(access, /const \[\{ access \}, rows\] = await Promise\.all\(\[/);
assert.match(access, /resolveTodayPredictionAccess\(now\)[\s\S]*loadTodayForecastRows\(now\)/);

const layout = read("app/layout.tsx");
assert.match(layout, /DeferredLegacyCompatibility/);
assert.doesNotMatch(layout, /<PlainLanguageDirectionGuard \/>|<TomorrowViewFallback \/>|<WatchlistDailyDomFallback \/>|<MemberWelcomeGuide \/>/);

const deferred = read("components/system/DeferredLegacyCompatibility.tsx");
assert.match(deferred, /requestIdleCallback/);
assert.match(deferred, /lazy\(\(\) =>/);
assert.match(deferred, /DeferredMemberWelcomeGuide/);
assert.match(deferred, /watchlist = \/\\\/featured-stocks\\\//);

const guard = read("components/system/PlainLanguageDirectionGuard.tsx");
assert.match(guard, /requestAnimationFrame\(flush\)/);
assert.match(guard, /pendingRoots/);

const tomorrow = read("components/home/TomorrowViewFallback.tsx");
assert.match(tomorrow, /matchMedia\("\(min-width: 768px\)"\)/);

const nav = read("components/layout/Navbar.tsx");
assert.doesNotMatch(nav, /prefetch=\{false\}/);
assert.match(nav, /router\.prefetch\(href\(link\.href\)\)/);

const session = read("lib/client/session-lite.ts");
assert.match(session, /let inflight: Promise<SessionLite> \| null = null/);
assert.match(session, /if \(inflight\) return inflight/);
assert.match(session, /SESSION_LITE_CACHE_KEY/);

const navbarSession = read("components/layout/NavbarSession.tsx");
const welcome = read("components/onboarding/MemberWelcomeGuide.tsx");
assert.match(navbarSession, /loadSessionLite\(30_000\)/);
assert.match(welcome, /loadSessionLite\(2 \* 60 \* 1000\)/);
assert.doesNotMatch(navbarSession + welcome, /fetch\("\/api\/auth\/session-lite"/);

const scope = [
  home, mobile, liveTile, liveRoute, layout, deferred, guard, tomorrow, nav,
  session, navbarSession, welcome, read("app/loading.tsx"),
].join("\n");
assert.doesNotMatch(scope, /\$executeRaw|\$queryRawUnsafe|CREATE TABLE|ALTER TABLE|INSERT INTO|UPDATE\s+trade_|DELETE FROM|runThreeHorizonStrategyEngine|executeLive|placeOrder/);

console.log("MOOX V7.20.8 APP PERFORMANCE STATIC REGRESSION PASSED");
