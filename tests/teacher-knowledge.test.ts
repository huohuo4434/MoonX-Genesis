import assert from "node:assert/strict";
import test from "node:test";
import { extractTeacherKnowledge } from "../lib/teacher-knowledge/extract.ts";

test("extract keeps draft-only heuristic rules with source quotes", async () => {
  const raw = "兄弟持世要看财旺。财爻弱则资金分流。美光走势看半导体。可能还要再看月建。";
  const out = await extractTeacherKnowledge(raw);
  assert.ok(out.summary.length > 0);
  assert.ok(out.rules.length >= 1);
  assert.ok(out.rules.every((r) => r.sourceQuote && r.sourceQuote.length > 0));
  assert.ok(out.methods.some((m) => m.steps.length >= 5));
});
