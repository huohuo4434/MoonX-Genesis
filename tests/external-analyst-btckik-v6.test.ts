import assert from "node:assert/strict";
import test from "node:test";
import { parseExternalAnalystPost, analystSourceFromUsername } from "../lib/trading-signals/external-analyst-parser";
import { assessAltcoinRadarPost } from "../lib/trading-signals/altcoin-radar";

test("btckik is registered as the altcoin rotation source", () => {
  assert.equal(analystSourceFromUsername("@btckik"), "BTCKIK");
});

test("btckik cashtags are mapped to USDT symbols", () => {
  const parsed = parseExternalAnalystPost({
    source: "BTCKIK",
    username: "btckik",
    postId: "1",
    postUrl: "https://x.com/btckik/status/1",
    postedAt: "2026-08-06T00:00:00.000Z",
    text: "$PENGU 还没涨，低位关注，等待放量突破。",
  });
  assert.deepEqual(parsed.symbols, ["PENGUUSDT"]);
  assert.equal(assessAltcoinRadarPost(parsed).stage, "EARLY_WATCH");
});

test("overheated mentions are not presented as a chase signal", () => {
  const parsed = parseExternalAnalystPost({
    source: "BTCKIK",
    username: "btckik",
    postId: "2",
    postUrl: "https://x.com/btckik/status/2",
    postedAt: "2026-08-06T00:00:00.000Z",
    text: "$ABC 已经暴涨翻倍并创新高。",
  });
  assert.equal(assessAltcoinRadarPost(parsed).stage, "OVERHEATED");
});
