import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { intersectFocusWithBitget } from "../lib/trading-signals/member-instrument-registry";

test("focus registry uses exact online Bitget intersection without similar substitution", () => {
  const rows = intersectFocusWithBitget({
    focus: [
      { canonicalSymbol: "BTCUSDT", displayName: "比特币", assetClass: "CRYPTO" },
      { canonicalSymbol: "SNDKUSDT", displayName: "闪迪", assetClass: "EQUITY" },
    ],
    contracts: [
      { symbol: "BTCUSDT", category: "USDT-FUTURES", status: "online" },
      { symbol: "SANDUSDT", category: "USDT-FUTURES", status: "online" },
      { symbol: "SNDKUSDT", category: "USDT-FUTURES", status: "offline" },
    ],
    discoveredAt: "2026-08-15T12:00:00.000Z",
  });
  assert.equal(rows[0].availability, "AVAILABLE");
  assert.equal(rows[0].bitgetSymbol, "BTCUSDT");
  assert.equal(rows[1].availability, "UNAVAILABLE");
  assert.equal(rows[1].executionScope, "RESEARCH_ONLY");
  assert.equal(rows[1].bitgetSymbol, null);
});

test("instrument API and UI remain member/device gated and expose explicit unavailable state", () => {
  const route = readFileSync("app/api/v1/member/trading/instruments/route.ts", "utf8");
  const ui = readFileSync("components/member/MemberTradingOnboarding.tsx", "utf8");
  assert.match(route, /getMemberDevicePageAccess/);
  assert.match(route, /checkMemberApiRateLimit/);
  assert.match(ui, /RESEARCH_ONLY \/ UNAVAILABLE/);
  assert.match(ui, /execution\.levelStatus === "VALID"/);
  assert.doesNotMatch(ui, /useState\("BTCUSDT"\)/);
});
