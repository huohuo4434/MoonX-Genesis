import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { GOLDEN_RABBIT_20260830_SOURCE } from "@/lib/data/qimen-school-sources-20260830";
import {
  assessDirectionalPalaceReadiness,
  assessObjectYongshenReadiness,
  combineIndependentQimenReadings,
  getQimenSchoolRegistry,
} from "@/lib/forecasts/qimen-school-separation-core";

test("public method labels hide teacher identity while admin registry preserves source family", () => {
  const registry = getQimenSchoolRegistry();
  assert.equal(registry.OBJECT_YONGSHEN.publicLabel, "对象用神流派");
  assert.equal(registry.DIRECTIONAL_PALACE.publicLabel, "定向取宫流派");
  assert.doesNotMatch(`${registry.OBJECT_YONGSHEN.publicLabel}${registry.DIRECTIONAL_PALACE.publicLabel}`, /吴|兔/);
  assert.equal(registry.OBJECT_YONGSHEN.internalSourceFamily, "WU_TEACHER");
  assert.equal(registry.DIRECTIONAL_PALACE.internalSourceFamily, "GOLDEN_RABBIT");
});
test("object-yongshen method rejects missing/invented anchors and keeps generic fallback research-only", () => {
  const missing = assessObjectYongshenReadiness({ chartComplete: true, objectInput: null });
  assert.equal(missing.readiness, "UNAVAILABLE");
  const fallback = assessObjectYongshenReadiness({
    chartComplete: true,
    objectInput: { asset: "UNKNOWN", primaryStems: ["时干"], basis: "GENERIC_FALLBACK", sourceId: "GENERIC" },
  });
  assert.equal(fallback.readiness, "RESEARCH_ONLY");
  assert.equal(fallback.eligibleForForwardScore, false);
  const explicit = assessObjectYongshenReadiness({
    chartComplete: true,
    objectInput: { asset: "GOLD", primaryStems: ["辛"], basis: "TEACHER_EXPLICIT", sourceId: "WU-GOLD" },
  });
  assert.equal(explicit.readiness, "FORWARD_READY");
  assert.equal(explicit.maySetOfficialDirection, false);
  assert.equal(explicit.mayTriggerTrade, false);
});

test("directional-palace method requires three explicit distinct pre-outcome palaces", () => {
  const incomplete = assessDirectionalPalaceReadiness({
    chartComplete: true,
    directionalInput: {
      chartId: "chart-1", sourceId: "source-1", question: "纳指下周走势",
      upPalace: 6, downPalace: 8, sidewaysPalace: null, recordedBeforeOutcome: true,
    },
  });
  assert.equal(incomplete.readiness, "UNAVAILABLE");
  const hindsight = assessDirectionalPalaceReadiness({
    chartComplete: true,
    directionalInput: {
      chartId: "chart-1", sourceId: "source-1", question: "纳指下周走势",
      upPalace: 6, downPalace: 8, sidewaysPalace: 4, recordedBeforeOutcome: false,
    },
  });
  assert.equal(hindsight.eligibleForForwardScore, false);
  const ready = assessDirectionalPalaceReadiness({
    chartComplete: true,
    directionalInput: {
      chartId: "chart-1", sourceId: "source-1", question: "纳指下周走势",
      upPalace: 6, downPalace: 8, sidewaysPalace: 4, recordedBeforeOutcome: true,
    },
  });
  assert.equal(ready.readiness, "RESEARCH_ONLY");
  assert.equal(ready.eligibleForForwardScore, true);
});

test("same-direction methods form timing resonance without creating official or trading authority", () => {
  const result = combineIndependentQimenReadings([
    { schoolId: "OBJECT_YONGSHEN", direction: "UP", confidence: 67, readiness: "FORWARD_READY", sourceId: "wu", chartId: "c1" },
    { schoolId: "DIRECTIONAL_PALACE", direction: "UP", confidence: 58, readiness: "RESEARCH_ONLY", sourceId: "rabbit", chartId: "c1" },
  ]);
  assert.equal(result.relation, "RESONANCE");
  assert.equal(result.timingBias, "UP");
  assert.equal(result.confidence, 58);
  assert.equal(result.maySetOfficialDirection, false);
  assert.equal(result.mayTriggerTrade, false);
  assert.equal(result.independence, "METHOD_DIVERSITY_ONLY_NOT_SOURCE_CONSENSUS");
});

test("method conflict waits/reduces and duplicate school input never gets extra votes", () => {
  const conflict = combineIndependentQimenReadings([
    { schoolId: "OBJECT_YONGSHEN", direction: "UP", confidence: 70, readiness: "FORWARD_READY", sourceId: "wu", chartId: "c1" },
    { schoolId: "DIRECTIONAL_PALACE", direction: "DOWN", confidence: 70, readiness: "RESEARCH_ONLY", sourceId: "rabbit", chartId: "c1" },
  ]);
  assert.equal(conflict.relation, "DIVERGENCE");
  assert.equal(conflict.timingBias, null);
  assert.equal(conflict.executionAdvice, "WAIT_OR_REDUCE");

  const duplicate = combineIndependentQimenReadings([
    { schoolId: "OBJECT_YONGSHEN", direction: "UP", confidence: 70, readiness: "FORWARD_READY", sourceId: "a", chartId: "c1" },
    { schoolId: "OBJECT_YONGSHEN", direction: "UP", confidence: 70, readiness: "FORWARD_READY", sourceId: "b", chartId: "c1" },
  ]);
  assert.equal(duplicate.relation, "UNAVAILABLE");
  assert.equal(duplicate.contributingSchools.length, 0);
});

test("the supplied transcript and six frames are hash-locked and uncertain claims stay research-only", () => {
  assert.match(GOLDEN_RABBIT_20260830_SOURCE.transcript.sha256, /^[A-F0-9]{64}$/);
  assert.equal(GOLDEN_RABBIT_20260830_SOURCE.frames.length, 6);
  assert.ok(GOLDEN_RABBIT_20260830_SOURCE.frames.every((item) => /^[A-F0-9]{64}$/.test(item.sha256)));
  const gold = GOLDEN_RABBIT_20260830_SOURCE.learnings.find((item) => item.id === "GOLD_WEEKLY_CASE_20260830");
  assert.equal(gold?.status, "CASE_NOTE_ONLY");
  assert.match(gold?.rule ?? "", /空亡处理仍存疑|不提高正式权重/);
});

test("daily Qimen disclosure separates schools and never claims directional palaces were auto-scored", () => {
  const source = readFileSync("lib/forecasts/qimen-first-policy.ts", "utf8");
  assert.match(source, /schoolMode:\s*"SEPARATE_FIRST_COMBINE_LATER"/);
  assert.match(source, /objectYongshenSchool/);
  assert.match(source, /directionalPalaceSchool/);
  assert.match(source, /RESEARCH_ONLY_REQUIRES_EXPLICIT_THREE_PALACES/);
  assert.doesNotMatch(source, /directionalPalaceSchool[^\n]*AUTO_SCORED/);
});
