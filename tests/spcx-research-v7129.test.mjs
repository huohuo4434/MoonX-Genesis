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

test("SPCX V2 keeps the observed unlock rally and does not overwrite V1", () => {
  const publicV2 = read("lib/data/spcx-public-20260808.ts");
  const memberV2 = read("lib/data/spcx-member-20260808.ts");
  const publicV1 = read("lib/data/spcx-public-20260806.ts");
  const memberV1 = read("lib/data/spcx-member-20260806.ts");
  assert.match(publicV2, /spcx-20260808-v2/);
  assert.match(publicV2, /133\.11/);
  assert.match(publicV2, /135/);
  assert.match(publicV2, /revisionOf:\s*"spcx-20260806-v1"/);
  assert.match(memberV2, /2026-08-10/);
  assert.match(memberV2, /2026-08-14/);
  assert.match(memberV2, /threeMonth/);
  assert.match(memberV2, /oneYear/);
  assert.match(memberV2, /fiveYear/);
  assert.match(publicV1, /spcx-20260806/);
  assert.match(memberV1, /spcx-20260806-v1/);
});

test("SPCX watchlist and detail page both use the revised V2 dataset", () => {
  assert.match(read("components/conviction/SpcxWatchlistFeature.tsx"), /spcx-public-20260808/);
  const detail = read("components/conviction/SpcxResearchPage.tsx");
  assert.match(detail, /spcx-public-20260808/);
  assert.match(detail, /8月10日—14日逐日路径/);
  assert.match(detail, /月度与后期分层/);
  assert.match(detail, /V1\/V2验证计划/);
});

test("SPCX technical engine includes IPO and unlock-demand anchors", () => {
  const tech = read("lib/data/spcx-technical.ts");
  assert.match(tech, /135/);
  assert.match(tech, /109\.2/);
  assert.match(tech, /Yahoo Finance daily OHLC/);
  assert.match(tech, /30分钟K线/);
});
