import assert from "node:assert/strict";
import test from "node:test";
import {
  PUBLISHED_WEEKLY_ANALYSES_20260810,
  WEEKLY_RESEARCH_BLEND_NOTE_20260810,
  WEEKLY_SOURCE_VERIFICATION_NOTE_20260810,
} from "../lib/data/published-weekly-analysis-20260810.ts";

function sumWeights(item: (typeof PUBLISHED_WEEKLY_ANALYSES_20260810)[number]) {
  const w = item.basisWeights;
  assert.ok(w, `${item.assetId} must expose basis weights`);
  return w.technical + w.liuyao + w.cycle + w.qimen + w.macro + w.bazi;
}

test("publishes only the six markets covered by the supplied Qimen weekly source", () => {
  assert.deepEqual(
    PUBLISHED_WEEKLY_ANALYSES_20260810.map((item) => item.assetId),
    ["bitcoin", "sp500", "nasdaq-100", "shanghai-composite", "hang-seng", "gold"]
  );
  for (const item of PUBLISHED_WEEKLY_ANALYSES_20260810) {
    assert.equal(item.weekStart, "2026-08-10");
    assert.equal(item.weekEnd, "2026-08-16");
    assert.equal(item.status, "published");
    assert.equal(item.originalLocked, true);
    assert.equal(item.probabilities.up + item.probabilities.flat + item.probabilities.down, 100);
    assert.equal(sumWeights(item), 100);
  }
});

test("caps Qimen direction weight and uses a limited gold overweight", () => {
  for (const item of PUBLISHED_WEEKLY_ANALYSES_20260810) {
    assert.equal(item.basisWeights?.qimen, item.assetId === "gold" ? 20 : 15);
    assert.equal(item.basisWeights?.note?.includes("不得单独触发交易") || item.assetId === "gold", true);
  }
  const gold = PUBLISHED_WEEKLY_ANALYSES_20260810.find((item) => item.assetId === "gold");
  assert.ok(gold);
  assert.equal(gold.overallDirection, "震荡上涨");
  assert.match(gold.weeklyPath, /中枢正在上移/);
  assert.ok(gold.sourceIds?.includes("QIMEN-GOLD-HAI-20260805-VERIFIED-SOURCE-SAMPLE"));
});

test("does not invent a future branch-day signal", () => {
  for (const item of PUBLISHED_WEEKLY_ANALYSES_20260810) {
    assert.equal(item.keyDates, undefined);
  }
  assert.match(WEEKLY_SOURCE_VERIFICATION_NOTE_20260810.zh, /2026年8月5日亥日/);
  assert.match(WEEKLY_RESEARCH_BLEND_NOTE_20260810.zh, /15%方向权重/);
});

test("keeps the teacher's path distinctions instead of flattening them", () => {
  const byId = new Map(PUBLISHED_WEEKLY_ANALYSES_20260810.map((item) => [item.assetId, item]));
  assert.equal(byId.get("bitcoin")?.overallDirection, "先涨后跌");
  assert.match(byId.get("nasdaq-100")?.headline ?? "", /修复，不看全面主升/);
  assert.match(byId.get("shanghai-composite")?.weeklyPath ?? "", /轮动/);
  assert.match(byId.get("hang-seng")?.headline ?? "", /个股机会大于指数机会/);
});
