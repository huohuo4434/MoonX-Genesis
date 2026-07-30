import "server-only";

import {
  createLesson,
  createRuleDraft,
  getStoreSnapshot,
  listCases,
  listConcepts,
  listConflicts,
  listLessons,
  listMethods,
  listQuotes,
  listRules,
  replaceStoreSnapshot,
  newId,
  nextCode,
} from "@/lib/teacher-knowledge/store";

export type ImportPreview = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  counts: {
    lessons: number;
    rules: number;
    cases: number;
    concepts: number;
    quotes: number;
    methods: number;
  };
  payload: ImportPayload;
};

export type ImportPayload = {
  lesson?: {
    title: string;
    teacherName?: string;
    courseSeries?: string;
    lessonNumber?: string;
    rawTranscript: string;
    assets?: string[];
    timeframes?: string[];
    tags?: string[];
    sourceType?: string;
  };
  lessons?: Array<ImportPayload["lesson"]>;
  rules?: Array<{
    title: string;
    conclusion: string;
    sourceQuote: string;
    ruleCode?: string;
    category?: string;
  }>;
  cases?: Array<{
    title: string;
    teacherConclusion: string;
    sourceQuote: string;
    asset?: string;
    question?: string;
    caseCode?: string;
  }>;
  concepts?: Array<{ name: string; definition: string; sourceQuote: string }>;
  quotes?: Array<{ quote: string; meaning?: string; toneType?: string }>;
  methods?: Array<{ title: string; steps: string[]; sourceQuote?: string }>;
};

export function previewImport(raw: string, format: "json" | "markdown" | "text"): ImportPreview {
  const errors: string[] = [];
  const warnings: string[] = [];
  let payload: ImportPayload = {};

  try {
    if (format === "json") {
      payload = JSON.parse(raw) as ImportPayload;
    } else if (format === "markdown") {
      payload = {
        lesson: {
          title: "Markdown导入课程",
          rawTranscript: raw,
          sourceType: "OTHER",
        },
      };
      warnings.push("Markdown 作为整课原文导入，规则需再跑 AI 整理");
    } else {
      payload = {
        lesson: {
          title: "文字导入课程",
          rawTranscript: raw,
          sourceType: "MANUAL_NOTE",
        },
      };
    }
  } catch {
    errors.push("JSON 解析失败");
    return { ok: false, errors, warnings, counts: zero(), payload: {} };
  }

  const lessons = [
    ...(payload.lesson ? [payload.lesson] : []),
    ...(payload.lessons || []),
  ].filter(Boolean) as NonNullable<ImportPayload["lesson"]>[];

  for (const l of lessons) {
    if (!l?.rawTranscript?.trim()) errors.push("课程缺少 rawTranscript / 原文");
    if (!l?.title?.trim()) warnings.push("课程缺少标题，将使用默认标题");
  }
  for (const r of payload.rules || []) {
    if (!r.sourceQuote?.trim()) errors.push(`规则「${r.title}」缺少来源原文`);
    if (r.ruleCode && !/^MR-\d{4}$/.test(r.ruleCode)) warnings.push(`规则编号格式异常：${r.ruleCode}`);
  }
  for (const c of payload.cases || []) {
    if (!c.sourceQuote?.trim()) errors.push(`案例「${c.title}」缺少来源原文`);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    counts: {
      lessons: lessons.length,
      rules: payload.rules?.length || 0,
      cases: payload.cases?.length || 0,
      concepts: payload.concepts?.length || 0,
      quotes: payload.quotes?.length || 0,
      methods: payload.methods?.length || 0,
    },
    payload,
  };
}

function zero() {
  return { lessons: 0, rules: 0, cases: 0, concepts: 0, quotes: 0, methods: 0 };
}

/** Import as DRAFT only. */
export async function commitImport(payload: ImportPayload, createdBy?: string | null) {
  const lessons = [
    ...(payload.lesson ? [payload.lesson] : []),
    ...(payload.lessons || []),
  ].filter(Boolean) as NonNullable<ImportPayload["lesson"]>[];

  let lessonId: string | null = null;
  for (const l of lessons) {
    const created = await createLesson({
      title: l!.title || "导入课程",
      teacherName: l!.teacherName,
      courseSeries: l!.courseSeries,
      lessonNumber: l!.lessonNumber,
      rawTranscript: l!.rawTranscript,
      assets: l!.assets,
      timeframes: l!.timeframes,
      tags: l!.tags,
      sourceType: (l!.sourceType as "MANUAL_NOTE") || "MANUAL_NOTE",
      createdBy,
    });
    lessonId = created.id;
  }

  for (const r of payload.rules || []) {
    await createRuleDraft({
      title: r.title,
      conclusion: r.conclusion,
      sourceQuote: r.sourceQuote,
      category: r.category || "OTHER",
      sourceLessonId: lessonId,
      status: "DRAFT",
    });
  }

  // cases/concepts/quotes/methods via extract save path — store helpers are private for cases
  // Re-use createRuleDraft pattern: write through replaceStore for remaining kinds quickly
  const store = getStoreSnapshot();
  const now = new Date().toISOString();
  for (const c of payload.cases || []) {
    store.cases.unshift({
      id: newId("tkc"),
      caseCode: c.caseCode && /^MC-\d{4}$/.test(c.caseCode) ? c.caseCode : await nextCode("case"),
      title: c.title,
      asset: c.asset || "",
      question: c.question || "",
      predictionStart: null,
      predictionEnd: null,
      mainHexagram: null,
      changedHexagram: null,
      movingLines: null,
      useGod: null,
      shiLine: null,
      yingLine: null,
      monthBranch: null,
      dayBranch: null,
      sixRelationsStructure: null,
      hiddenFlyingStructure: null,
      teacherConclusion: c.teacherConclusion,
      predictedPath: "",
      timingWindows: [],
      sourceLessonId: lessonId,
      sourceQuote: c.sourceQuote,
      actualResult: null,
      validationStatus: "PENDING",
      validationNotes: "导入草稿，卦象字段需管理员核对",
      status: "DRAFT",
      needsAdminFill: ["mainHexagram", "changedHexagram", "movingLines", "monthBranch", "dayBranch"],
      createdAt: now,
      updatedAt: now,
    });
  }
  for (const c of payload.concepts || []) {
    store.concepts.unshift({
      id: newId("tkcon"),
      name: c.name,
      definition: c.definition,
      conditions: [],
      sourceLessonId: lessonId,
      sourceQuote: c.sourceQuote,
      status: "DRAFT",
      createdAt: now,
      updatedAt: now,
    });
  }
  for (const q of payload.quotes || []) {
    store.quotes.unshift({
      id: newId("tkq"),
      quote: q.quote,
      meaning: q.meaning || "",
      toneType: q.toneType || "NORMAL",
      sourceLessonId: lessonId,
      textPosition: null,
      status: "DRAFT",
      createdAt: now,
      updatedAt: now,
    });
  }
  for (const m of payload.methods || []) {
    store.methods.unshift({
      id: newId("tkm"),
      title: m.title,
      steps: m.steps,
      conditions: [],
      exceptions: [],
      sourceLessonId: lessonId,
      sourceQuote: m.sourceQuote || "",
      status: "DRAFT",
      createdAt: now,
      updatedAt: now,
    });
  }
  replaceStoreSnapshot(store);
  return { lessonId, status: "DRAFT" as const };
}

