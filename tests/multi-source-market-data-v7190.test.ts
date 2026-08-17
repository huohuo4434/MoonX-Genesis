import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  assessMicrostructure,
  buildMicrostructureMetrics,
  parseBinanceKlines,
  parseOkxCandles,
  selectMultiSourceCandles,
} from "@/lib/market-data/multi-source-crypto-core";
import { normalizeCryptoBaseSymbol } from "@/lib/market-data/crypto-market-symbols";
import type { ChanCandle } from "@/types/chan-execution";

function candles(close: number, count = 40): ChanCandle[] {
  return Array.from({ length: count }, (_, index) => ({
    timestamp: index * 300_000,
    open: close,
    high: close * 1.001,
    low: close * 0.999,
    close,
    volume: 100 + index,
  }));
}

test("Binance parser keeps only closed valid candles", () => {
  const now = 700_000;
  const parsed = parseBinanceKlines([
    [0, "100", "102", "99", "101", "10", 299_999],
    [600_000, "101", "103", "100", "102", "12", 899_999],
  ], "5m", now);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0]?.close, 101);
});

test("OKX parser rejects the still-forming candle", () => {
  const parsed = parseOkxCandles({
    code: "0",
    data: [
      ["0", "100", "102", "99", "101", "10", "0", "0", "1"],
      ["600000", "101", "103", "100", "102", "12", "0", "0", "0"],
    ],
  }, "5m", 1_000_000);
  assert.equal(parsed.length, 1);
});

test("multi-source selector prefers healthy Binance and allows precision when prices agree", () => {
  const selected = selectMultiSourceCandles({
    symbol: "BTC",
    timeframe: "5m",
    capturedNowMs: 40 * 300_000 + 60_000,
    candidates: [
      { provider: "BINANCE_SPOT", candles: candles(100), latencyMs: 40, errorCode: null },
      { provider: "OKX_SPOT", candles: candles(100.1), latencyMs: 55, errorCode: null },
      { provider: "BITGET_FUTURES", candles: candles(99.9), latencyMs: 65, errorCode: null },
    ],
  });
  assert.equal(selected.provenance.selectedProvider, "BINANCE_SPOT");
  assert.equal(selected.provenance.quality, "GOOD");
  assert.equal(selected.provenance.precisionLevelsAllowed, true);
  assert.equal(selected.candles.length, 40);
});

test("single-source fallback remains usable but blocks precise levels", () => {
  const selected = selectMultiSourceCandles({
    symbol: "HYPE",
    timeframe: "5m",
    capturedNowMs: 40 * 300_000 + 60_000,
    candidates: [
      { provider: "BINANCE_SPOT", candles: [], latencyMs: 40, errorCode: "FAILED" },
      { provider: "OKX_SPOT", candles: [], latencyMs: 55, errorCode: "FAILED" },
      { provider: "BITGET_FUTURES", candles: candles(58), latencyMs: 65, errorCode: null },
    ],
  });
  assert.equal(selected.provenance.quality, "DEGRADED");
  assert.equal(selected.provenance.precisionLevelsAllowed, false);
  assert.equal(selected.provenance.selectedProvider, "BITGET_FUTURES");
});

test("large cross-exchange divergence blocks precise levels", () => {
  const selected = selectMultiSourceCandles({
    symbol: "BTC",
    timeframe: "5m",
    capturedNowMs: 40 * 300_000 + 60_000,
    candidates: [
      { provider: "BINANCE_SPOT", candles: candles(100), latencyMs: 40, errorCode: null },
      { provider: "OKX_SPOT", candles: candles(110), latencyMs: 55, errorCode: null },
      { provider: "BITGET_FUTURES", candles: [], latencyMs: 65, errorCode: "FAILED" },
    ],
  });
  assert.equal(selected.provenance.quality, "BLOCKED");
  assert.equal(selected.provenance.precisionLevelsAllowed, false);
});

test("microstructure can flag crowding but can never override formal direction", () => {
  const metrics = buildMicrostructureMetrics({
    spotPrice: 100,
    markPrice: 100.8,
    fundingRate: 0.0007,
    openInterestFirst: 1000,
    openInterestLast: 1040,
    longShortRatio: 2.1,
    longAccount: 0.677,
    shortAccount: 0.323,
    takerBuySellRatio: 1.12,
    priceFirst: 98,
    priceLast: 100,
  });
  const assessment = assessMicrostructure(metrics);
  assert.equal(assessment.state, "LONG_CROWDING");
  assert.equal(assessment.authority, "EXECUTION_ONLY");
  assert.equal(assessment.canOverrideFormalDirection, false);
});

test("symbol normalization does not mix HYPE, LITE or ASTEROID", () => {
  assert.equal(normalizeCryptoBaseSymbol("hypeusdt"), "HYPE");
  assert.equal(normalizeCryptoBaseSymbol("LITE"), "LITE");
  assert.equal(normalizeCryptoBaseSymbol("asteroid"), "ASTEROID");
});

test("navigation and existing Chan console are wired to the multi-source layer", async () => {
  const root = process.cwd();
  const navigation = await readFile(path.join(root, "config/navigation.ts"), "utf8");
  const marketData = await readFile(path.join(root, "lib/market-data/chan-market-data.ts"), "utf8");
  const memberPage = await readFile(path.join(root, "app/member/market-structure/page.tsx"), "utf8");
  assert.match(navigation, /\/member\/market-structure/);
  assert.match(marketData, /loadMultiSourceCryptoCandles/);
  assert.match(memberPage, /不能反向修改已锁定方向/);
  assert.match(memberPage, /autoTradingChanged|只读研究|不修改Bitget下单/);
});
