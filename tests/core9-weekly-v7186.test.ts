import test from "node:test";
import assert from "node:assert/strict";

import { PUBLISHED_WEEKLY_ANALYSES_20260817 } from "@/lib/data/published-weekly-analysis-20260817";
import {
  buildWeeklyMarketSlots,
  buildWeeklyPublicSummary,
} from "@/lib/data/weekly-analysis";

const expectedDirections: Record<string, string> = {
  bitcoin: "震荡下跌",
  eth: "震荡上涨",
  sp500: "震荡下跌",
  "nasdaq-100": "下跌",
  "shanghai-composite": "探底回升",
  "hang-seng": "探底回升",
  gold: "震荡下跌",
  silver: "震荡上涨",
  "wti-crude": "下跌",
};

test("v7.18.6 publishes exactly nine locked core-market records", () => {
  assert.equal(PUBLISHED_WEEKLY_ANALYSES_20260817.length, 9);
  assert.equal(new Set(PUBLISHED_WEEKLY_ANALYSES_20260817.map((r) => r.assetId)).size, 9);
  assert.equal(new Set(PUBLISHED_WEEKLY_ANALYSES_20260817.map((r) => r.id)).size, 9);

  for (const record of PUBLISHED_WEEKLY_ANALYSES_20260817) {
    assert.equal(record.weekStart, "2026-08-17");
    assert.equal(record.weekEnd, "2026-08-23");
    assert.equal(record.status, "published");
    assert.equal(record.visibility, "member");
    assert.equal(record.originalLocked, true);
    assert.equal(record.overallDirection, expectedDirections[record.assetId]);
    assert.equal(
      record.probabilities.up + record.probabilities.flat + record.probabilities.down,
      100,
    );
    assert.equal(record.basisWeights?.technical, 0);
    assert.ok((record.basisWeights?.liuyao ?? 0) > 0);
    assert.ok(record.basisWeights?.note?.includes("老师01"));
    assert.ok(record.basisWeights?.note?.includes("老师02"));
    assert.deepEqual(record.keySupport, []);
    assert.deepEqual(record.keyResistance, []);
  }
});

test("v7.18.6 target window renders all nine member slots as published", () => {
  // Sunday 16 Aug 2026 in Beijing: weekly display must switch to 17–23 Aug.
  const now = new Date("2026-08-16T10:40:00.000Z");
  const slots = buildWeeklyMarketSlots(now);
  const summary = buildWeeklyPublicSummary(now);

  assert.equal(slots.length, 9);
  assert.ok(slots.every((slot) => slot.kind === "published"));
  assert.equal(summary.weekStart, "2026-08-17");
  assert.equal(summary.weekEnd, "2026-08-23");
  assert.equal(summary.publishedCount, 9);
  assert.equal(summary.coverageCount, 9);
  assert.ok(summary.teasers.every((item) => item.isReady));
  assert.match(summary.researchBlendNoteZh ?? "", /原始周卦/);
  assert.match(summary.sourceVerificationNoteZh ?? "", /不重新起卦/);
});

test("v7.18.6 preserves original hexagram evidence and crypto divergence", () => {
  const text = PUBLISHED_WEEKLY_ANALYSES_20260817
    .map((record) => `${record.assetId}:${record.basisWeights?.note ?? ""}`)
    .join("\n");

  for (const evidence of [
    "泽水困（六合）→水风井",
    "山雷颐（游魂）→风雷益",
    "兑为泽（六冲静卦）",
    "地火明夷（游魂）→泽火革",
    "泽山咸→水火既济",
    "风水涣→坎为水（六冲）",
    "风泽中孚（游魂）→风地观",
    "震为雷（六冲）→雷天大壮（六冲）",
    "地火明夷（游魂）→山火贲（六合）",
  ]) {
    assert.ok(text.includes(evidence), evidence);
  }

  assert.equal(expectedDirections.bitcoin, "震荡下跌");
  assert.equal(expectedDirections.eth, "震荡上涨");
});