export async function exportFullBackup() {
  const [lessons, rules, cases, concepts, quotes, methods, conflicts] = await Promise.all([
    listLessons(),
    listRules(),
    listCases(),
    listConcepts(),
    listQuotes(),
    listMethods(),
    listConflicts(),
  ]);
  const snap = getStoreSnapshot();
  return {
    exportedAt: new Date().toISOString(),
    type: "moonx-teacher-knowledge-full",
    lessons,
    versions: snap.versions,
    rules,
    cases,
    concepts,
    quotes,
    methods,
    conflicts,
  };
}

export async function exportAiPackJson() {
  const [rules, cases, methods] = await Promise.all([
    listRules({ status: "APPROVED" }),
    listCases({ status: "APPROVED" }),
    listMethods({ status: "APPROVED" }),
  ]);
  const lessons = await listLessons();
  const codeMap = new Map(lessons.map((l) => [l.id, l.lessonCode]));
  return {
    exportedAt: new Date().toISOString(),
    type: "moonx-teacher-knowledge-ai",
    rules: rules.map((r) => ({
      ruleCode: r.ruleCode,
      title: r.title,
      category: r.category,
      conditions: r.conditions,
      conclusion: r.conclusion,
      exceptions: r.exceptions,
      sourceLessonCode: r.sourceLessonId ? codeMap.get(r.sourceLessonId) : null,
      sourceQuote: r.sourceQuote,
      updatedAt: r.updatedAt,
    })),
    cases: cases.map((c) => ({
      caseCode: c.caseCode,
      title: c.title,
      asset: c.asset,
      question: c.question,
      teacherConclusion: c.teacherConclusion,
      sourceLessonCode: c.sourceLessonId ? codeMap.get(c.sourceLessonId) : null,
      sourceQuote: c.sourceQuote,
      updatedAt: c.updatedAt,
    })),
    methods: methods.map((m) => ({
      title: m.title,
      steps: m.steps,
      exceptions: m.exceptions,
      sourceLessonCode: m.sourceLessonId ? codeMap.get(m.sourceLessonId) : null,
      updatedAt: m.updatedAt,
    })),
  };
}

export async function exportAiPackMarkdown(): Promise<string> {
  const pack = await exportAiPackJson();
  const lines: string[] = [
    "# MoonX 老师投资六爻知识包（正式审核版）",
    "",
    `导出时间：${pack.exportedAt}`,
    "",
    "本文件为网站正式母库的只读镜像。编号唯一。勿依据未编号口头内容覆盖本文件。",
    "",
    "## 正式规则",
    "",
  ];
  for (const r of pack.rules) {
    lines.push(`### ${r.ruleCode} ${r.title}`);
    lines.push(`- 分类：${r.category}`);
    lines.push(`- 结论：${r.conclusion}`);
    lines.push(`- 条件：${(r.conditions || []).join("；") || "—"}`);
    lines.push(`- 例外：${(r.exceptions || []).join("；") || "—"}`);
    lines.push(`- 来源课程：${r.sourceLessonCode || "—"}`);
    lines.push(`- 老师原话：${r.sourceQuote}`);
    lines.push(`- 更新：${r.updatedAt}`);
    lines.push("");
  }
  lines.push("## 正式案例", "");
  for (const c of pack.cases) {
    lines.push(`### ${c.caseCode} ${c.title}`);
    lines.push(`- 资产：${c.asset}`);
    lines.push(`- 问题：${c.question}`);
    lines.push(`- 老师结论：${c.teacherConclusion}`);
    lines.push(`- 来源课程：${c.sourceLessonCode || "—"}`);
    lines.push(`- 老师原话：${c.sourceQuote}`);
    lines.push("");
  }
  lines.push("## 正式分析流程", "");
  for (const m of pack.methods) {
    lines.push(`### ${m.title}`);
    m.steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
    lines.push("");
  }
  return lines.join("\n");
}
