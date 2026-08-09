import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { WATCHLIST_TEASERS } from "../lib/data/conviction/watchlist-teasers";

const bannedPublicPhrases = [
  "唯一方向",
  "看涨",
  "看跌",
  "只看周卦",
  "周卦、月卦",
  "技术不反向",
  "技术不参与",
  "外部技术有分歧",
  "方向只看",
  "共振证据",
];

test("public teaser headlines and hooks stay suggestive instead of revealing doctrine or direction", () => {
  for (const teaser of WATCHLIST_TEASERS) {
    const publicCopy = [teaser.eyebrowZh, teaser.headlineZh, teaser.hookZh].join(" | ");
    for (const phrase of bannedPublicPhrases) {
      assert.equal(publicCopy.includes(phrase), false, `${teaser.slug} leaks public doctrine/direction phrase: ${phrase}`);
    }
  }
});

test("BTC public teaser uses a market-rhythm hook rather than an internal methodology explanation", () => {
  const btc = WATCHLIST_TEASERS.find((item) => item.slug === "btc");
  assert.ok(btc);
  assert.equal(btc.headlineZh, "BTC：8/10这一周进入关键窗口，前后半周可能不是同一种节奏");
  assert.match(btc.hookZh, /这轮波动最后把价格带向哪一侧/);
  assert.equal(btc.hookZh.includes("外部技术"), false);
  assert.equal(btc.hookZh.includes("周卦"), false);
});

test("locked preview labels sell the unanswered questions without publishing the answer", () => {
  for (const teaser of WATCHLIST_TEASERS) {
    const preview = teaser.lockedPreviewZh.join(" | ");
    assert.equal(preview.includes("唯一方向"), false, `${teaser.slug} locked preview should not expose internal doctrine language`);
    assert.equal(preview.includes("看涨"), false, `${teaser.slug} locked preview should not reveal bullish direction`);
    assert.equal(preview.includes("看跌"), false, `${teaser.slug} locked preview should not reveal bearish direction`);
  }
});

test("member card still gives the target-week direction immediately after unlock", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components/conviction/ResearchSpotlightCard.tsx"), "utf8");
  assert.match(source, /mode === "fullAccess" && signal/);
  assert.match(source, /目标周 MOOX 唯一方向/);
  assert.match(source, /signal\.direction === "BULLISH" \? "↑ 看涨"/);
  assert.match(source, /mode === "publicOnly"/);
});
