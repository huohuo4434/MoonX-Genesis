import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const client = fs.readFileSync("lib/bitget/demo-client.ts", "utf8");
const adminPage = fs.readFileSync("app/admin/bitget-demo/page.tsx", "utf8");
const memberPage = fs.readFileSync("components/member/AiTradingDeskClient.tsx", "utf8");

test("formal live allow-list contains the 12 approved instruments", () => {
  const match = client.match(/DEFAULT_LIVE_EXPERIMENT_SYMBOLS[^=]*=\s*\[([\s\S]*?)\];/);
  assert.ok(match, "formal live symbol array missing");
  const symbols = [...match[1].matchAll(/"([A-Z0-9]+USDT)"/g)].map((m) => m[1]);
  assert.deepEqual(symbols, [
    "BTCUSDT", "ETHUSDT", "HYPEUSDT", "MUUSDT", "QQQUSDT", "XAUTUSDT",
    "XAGUSDT", "GOOGLUSDT", "CLUSDT", "SPYUSDT", "SNDKUSDT", "MSFTUSDT",
  ]);
});

test("admin and member copy use 12-allow-list plus dynamic Top10 wording", () => {
  assert.match(adminPage, /\{allowedCount\}个正式允许USDT合约品种/);
  assert.match(adminPage, /动态Top10进入候选排序/);
  assert.match(memberPage, /正式允许池共12个品种全部扫描，动态Top10进入候选排序/);
  assert.match(memberPage, /12 allowed instruments[\s\S]*dynamic Top 10/i);
});
