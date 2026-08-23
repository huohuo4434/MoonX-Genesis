import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (p) => readFileSync(resolve(root, p), "utf8");

test("intraday live engine records asset-Bazi conflict but never reverses the official side", () => {
  const source = read("lib/trading-signals/three-horizon-strategy.ts");
  const authority = read("lib/trading-signals/intraday-direction-authority-core.ts");
  assert.match(source, /getMarketBaziRegimePrior/);
  assert.match(authority, /AUXILIARY_DIRECTION_CONFLICT/);
  assert.match(source, /applyAuxiliaryDirectionConflictGuard\(baseResult, baziCountertrend\)/);
  assert.doesNotMatch(source, /BAZI_REGIME_COUNTERTREND_PROBE/);
  assert.match(source, /h4Signal\.direction === marketBaziRegime\.direction/);
  assert.match(source, /m30Signal\.direction === marketBaziRegime\.direction/);
  assert.match(authority, /辅助先验只能降级或阻止入场，不能反向覆盖正式方向/);
  assert.match(authority, /ready: false[\s\S]*executionTier: "OBSERVE"[\s\S]*riskScale: 0/);
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
