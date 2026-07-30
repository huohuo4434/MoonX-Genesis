import assert from "node:assert/strict";
import test from "node:test";
import { runTeacherAiLearning } from "../lib/teacher-learning-center/ai-learn.ts";
import { estimateDurationSec, TLC_ALLOWED_EXTS } from "../lib/teacher-learning-center/types.ts";

test("TLC allows m4a first among formats", () => {
  assert.equal(TLC_ALLOWED_EXTS[0], ".m4a");
  assert.ok(TLC_ALLOWED_EXTS.includes(".mp3"));
  assert.ok(TLC_ALLOWED_EXTS.includes(".wav"));
});

test("estimate duration for m4a", () => {
  const sec = estimateDurationSec(128_000 / 8 * 60, ".m4a"); // ~1 min at 128kbps
  assert.ok(sec >= 50 && sec <= 70);
});

test("AI learning returns rule/case buckets", async () => {
  const raw =
    "兄弟持世要看财旺。财爻弱则资金分流。美光走势看半导体。老师说上次看错是忽略月建。";
  const ai = await runTeacherAiLearning(raw);
  assert.ok(ai.courseSummary.length > 0);
  assert.ok(Array.isArray(ai.rules));
  assert.ok(Array.isArray(ai.cases));
  assert.ok(Array.isArray(ai.classicQuotes));
});
