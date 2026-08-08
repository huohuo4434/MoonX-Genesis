import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";

const read = (p) => readFileSync(join(process.cwd(), p), "utf8");

test("SPCX legacy featured-stock routes redirect to the canonical research page", () => {
  assert.match(read("app/featured-stocks/spcx/page.tsx"), /permanentRedirect\("\/markets\/watchlist\/spcx"\)/);
  assert.match(read("app/en/featured-stocks/spcx/page.tsx"), /permanentRedirect\("\/en\/markets\/watchlist\/spcx"\)/);
});

test("SPCX member API enforces membership and provides live technical context", () => {
  const route = read("app/api/member/spcx-research/route.ts");
  assert.match(route, /getMemberUserContext/);
  assert.match(route, /status:\s*403/);
  assert.match(route, /SPCX_MEMBER_RESEARCH/);
  assert.match(route, /getSpcxTechnicalSnapshot/);
  assert.match(route, /private, no-store/);
});

test("SPCX V2 keeps observed unlock anchors member-side and does not overwrite V1", () => {
  const publicV2 = read("lib/data/spcx-public-20260808.ts");
  const memberV2 = read("lib/data/spcx-member-20260808.ts");
  const publicV1 = read("lib/data/spcx-public-20260806.ts");
  const memberV1 = read("lib/data/spcx-member-20260806.ts");
  assert.match(publicV2, /spcx-20260808-v2/);
  assert.doesNotMatch(publicV2, /133\.11|ipoPrice|recentLowApprox|observedClose/);
  assert.match(memberV2, /133\.11/);
  assert.match(memberV2, /135/);
  assert.match(publicV2, /revisionOf:\s*"spcx-20260806-v1"/);
  assert.match(memberV2, /2026-08-10/);
  assert.match(memberV2, /2026-08-14/);
  assert.match(memberV2, /threeMonth/);
  assert.match(memberV2, /oneYear/);
  assert.match(memberV2, /fiveYear/);
  assert.match(publicV1, /spcx-20260806/);
  assert.match(memberV1, /spcx-20260806-v1/);
});

test("SPCX watchlist uses the safe teaser and detail loads member data through the protected API", () => {
  const list = read("components/conviction/ConvictionListClient.tsx");
  assert.match(list, /ResearchSpotlightCard/);
  assert.doesNotMatch(list, /SpcxWatchlistFeature/);
  const detail = read("components/conviction/SpcxResearchPage.tsx");
  assert.match(detail, /spcx-public-20260808/);
  assert.match(detail, /\/api\/member\/spcx-research/);
  assert.doesNotMatch(detail, /135美元IPO枢轴|109—110美元/);
});

test("SPCX technical engine includes IPO and unlock-demand anchors", () => {
  const tech = read("lib/data/spcx-technical.ts");
  assert.match(tech, /135/);
  assert.match(tech, /109\.2/);
  assert.match(tech, /Yahoo Finance daily OHLC/);
  assert.match(tech, /30分钟K线/);
});
