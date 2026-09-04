import type { TeacherCaseRecord, TeacherLessonRecord } from "@/lib/teacher-knowledge/types";
import type { ResearchRecord } from "@/types/research";

// Read-time source corrections only. Stored originals, scores and trading authority are unchanged.
export const ANNUAL_SOURCE_REVIEW = {
  version: "2026-09-05.v1",
  reviewedAt: "2026-09-04T22:29:40Z",
  btcSourceSha256: "5006849FE5C7F04D889B355CB33DD22893C517278A8CAEA570B90632877BBC6F",
  reason: "原文复核：BTC两个高点候选未明确排序；恒生指数不等于恒生科技。",
  btcZh: "2026年9月与2027年1月均为高点观察窗口，目前不确定两者谁更高。",
  btcEn: "September 2026 and January 2027 are both potential high windows. Their relative heights are undetermined.",
  boundaryZh: "这是月份窗口，不是具体卖出日，也不代表期间持续上涨。当前操作仍看本月、本周走势。",
  boundaryEn: "These are monthly windows, not exact sell dates or a call for an uninterrupted rally. Follow the current monthly and weekly outlook.",
} as const;

function unrankHigh(text: string): string {
  return text.replaceAll("次级高点", "高点候选").replaceAll("次級高點", "高點候選").replace(/secondary high/gi, "potential high");
}

export function correctAnnualLesson(lesson: TeacherLessonRecord): TeacherLessonRecord {
  if (lesson.id !== "seed_lesson_0009" || lesson.title !== "2026年恒生指数走势分析" || !lesson.assets.includes("HSTECH")) return lesson;
  return {
    ...lesson,
    assets: lesson.assets.map((asset) => asset === "HSTECH" ? "HSI" : asset),
    tags: lesson.tags.map((tag) => tag === "HSTECH" ? "HSI" : tag),
    adminNotes: `${lesson.adminNotes}\n${ANNUAL_SOURCE_REVIEW.version}：原资产标签HSTECH校正为HSI；原始转写及存储记录保留。`,
  };
}

export function correctAnnualCase(row: TeacherCaseRecord): TeacherCaseRecord {
  if (row.id === "seed_case_0002" && row.sourceLessonId === "seed_lesson_0009" && row.asset === "HSTECH") {
    return { ...row, asset: "HSI", validationNotes: `${row.validationNotes ?? ""}\n${ANNUAL_SOURCE_REVIEW.version}：原HSTECH标签更正为HSI（恒生指数），不适用于恒生科技或腾讯；不变更历史验证结果。` };
  }
  if (row.id === "seed_case_0007" && row.sourceLessonId === "seed_lesson_0060" && row.teacherConclusion.includes("次级高点")) {
    return { ...row, teacherConclusion: unrankHigh(row.teacherConclusion), validationNotes: `${row.validationNotes ?? ""}\n${ANNUAL_SOURCE_REVIEW.version}：原文未明确两个高点谁更高。修订前摘要：${row.teacherConclusion}` };
  }
  return row;
}

export function correctAnnualResearch(row: ResearchRecord): ResearchRecord {
  if (row.id !== "ORACLE-0009") return row;
  // Only the four explanatory fields containing the unsupported ranking are projected.
  // Numeric probabilities, dates, IDs, original source text and all authority fields stay intact.
  const original = { summary: row.summary, monthlyActivation: row.monthlyActivation, scenarios: row.scenarios, turningWindows: row.turningWindows };
  const corrected = JSON.parse(JSON.stringify(original), (_key, value: unknown) => typeof value === "string" ? unrankHigh(value) : value) as typeof original;
  if (JSON.stringify(original) === JSON.stringify(corrected)) return row;
  return {
    ...row, ...corrected,
    retrospectiveNotes: [...(row.retrospectiveNotes ?? []), {
      zhCN: `${ANNUAL_SOURCE_REVIEW.version} 原文校正：两个高点未明确排序；旧版本仍保留，不回写历史命中。`,
      zhTW: `${ANNUAL_SOURCE_REVIEW.version} 原文校正：兩個高點未明確排序；舊版本仍保留，不回寫歷史命中。`,
      en: `${ANNUAL_SOURCE_REVIEW.version}: the source does not rank the two highs; the original version and historical outcomes remain unchanged.`,
    }],
  };
}
