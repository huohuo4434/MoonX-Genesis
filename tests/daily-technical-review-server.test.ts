import assert from "node:assert/strict";
import { test } from "node:test";
import { loadDailyTechnicalReview } from "../lib/forecasts/daily-technical-review.server";

test("failed public readers cannot claim a successful source or submit any order", async () => {
  const originalFetch = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    urls.push(url);
    assert.ok(!init?.method || init.method === "GET");
    assert.doesNotMatch(url, /place.order|submit|account|private/i);
    return new Response("unavailable", { status: 503 });
  };
  try {
    for (const market of ["BTC", "NDX"]) {
      const review = await loadDailyTechnicalReview(market, Date.parse("2026-09-05T00:00:00Z"));
      assert.equal(review.frames.length, 3);
      for (const frame of review.frames) {
        assert.equal(frame.available, false);
        assert.equal(frame.penalty, 0);
        assert.match(frame.reason, /行情源：无有效数据/);
      }
    }
    assert.ok(urls.some((url) => url.includes("finance.yahoo.com")));
    assert.ok(urls.some((url) => url.includes("bitget.com")));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
