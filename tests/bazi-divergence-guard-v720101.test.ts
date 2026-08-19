import test from "node:test";
import assert from "node:assert/strict";
import { getMarketBaziRegimePrior, getDailyMarketBaziRegime } from "../lib/trading-signals/market-bazi-regime";
import { evaluateCryptoCrossAssetGuard } from "../lib/trading-signals/crypto-cross-asset-policy";

test("BTC asset-Bazi is a capped Aug-Sep rebound prior, not a Qimen override", () => {
  const prior = getMarketBaziRegimePrior("BTCUSDT", "INTRADAY", new Date("2026-08-20T00:00:00Z"));
  assert.ok(prior);
  assert.equal(prior.direction, "LONG");
  assert.equal(prior.weightPct, 8);
  assert.equal(prior.canFlipOfficialQimenDirectionAlone, false);
  assert.ok(prior.countertrendRiskScale <= 0.35);

  const daily = getDailyMarketBaziRegime("BTC", "2026-08-20");
  assert.ok(daily);
  assert.equal(daily.direction, "UP");
  assert.equal(daily.canOverrideQimen, false);
});

test("BTC asset-Bazi prior changes with the explicit October pullback window", () => {
  const prior = getMarketBaziRegimePrior("BTCUSDT", "SWING", new Date("2026-10-15T00:00:00Z"));
  assert.ok(prior);
  assert.equal(prior.direction, "SHORT");
  assert.equal(prior.weightPct, 12);
});

test("asset-Bazi prior is not fabricated for ETH", () => {
  assert.equal(getMarketBaziRegimePrior("ETHUSDT", "INTRADAY", new Date("2026-08-20T00:00:00Z")), null);
});

test("BTC/ETH disagreement never vetoes the independently valid asset trade", () => {
  const guard = evaluateCryptoCrossAssetGuard({
    symbol: "ETHUSDT",
    selfDirection: "LONG",
    peerDirection: "SHORT",
    selfEntryConfirmed: true,
  });
  assert.equal(guard.divergent, true);
  assert.equal(guard.blockTrade, false);
  assert.equal(guard.riskScale, 0.65);
});

test("BTC/ETH same direction does not reduce size", () => {
  const guard = evaluateCryptoCrossAssetGuard({
    symbol: "BTCUSDT",
    selfDirection: "LONG",
    peerDirection: "LONG",
    selfEntryConfirmed: true,
  });
  assert.equal(guard.divergent, false);
  assert.equal(guard.riskScale, 1);
});
