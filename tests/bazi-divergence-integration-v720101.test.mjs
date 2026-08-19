import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (p) => readFileSync(resolve(root, p), "utf8");

test("intraday live engine wires asset-Bazi only as confirmed small countertrend probe", () => {
  const source = read("lib/trading-signals/three-horizon-strategy.ts");
  assert.match(source, /getMarketBaziRegimePrior/);
  assert.match(source, /BAZI_REGIME_COUNTERTREND_PROBE/);
  assert.match(source, /h4Signal\.direction === marketBaziRegime\.direction/);
  assert.match(source, /m30Signal\.direction === marketBaziRegime\.direction/);
  assert.match(source, /正式奇门方向不因此改写/);
});

test("BTC ETH forecast disagreement reduces risk but is not a trade veto", () => {
  const source = read("lib/trading-signals/three-horizon-strategy.ts");
  assert.match(source, /evaluateCryptoCrossAssetGuard/);
  assert.match(source, /riskScale: Math\.min\(evaluation\.riskScale \|\| 1, crossAssetGuard\.riskScale\)/);
  const policy = read("lib/trading-signals/crypto-cross-asset-policy.ts");
  assert.match(policy, /blockTrade: false/);
  assert.doesNotMatch(policy, /blockTrade: true/);
});

test("daily Qimen remains formal direction while market Bazi changes conviction metadata", () => {
  const source = read("lib/forecasts/qimen-first-policy.ts");
  assert.match(source, /getDailyMarketBaziRegime/);
  assert.match(source, /marketBaziAdjustment/);
  assert.match(source, /canOverrideQimen: false/);
  assert.match(source, /ASSET_BAZI_ADJUSTS_REGIME_CONVICTION_AND_TACTICAL_RISK_NOT_OFFICIAL_QIMEN_DIRECTION/);
});

test("Datou transcript is stored only as distilled forward research, not copied wholesale", () => {
  const source = read("lib/data/btc-market-bazi-20260820.ts");
  assert.match(source, /BTC-MARKET-BAZI-20260808-AUGSEP-REBOUND/);
  assert.match(source, /方向记为部分兑现、择时不记满分/);
  assert.doesNotMatch(source, /rawSource:/);
});
