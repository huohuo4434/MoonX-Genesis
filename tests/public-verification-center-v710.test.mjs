import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

test("public verification page is track-record first", () => {
  const page = read("app/verification/page.tsx");
  assert.match(page, /PublicVerificationCenter/);
  assert.match(page, /PendingVerificationSummary/);
  assert.match(page, /VerificationMethodDisclosure/);
  assert.ok(page.indexOf("<PublicVerificationCenter") < page.indexOf("<VerificationMethodDisclosure"));
});

test("track-record center exposes real stats, trend, asset and star views", () => {
  const ui = read("components/verification/PublicVerificationCenter.tsx");
  for (const marker of [
    "已验证样本",
    "综合加权命中率",
    "方向命中率",
    "完整路径命中率",
    "战绩趋势",
    "按资产表现",
    "共识星级真实表现",
    "最近逐笔验证",
    "失败记录永久保留",
  ]) assert.ok(ui.includes(marker), marker);
  assert.match(ui, /publicStarAccuracyBreakdown/);
  assert.match(ui, /result === "PARTIAL_HIT"\) return 0\.5/);
  assert.doesNotMatch(ui, /68\.7%|71\.2%|72\.0%/);
});

test("stale verification failures cannot remain pending forever", () => {
  const daily = read("lib/verification/run-daily.ts");
  assert.match(daily, /AUTO_UNVERIFIABLE_AFTER_MS = 72/);
  assert.match(daily, /finalizedUnverifiable/);
  assert.match(daily, /buildAgedUnverifiableResult/);
  assert.match(daily, /verdict: "UNVERIFIABLE"/);
  assert.match(daily, /从命中率分母中排除/);
  assert.match(daily, /isSessionReadyToVerify/);
});

test("public JSON keeps daily compatibility and adds weekly and pending data", () => {
  const api = read("app/api/public/verification/route.ts");
  assert.match(api, /getCachedPublicVerificationSnapshot/);
  assert.match(api, /\.\.\.daily/);
  assert.match(api, /weekly,/);
  assert.match(api, /pending,/);
  assert.match(api, /missesRetained: true/);
  assert.match(api, /CSV remains backward compatible/);
});
