import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { resolveAllowedSymbolUniverse } from "../lib/bitget/live-symbol-universe-core.ts";

const client = fs.readFileSync("lib/bitget/demo-client.ts", "utf8");
const adminPage = fs.readFileSync("app/admin/bitget-demo/page.tsx", "utf8");
const memberPage = fs.readFileSync("components/member/AiTradingDeskClient.tsx", "utf8");

test("formal live allow-list contains the 18 exact approved instruments", () => {
  const match = client.match(/DEFAULT_LIVE_EXPERIMENT_SYMBOLS[^=]*=\s*\[([\s\S]*?)\];/);
  assert.ok(match, "formal live symbol array missing");
  const symbols = [...match[1].matchAll(/"([A-Z0-9]+USDT)"/g)].map((m) => m[1]);
  assert.deepEqual(symbols, [
    "BTCUSDT", "ETHUSDT", "HYPEUSDT", "SOLUSDT", "MUUSDT", "NBISUSDT",
    "QQQUSDT", "XAUTUSDT", "XAGUSDT", "GOOGLUSDT", "CLUSDT", "SPYUSDT",
    "SNDKUSDT", "MSFTUSDT", "TENCENTUSDT", "LITEUSDT", "TSLAUSDT", "INTCUSDT",
  ]);
});

test("admin and member copy show the expanded exact-contract pool", () => {
  assert.match(adminPage, /\{allowedCount\}个正式允许USDT合约品种/);
  assert.match(adminPage, /动态Top10进入候选排序/);
  assert.match(memberPage, /正式允许池共18个Bitget精确合约全部扫描/);
  assert.match(memberPage, /18 exact Bitget instruments/i);
});

test("focus and legacy stock emergency opt-outs remove symbols from both default and explicit bases", () => {
  const focusSymbols = ["SOLUSDT", "NBISUSDT", "TENCENTUSDT", "LITEUSDT", "TSLAUSDT", "INTCUSDT"];
  const stockSymbols = ["SNDKUSDT", "MSFTUSDT"];
  const defaultSymbols = [
    "BTCUSDT", "ETHUSDT", "HYPEUSDT", ...focusSymbols, "MUUSDT", "QQQUSDT",
    "XAUTUSDT", "XAGUSDT", "GOOGLUSDT", "CLUSDT", "SPYUSDT", ...stockSymbols,
  ];
  const resolve = (overrides = {}) => resolveAllowedSymbolUniverse({
    defaultSymbols,
    stockPerps: stockSymbols,
    focusPerps: focusSymbols,
    ...overrides,
  });
  const defaultOn = resolve();
  for (const symbol of focusSymbols) assert.ok(defaultOn.includes(symbol), symbol);

  const defaultOff = resolve({ includeFocusPerps: false });
  for (const symbol of focusSymbols) assert.equal(defaultOff.includes(symbol), false, symbol);

  const explicitOff = resolve({
    configuredSymbols: "BTCUSDT,LITEUSDT,NBISUSDT,SNDKUSDT",
    includeFocusPerps: false,
    includeStockPerps: false,
  });
  assert.deepEqual(explicitOff, ["BTCUSDT"]);

  const explicitOn = resolve({
    configuredSymbols: "BTCUSDT,LITEUSDT",
    includeFocusPerps: true,
    includeStockPerps: false,
  });
  for (const symbol of ["BTCUSDT", ...focusSymbols]) assert.ok(explicitOn.includes(symbol), symbol);
  assert.equal(explicitOn.includes("SNDKUSDT"), false);
  assert.match(client, /includeFocusPerps: process\.env\.MOOX_APPROVED_FOCUS_PERPS_V720115/);
});
