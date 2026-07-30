import assert from "node:assert/strict";
import test from "node:test";
import { buildCleanTranscript } from "../lib/master-intelligence/transcript.ts";
import { extractKnowledgeHeuristic } from "../lib/master-intelligence/extract.ts";
import { detectRuleConflicts } from "../lib/master-intelligence/conflict.ts";
import { detectVoiceSignals } from "../lib/master-intelligence/voice.ts";
import { KNOWLEDGE_WEIGHT_STARS } from "../lib/master-intelligence/types.ts";

test("clean transcript does not invent content and strips fillers", () => {
  const raw = "嗯这个兄弟持世啊那个财伏藏";
  const clean = buildCleanTranscript(raw);
  assert.equal(clean.includes("嗯"), false);
  assert.equal(clean.includes("兄弟持世"), true);
  assert.equal(clean.includes("财伏藏"), true);
});

test("heuristic extraction splits rules and cases", () => {
  const bundle = extractKnowledgeHeuristic(
    "规则：投资预测先定用神。记住兄弟持世要看财旺。\n\n案例例如黄金2026预测上涨，老师判断年底见高低点。"
  );
  assert.ok(bundle.rules.length + bundle.cases.length + bundle.concepts.length >= 1);
  assert.ok(bundle.summary.length > 0);
});

test("conflict engine flags opposing motifs", () => {
  const hits = detectRuleConflicts([
    { id: "a", text: "兄弟持世看涨上涨" },
    { id: "b", text: "兄弟持世偏空下跌" },
  ]);
  assert.ok(hits.length >= 1);
  assert.equal(hits[0]?.motif, "兄弟持世");
});

test("teacher voice patterns", () => {
  const hits = detectVoiceSignals("这卦不用看了，重点看财伏藏");
  assert.ok(hits.some((h) => h.phrase === "不用看了"));
  assert.ok(hits.some((h) => h.phrase === "重点看"));
});

test("knowledge weights prefer teacher", () => {
  assert.equal(KNOWLEDGE_WEIGHT_STARS.TEACHER, 5);
  assert.ok(KNOWLEDGE_WEIGHT_STARS.TEACHER > KNOWLEDGE_WEIGHT_STARS.WEB);
});
