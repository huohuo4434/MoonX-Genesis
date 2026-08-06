import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const page = fs.readFileSync(path.join(root, "app/member/alpha-feed/page.tsx"), "utf8");
const overlay = fs.readFileSync(path.join(root, "lib/trading-signals/external-analyst-overlay.ts"), "utf8");

test("member radar hides monitored identities and original-source links", () => {
  for (const forbidden of [
    "@btckik",
    "btckik山寨币",
    "KOL RADAR",
    "KOL观察",
    "打开原帖",
    "Open original post",
    "X_BEARER_TOKEN",
    "MOOX_EXTERNAL_ANALYST_FEED_URL",
    "post.username",
    "post.postUrl",
  ]) {
    assert.equal(page.includes(forbidden), false, `public page still contains: ${forbidden}`);
  }
  assert.match(page, /MOOX SMART MONEY · NARRATIVE RADAR/);
  assert.match(page, /前台只展示MOOX二次分析结果/);
});

test("trading conditions use generic market-signal wording", () => {
  assert.equal(overlay.includes("sourceLabel("), false);
  assert.equal(overlay.includes("sourceLabels: overlay.sourceLabels"), false);
  assert.equal(overlay.includes("sourceUrls: overlay.sourceUrls"), false);
  assert.equal(overlay.includes("summaries: overlay.summaries"), false);
  assert.match(overlay, /市场资金线索参考/);
  assert.match(overlay, /公开市场资金线索仅辅助/);
});
