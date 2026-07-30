import "server-only";

import { addLearningFeedback, listLearningFeedback } from "@/lib/teacher-voice-learning/store";

/** After a prediction settles — record outcome and auto review note. */
export async function recordTeacherLearningFeedback(input: {
  teacherNoteId?: string | null;
  assetId?: string | null;
  query?: string | null;
  prediction: string;
  actual: string;
  correct: boolean;
}): Promise<{ id: string; reviewNote: string }> {
  const reviewNote = [
    `预测：${input.prediction}`,
    `实际：${input.actual}`,
    input.correct ? "正确：是" : "错误：是",
    input.correct
      ? "复盘：老师知识路径有效，可提高相关关键词权重。"
      : "复盘：需回看卦象条件（月建/日辰/伏神例外），补充例外规则。",
  ].join("\n");

  const row = await addLearningFeedback({
    teacherNoteId: input.teacherNoteId ?? null,
    assetId: input.assetId ?? null,
    query: input.query ?? null,
    prediction: input.prediction,
    actual: input.actual,
    correct: input.correct,
    reviewNote,
  });

  return { id: row.id, reviewNote };
}

export async function getTeacherLearningAccuracy(): Promise<{
  total: number;
  correct: number;
  wrong: number;
  accuracy: number | null;
}> {
  const rows = await listLearningFeedback();
  const total = rows.length;
  const correct = rows.filter((r) => r.correct).length;
  const wrong = total - correct;
  return {
    total,
    correct,
    wrong,
    accuracy: total === 0 ? null : correct / total,
  };
}
