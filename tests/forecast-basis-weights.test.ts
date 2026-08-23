import assert from "node:assert/strict";
import test from "node:test";
import {
  buildForecastBasisWeights,
  DEFAULT_BASIS_WEIGHTS,
  isTomorrowWaveAllowedSymbol,
  waveBasisPercentFromProximity,
} from "../lib/forecasts/basis-weights.ts";
import { normalizeTomorrowDirection } from "../lib/forecasts/tomorrow-direction.ts";

test("wave proximity steps 5 → 8 → 12 → 15 → 20", () => {
  assert.equal(waveBasisPercentFromProximity(null), 5);
  assert.equal(waveBasisPercentFromProximity(6), 5);
  assert.equal(waveBasisPercentFromProximity(5), 8);
  assert.equal(waveBasisPercentFromProximity(3), 12);
  assert.equal(waveBasisPercentFromProximity(1.5), 15);
  assert.equal(waveBasisPercentFromProximity(0.4), 20);
});

test("current six-layer basis sums to 100 and keeps Liuyao/Qimen roles separate", () => {
  const w = buildForecastBasisWeights(5);
  assert.deepEqual(w, DEFAULT_BASIS_WEIGHTS);
  assert.equal(w.technical + w.liuyao + w.cycle + w.qimen + w.macro + w.bazi, 100);
  assert.equal(w.liuyao, 30);
  assert.equal(w.qimen, 10);
});

test("SK Hynix / SanDisk symbols are not wave-linked on tomorrow page", () => {
  assert.equal(isTomorrowWaveAllowedSymbol("BTC"), true);
  assert.equal(isTomorrowWaveAllowedSymbol("GLD"), true);
  assert.equal(isTomorrowWaveAllowedSymbol("WTI"), true);
  assert.equal(isTomorrowWaveAllowedSymbol("SKHYNIX"), false);
  assert.equal(isTomorrowWaveAllowedSymbol("SNDK"), false);
});

test("normalize banned direction labels", () => {
  assert.equal(normalizeTomorrowDirection("偏多"), "震荡上涨");
  assert.equal(normalizeTomorrowDirection("观望"), "震荡");
  assert.equal(normalizeTomorrowDirection("先跌后涨"), "先跌后涨");
  assert.equal(normalizeTomorrowDirection("看涨"), "上涨");
});
