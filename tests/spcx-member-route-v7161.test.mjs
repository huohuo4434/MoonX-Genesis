import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const aliases = new Map([
  ["app/featured-stocks/spcx/page.tsx", "/markets/watchlist/spcx"],
  ["app/en/featured-stocks/spcx/page.tsx", "/en/markets/watchlist/spcx"],
  ["app/member/stocks/spcx/page.tsx", "/markets/watchlist/spcx"],
  ["app/en/member/stocks/spcx/page.tsx", "/en/markets/watchlist/spcx"],
  ["app/member/featured-stocks/spcx/page.tsx", "/markets/watchlist/spcx"],
  ["app/en/member/featured-stocks/spcx/page.tsx", "/en/markets/watchlist/spcx"],
  ["app/member/markets/watchlist/spcx/page.tsx", "/markets/watchlist/spcx"],
  ["app/en/member/markets/watchlist/spcx/page.tsx", "/en/markets/watchlist/spcx"],
  ["app/stocks/spcx/page.tsx", "/markets/watchlist/spcx"],
  ["app/en/stocks/spcx/page.tsx", "/en/markets/watchlist/spcx"],
]);

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("canonical SPCX research routes exist", () => {
  assert.ok(fs.existsSync(path.join(root, "app/markets/watchlist/spcx/page.tsx")));
  assert.ok(fs.existsSync(path.join(root, "app/en/markets/watchlist/spcx/page.tsx")));
});

test("SPCX protected research API exists", () => {
  const rel = "app/api/member/spcx-research/route.ts";
  assert.ok(fs.existsSync(path.join(root, rel)));
  const src = read(rel);
  assert.match(src, /getMemberUserContext/);
  assert.match(src, /MEMBERSHIP_REQUIRED/);
});

test("all known SPCX legacy routes resolve before dynamic notFound pages", () => {
  for (const [rel, target] of aliases) {
    const src = read(rel);
    assert.match(src, /from ["']next\/navigation["']/);
    assert.match(src, /\bredirect\s*\(/);
    assert.ok(src.includes(`redirect("${target}")`), `${rel} must redirect to ${target}`);
    assert.doesNotMatch(src, /notFound\s*\(/);
  }
});

test("public watchlist teaser keeps canonical SPCX href", () => {
  const rel = "lib/data/conviction/watchlist-teasers.ts";
  assert.ok(fs.existsSync(path.join(root, rel)));
  const src = read(rel);
  const start = src.indexOf('slug: "spcx"');
  assert.ok(start >= 0, "SPCX teaser missing");
  const block = src.slice(start, start + 900);
  assert.match(block, /detailHref:\s*["']\/markets\/watchlist\/spcx["']/);
});
