import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { intersectFocusWithBitget } from "../lib/trading-signals/member-instrument-registry";
import { STATIC_FOCUS_ASSET_IDS, listStaticMemberAutomationFocus } from "../lib/data/conviction/focus-registry-core";
import { listAiTradingFocusRegistry } from "../lib/trading-signals/ai-trading-focus";

test("focus registry uses exact online Bitget intersection without similar substitution", () => {
  const rows = intersectFocusWithBitget({
    focus: [
      { assetId: "btc", canonicalSymbol: "BTCUSDT", displayName: "比特币", assetClass: "CRYPTO" },
      { assetId: "sandisk", canonicalSymbol: "SNDKUSDT", displayName: "闪迪", assetClass: "EQUITY" },
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

test("member automation union covers every static focus asset and exact official online contracts", () => {
  const staticFocus = listStaticMemberAutomationFocus();
  assert.deepEqual(staticFocus.map((row) => row.assetId), [...STATIC_FOCUS_ASSET_IDS]);
  assert.equal(staticFocus.length, 16);
  const union = listAiTradingFocusRegistry();
  for (const assetId of STATIC_FOCUS_ASSET_IDS) assert.equal(union.filter((row) => row.assetId === assetId).length, 1, assetId);
  const mappedSymbols = union.map((row) => row.canonicalSymbol).filter((value): value is string => value != null);
  assert.equal(new Set(mappedSymbols).size, mappedSymbols.length, "canonical symbols must be unique");
  for (const symbol of ["XAUTUSDT", "XAGUSDT", "QQQUSDT", "SPYUSDT", "CLUSDT"]) {
    assert.equal(union.filter((row) => row.canonicalSymbol === symbol).length, 1, `AI-only focus ${symbol}`);
  }
  assert.equal(staticFocus.find((row) => row.assetId === "asteroid")?.assetClass, "CRYPTO");
  assert.equal(staticFocus.find((row) => row.assetId === "cxmt")?.displayName, "长鑫科技");
  const onlineSymbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "HYPEUSDT", "MUUSDT", "SNDKUSDT", "NBISUSDT", "GOOGLUSDT", "MSFTUSDT", "TENCENTUSDT"];
  const contracts = [
    ...onlineSymbols.map((symbol) => ({ symbol, category: "USDT-FUTURES", status: "online" })),
    { symbol: "SANDUSDT", category: "USDT-FUTURES", status: "online" },
    { symbol: "00700USDT", category: "USDT-FUTURES", status: "online" },
    { symbol: "ASTEROIDUSDT", category: "USDT-FUTURES", status: "online" },
  ];
  const rows = intersectFocusWithBitget({ focus: staticFocus, contracts, discoveredAt: "2026-08-15T12:00:00.000Z" });
  assert.equal(rows.length, 16);
  const available = rows.filter((row) => row.availability === "AVAILABLE").map((row) => row.bitgetSymbol).sort();
  assert.deepEqual(available, [...onlineSymbols].sort());
  for (const assetId of ["ganfeng-lithium", "lian-tech", "lexin-medical", "cxmt", "asteroid", "kingsoft-office"]) {
    const row = rows.find((value) => value.assetId === assetId)!;
    assert.equal(row.canonicalSymbol, null, assetId);
    assert.equal(row.availability, "UNAVAILABLE", assetId);
    assert.equal(row.executionScope, "RESEARCH_ONLY", assetId);
  }
  assert.equal(rows.find((row) => row.assetId === "tencent")?.bitgetSymbol, "TENCENTUSDT");
});

test("instrument API and UI remain member/device gated and expose explicit unavailable state", () => {
  const route = readFileSync("app/api/v1/member/trading/instruments/route.ts", "utf8");
  const ui = readFileSync("components/member/MemberTradingOnboarding.tsx", "utf8");
  assert.match(route, /getMemberDevicePageAccess/);
  assert.match(route, /checkMemberApiRateLimit/);
  assert.match(ui, /RESEARCH_ONLY \/ UNAVAILABLE/);
  assert.match(ui, /合约可用·正式计划满足后可执行/);
  assert.match(ui, /execution\.levelStatus === "VALID"/);
  assert.doesNotMatch(ui, /useState\("BTCUSDT"\)/);
});
