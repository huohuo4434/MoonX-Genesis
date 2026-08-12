import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const aliases = new Map([
  ["app/member/spcx/page.tsx", "/featured-stocks/spcx"],
  ["app/member/stocks/spcx/page.tsx", "/featured-stocks/spcx"],
  ["app/member/featured-stocks/spcx/page.tsx", "/featured-stocks/spcx"],
  ["app/member/markets/watchlist/spcx/page.tsx", "/featured-stocks/spcx"],
  ["app/stocks/spcx/page.tsx", "/featured-stocks/spcx"],
  ["app/en/member/spcx/page.tsx", "/en/featured-stocks/spcx"],
  ["app/en/member/stocks/spcx/page.tsx", "/en/featured-stocks/spcx"],
  ["app/en/member/featured-stocks/spcx/page.tsx", "/en/featured-stocks/spcx"],
  ["app/en/member/markets/watchlist/spcx/page.tsx", "/en/featured-stocks/spcx"],
  ["app/en/stocks/spcx/page.tsx", "/en/featured-stocks/spcx"],
]);

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("canonical SPCX routes render the research shell outside the admin-only tree", () => {
  const zh = read("app/featured-stocks/spcx/page.tsx");
  const en = read("app/en/featured-stocks/spcx/page.tsx");
  assert.match(zh, /SpcxResearchPage language="zh"/);
  assert.match(en, /SpcxResearchPage language="en"/);
  assert.doesNotMatch(zh, /markets\/watchlist\/spcx/);
  assert.doesNotMatch(en, /markets\/watchlist\/spcx/);
});

test("SPCX protected research API still enforces membership", () => {
  const src = read("app/api/member/spcx-research/route.ts");
  assert.match(src, /getMemberUserContext/);
  assert.match(src, /MEMBERSHIP_REQUIRED/);
  assert.match(src, /status: 403/);
  assert.match(src, /private, no-store/);
});

test("all known member and stock aliases now target the reachable canonical page", () => {
  for (const [rel, target] of aliases) {
    const src = read(rel);
    assert.match(src, /from ["']next\/navigation["']/);
    assert.match(src, /\bredirect\s*\(/);
    assert.ok(src.includes(`redirect("${target}")`), `${rel} must redirect to ${target}`);
    assert.doesNotMatch(src, /notFound\s*\(/);
    assert.doesNotMatch(src, /markets\/watchlist\/spcx/);
  }
});

test("old admin-tree SPCX URL is rescued before the middleware 404 gate", () => {
  const middleware = read("middleware.ts");
  const rescue = middleware.indexOf('internalPath === "/markets/watchlist/spcx"');
  const gate = middleware.indexOf("const adminOnly = isAdminOnlyPublicPath(internalPath)");
  assert.ok(rescue >= 0 && rescue < gate);
  assert.match(middleware, /target\.pathname = englishUrl \? "\/en\/featured-stocks\/spcx" : "\/featured-stocks\/spcx"/);
  assert.match(middleware, /NextResponse\.redirect\(target, 308\)/);
});

test("SPCX cards link directly to the reachable canonical route", () => {
  const teaser = read("lib/data/conviction/watchlist-teasers.ts");
  const start = teaser.indexOf('slug: "spcx"');
  assert.ok(start >= 0, "SPCX teaser missing");
  assert.match(teaser.slice(start, start + 900), /detailHref:\s*["']\/featured-stocks\/spcx["']/);
  const feature = read("components/conviction/SpcxWatchlistFeature.tsx");
  assert.match(feature, /"\/en\/featured-stocks\/spcx" : "\/featured-stocks\/spcx"/);
});
