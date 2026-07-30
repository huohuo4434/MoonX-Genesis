import assert from "node:assert/strict";
import test from "node:test";
import { organizeTeacherVoiceText } from "../lib/teacher-voice-learning/organize.ts";
import { searchTeacherKnowledge } from "../lib/teacher-voice-learning/search-core.ts";
import type { TeacherNoteRecord } from "../lib/teacher-voice-learning/types.ts";

test("organize fills required learning sections", async () => {
  const raw =
    "老师说兄弟持世要看财旺。财爻弱则资金分流。世爻旺应爻衰。伏神被飞神克要注意。美光走势这卦看半导体财爻。上次看错是因为忽略月建。";
  const organized = await organizeTeacherVoiceText(raw);
  assert.ok(organized.rules.老师核心规则);
  assert.ok(organized.rules.六亲判断 || organized.rules.兄弟 || organized.rules.财爻);
  assert.ok(organized.rules.世应判断 || organized.rules.世爻);
  assert.ok(organized.rules.财爻判断 || organized.rules.财爻);
  assert.ok(organized.rules.旺衰判断 || organized.rules.旺衰);
  assert.ok(organized.rules.错误复盘);
  assert.ok(organized.markdown.includes("【案例分析】"));
  assert.ok(organized.markdown.includes("【错误复盘】"));
  assert.ok(Array.isArray(organized.knowledge));
  assert.ok(organized.keywords.length >= 1);
});

test("search prioritizes teacher cases for 美光走势", () => {
  const notes: TeacherNoteRecord[] = [
    {
      id: "n1",
      sourceAudio: "a.mp3",
      rawText: "美光走势看半导体财爻，兄弟持世需看资金",
      summary: "美光案例",
      rules: {
        老师核心规则: "兄弟持世看财旺",
        财爻判断: "财爻弱则资金分流",
        六亲判断: "兄弟持世",
      },
      cases: [
        {
          question: "美光走势",
          hexagram: "火天大有",
          teacherJudgment: "短期震荡偏弱",
          actualResult: "下跌",
        },
      ],
      knowledge: [
        {
          category: "老师核心规则",
          topic: "财爻判断",
          rule: "财爻弱则资金分流",
          example: "美光",
          keywords: ["美光", "半导体", "财爻"],
        },
      ],
      keywords: ["美光", "半导体", "财爻", "兄弟持世"],
      status: "READY",
      progress: 100,
      errorMessage: null,
      createdTime: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  const hits = searchTeacherKnowledge(notes, "美光走势", { limit: 5 });
  assert.equal(hits.length, 1);
  assert.ok(hits[0].matchedKeywords.some((k) => k.includes("美光") || k.includes("半导体")));
  assert.equal(hits[0].cases[0]?.question, "美光走势");
});
