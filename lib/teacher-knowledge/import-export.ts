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
  updateLessonWithVersion,
} from "@/lib/teacher-knowledge/store";
import type {
  LessonSourceType,
  RuleCategory,
  TeacherCaseRecord,
  TeacherLessonRecord,
} from "@/lib/teacher-knowledge/types";

export type ImportLesson = {
  /** Stable key used by rules/cases to point to the correct lesson in a batch import. */
  ref?: string;
  title: string;
  teacherName?: string;
  courseSeries?: string;
  lessonNumber?: string;
  lessonDate?: string | null;
  originalFileName?: string | null;
  rawTranscript: string;
  cleanedTranscript?: string;
  summary?: string;
  adminNotes?: string;
  assets?: string[];
  timeframes?: string[];
  tags?: string[];
  sourceType?: LessonSourceType | string;
};

export type ImportRule = {
  sourceLessonRef?: string;
  title: string;
  conclusion: string;
  sourceQuote: string;
  ruleCode?: string;
  category?: RuleCategory | string;
  conditions?: string[];
  analysisSteps?: string[];
  exceptions?: string[];
  applicableAssets?: string[];
  applicableTimeframes?: string[];
  keywords?: string[];
  priority?: number;
  confidence?: number;
};

export type ImportCase = {
  sourceLessonRef?: string;
  title: string;
  teacherConclusion: string;
  sourceQuote: string;
  asset?: string;
  question?: string;
  caseCode?: string;
  predictionStart?: string | null;
  predictionEnd?: string | null;
  mainHexagram?: string | null;
  changedHexagram?: string | null;
  movingLines?: string | null;
  useGod?: string | null;
  shiLine?: string | null;
  yingLine?: string | null;
  monthBranch?: string | null;
  dayBranch?: string | null;
  sixRelationsStructure?: Record<string, unknown> | null;
  hiddenFlyingStructure?: Record<string, unknown> | null;
  predictedPath?: string;
  timingWindows?: string[];
  validationNotes?: string | null;
  needsAdminFill?: string[];
};

export type ImportPayload = {
  schemaVersion?: string;
  batchName?: string;
  lesson?: ImportLesson;
  lessons?: ImportLesson[];
  rules?: ImportRule[];
  cases?: ImportCase[];
  concepts?: Array<{
    sourceLessonRef?: string;
    name: string;
    definition: string;
    sourceQuote: string;
    conditions?: string[];
  }>;
  quotes?: Array<{
    sourceLessonRef?: string;
    quote: string;
    meaning?: string;
    toneType?: string;
    textPosition?: number | null;
  }>;
  methods?: Array<{
    sourceLessonRef?: string;
    title: string;
    steps: string[];
    sourceQuote?: string;
    conditions?: string[];
    exceptions?: string[];
  }>;
};

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

const SOURCE_TYPES = new Set<LessonSourceType>([
  "AUDIO_TRANSCRIPT",
  "VIDEO_TRANSCRIPT",
  "MANUAL_NOTE",
  "IMAGE_TRANSCRIPT",
  "OTHER",
]);

function normalizeSourceType(value?: string): LessonSourceType {
  return SOURCE_TYPES.has(value as LessonSourceType) ? (value as LessonSourceType) : "MANUAL_NOTE";
}

function zero() {
  return { lessons: 0, rules: 0, cases: 0, concepts: 0, quotes: 0, methods: 0 };
}

function allLessons(payload: ImportPayload): ImportLesson[] {
  return [...(payload.lesson ? [payload.lesson] : []), ...(payload.lessons || [])].filter(Boolean);
}

function validateSourceRef(
  entityLabel: string,
  ref: string | undefined,
  lessonRefs: Set<string>,
  lessonCount: number,
  errors: string[]
) {
  if (ref && !lessonRefs.has(ref)) {
    errors.push(`${entityLabel}引用了不存在的 sourceLessonRef：${ref}`);
  } else if (!ref && lessonCount > 1) {
    errors.push(`${entityLabel}处于多课程批次，但缺少 sourceLessonRef，无法可靠绑定来源课程`);
  }
}

function validateExactSourceQuote(input: {
  entityLabel: string;
  sourceQuote: string | undefined;
  sourceLessonRef: string | undefined;
  lessonRawByRef: Map<string, string>;
  lessons: ImportLesson[];
  errors: string[];
}) {
  const quote = input.sourceQuote?.trim();
  if (!quote) return;
  const raw = input.sourceLessonRef
    ? input.lessonRawByRef.get(input.sourceLessonRef)
    : input.lessons.length === 1
      ? input.lessons[0]!.rawTranscript
      : undefined;
  if (raw !== undefined && !raw.includes(quote)) {
    input.errors.push(`${input.entityLabel}的来源原文不是课程原文中的逐字片段，禁止导入`);
  }
}

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
          ref: "lesson-1",
          title: "Markdown导入课程",
          rawTranscript: raw,
          sourceType: "OTHER",
        },
      };
      warnings.push("Markdown作为整课原文导入，规则需再整理并由管理员审核");
    } else {
      payload = {
        lesson: {
          ref: "lesson-1",
          title: "文字导入课程",
          rawTranscript: raw,
          sourceType: "MANUAL_NOTE",
        },
      };
    }
  } catch {
    errors.push("JSON解析失败");
    return { ok: false, errors, warnings, counts: zero(), payload: {} };
  }

  const lessons = allLessons(payload);
  const lessonRefs = new Set<string>();
  const lessonRawByRef = new Map<string, string>();

  lessons.forEach((lesson, index) => {
    if (!lesson.rawTranscript?.trim()) errors.push(`第${index + 1}节课程缺少 rawTranscript / 原文`);
    if (!lesson.title?.trim()) warnings.push(`第${index + 1}节课程缺少标题，将使用默认标题`);
    const ref = lesson.ref?.trim();
    if (ref) {
      if (lessonRefs.has(ref)) errors.push(`课程ref重复：${ref}`);
      lessonRefs.add(ref);
      lessonRawByRef.set(ref, lesson.rawTranscript || "");
    } else if (lessons.length > 1) {
      errors.push(`第${index + 1}节课程缺少ref；多课程导入必须为每节课设置唯一ref`);
    }
  });

  for (const rule of payload.rules || []) {
    if (!rule.sourceQuote?.trim()) errors.push(`规则「${rule.title}」缺少来源原文`);
    if (rule.ruleCode && !/^MR-\d{4}$/.test(rule.ruleCode)) warnings.push(`规则编号格式异常：${rule.ruleCode}`);
    validateSourceRef(`规则「${rule.title}」`, rule.sourceLessonRef, lessonRefs, lessons.length, errors);
    validateExactSourceQuote({ entityLabel: `规则「${rule.title}」`, sourceQuote: rule.sourceQuote, sourceLessonRef: rule.sourceLessonRef, lessonRawByRef, lessons, errors });
  }
  for (const item of payload.cases || []) {
    if (!item.sourceQuote?.trim()) errors.push(`案例「${item.title}」缺少来源原文`);
    if (item.caseCode && !/^MC-\d{4}$/.test(item.caseCode)) warnings.push(`案例编号格式异常：${item.caseCode}`);
    validateSourceRef(`案例「${item.title}」`, item.sourceLessonRef, lessonRefs, lessons.length, errors);
    validateExactSourceQuote({ entityLabel: `案例「${item.title}」`, sourceQuote: item.sourceQuote, sourceLessonRef: item.sourceLessonRef, lessonRawByRef, lessons, errors });
  }
  for (const item of payload.concepts || []) {
    if (!item.sourceQuote?.trim()) errors.push(`概念「${item.name}」缺少来源原文`);
    validateSourceRef(`概念「${item.name}」`, item.sourceLessonRef, lessonRefs, lessons.length, errors);
    validateExactSourceQuote({ entityLabel: `概念「${item.name}」`, sourceQuote: item.sourceQuote, sourceLessonRef: item.sourceLessonRef, lessonRawByRef, lessons, errors });
  }
  for (const item of payload.quotes || []) {
    if (!item.quote?.trim()) errors.push("经典原话存在空文本");
    validateSourceRef(`原话「${item.quote?.slice(0, 18) || "空"}」`, item.sourceLessonRef, lessonRefs, lessons.length, errors);
    validateExactSourceQuote({ entityLabel: `原话「${item.quote?.slice(0, 18) || "空"}」`, sourceQuote: item.quote, sourceLessonRef: item.sourceLessonRef, lessonRawByRef, lessons, errors });
  }
  for (const item of payload.methods || []) {
    if (!item.steps?.length) errors.push(`方法「${item.title}」缺少步骤`);
    validateSourceRef(`方法「${item.title}」`, item.sourceLessonRef, lessonRefs, lessons.length, errors);
    if (item.sourceQuote) validateExactSourceQuote({ entityLabel: `方法「${item.title}」`, sourceQuote: item.sourceQuote, sourceLessonRef: item.sourceLessonRef, lessonRawByRef, lessons, errors });
  }

  if (!lessons.length && (payload.rules?.length || payload.cases?.length || payload.methods?.length)) {
    warnings.push("本批次没有课程原文；知识条目将无法追溯到具体课程");
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

function resolveLessonId(
  ref: string | undefined,
  refMap: Map<string, string>,
  createdLessons: TeacherLessonRecord[]
): string | null {
  if (ref) return refMap.get(ref) ?? null;
  return createdLessons.length === 1 ? createdLessons[0]!.id : null;
}

/** Import as DRAFT only. Every entity remains subject to admin review. */
export async function commitImport(payload: ImportPayload, createdBy?: string | null) {
  const preview = previewImport(JSON.stringify(payload), "json");
  if (!preview.ok) throw new Error(preview.errors.join("；"));

  const lessons = allLessons(payload);
  const refMap = new Map<string, string>();
  const createdLessons: TeacherLessonRecord[] = [];

  for (const lesson of lessons) {
    const created = await createLesson({
      title: lesson.title || "导入课程",
      teacherName: lesson.teacherName,
      courseSeries: lesson.courseSeries,
      lessonNumber: lesson.lessonNumber,
      lessonDate: lesson.lessonDate,
      originalFileName: lesson.originalFileName,
      rawTranscript: lesson.rawTranscript,
      assets: lesson.assets,
      timeframes: lesson.timeframes,
      tags: lesson.tags,
      sourceType: normalizeSourceType(lesson.sourceType),
      adminNotes: lesson.adminNotes,
      createdBy,
    });

    let finalLesson = created;
    if (lesson.cleanedTranscript !== undefined || lesson.summary !== undefined) {
      finalLesson = await updateLessonWithVersion(created.id, {
        cleanedTranscript: lesson.cleanedTranscript ?? "",
        summary: lesson.summary ?? "",
        status: "DRAFT",
        changeReason: "批量知识包导入",
        changedBy: createdBy,
      });
    }

    createdLessons.push(finalLesson);
    if (lesson.ref) refMap.set(lesson.ref, finalLesson.id);
  }

  for (const rule of payload.rules || []) {
    await createRuleDraft({
      title: rule.title,
      conclusion: rule.conclusion,
      sourceQuote: rule.sourceQuote,
      category: rule.category || "OTHER",
      conditions: rule.conditions || [],
      analysisSteps: rule.analysisSteps || [],
      exceptions: rule.exceptions || [],
      applicableAssets: rule.applicableAssets || [],
      applicableTimeframes: rule.applicableTimeframes || [],
      keywords: rule.keywords || [],
      priority: rule.priority ?? 50,
      confidence: rule.confidence ?? 50,
      sourceLessonId: resolveLessonId(rule.sourceLessonRef, refMap, createdLessons),
      status: "DRAFT",
    });
  }

  // Reserve case codes before loading the final snapshot so sequence increments are retained.
  const caseCodes: string[] = [];
  for (const item of payload.cases || []) {
    caseCodes.push(item.caseCode && /^MC-\d{4}$/.test(item.caseCode) ? item.caseCode : await nextCode("case"));
  }

  const store = await getStoreSnapshot();
  const now = new Date().toISOString();

  (payload.cases || []).forEach((item, index) => {
    const needsAdminFill = item.needsAdminFill || [
      ...(item.mainHexagram ? [] : ["mainHexagram"]),
      ...(item.changedHexagram ? [] : ["changedHexagram"]),
      ...(item.movingLines ? [] : ["movingLines"]),
      ...(item.monthBranch ? [] : ["monthBranch"]),
      ...(item.dayBranch ? [] : ["dayBranch"]),
    ];
    const row: TeacherCaseRecord = {
      id: newId("tkc"),
      caseCode: caseCodes[index]!,
      title: item.title,
      asset: item.asset || "",
      question: item.question || "",
      predictionStart: item.predictionStart ?? null,
      predictionEnd: item.predictionEnd ?? null,
      mainHexagram: item.mainHexagram ?? null,
      changedHexagram: item.changedHexagram ?? null,
      movingLines: item.movingLines ?? null,
      useGod: item.useGod ?? null,
      shiLine: item.shiLine ?? null,
      yingLine: item.yingLine ?? null,
      monthBranch: item.monthBranch ?? null,
      dayBranch: item.dayBranch ?? null,
      sixRelationsStructure: item.sixRelationsStructure ?? null,
      hiddenFlyingStructure: item.hiddenFlyingStructure ?? null,
      teacherConclusion: item.teacherConclusion,
      predictedPath: item.predictedPath || "",
      timingWindows: item.timingWindows || [],
      sourceLessonId: resolveLessonId(item.sourceLessonRef, refMap, createdLessons),
      sourceQuote: item.sourceQuote,
      actualResult: null,
      validationStatus: "PENDING",
      validationNotes: item.validationNotes || "导入草稿；卦盘字段须依据视频截图由管理员核对，不得根据转写猜测。",
      status: "DRAFT",
      needsAdminFill,
      createdAt: now,
      updatedAt: now,
    };
    store.cases.unshift(row);
  });

  for (const item of payload.concepts || []) {
    store.concepts.unshift({
      id: newId("tkcon"),
      name: item.name,
      definition: item.definition,
      conditions: item.conditions || [],
      sourceLessonId: resolveLessonId(item.sourceLessonRef, refMap, createdLessons),
      sourceQuote: item.sourceQuote,
      status: "DRAFT",
      createdAt: now,
      updatedAt: now,
    });
  }
  for (const item of payload.quotes || []) {
    store.quotes.unshift({
      id: newId("tkq"),
      quote: item.quote,
      meaning: item.meaning || "",
      toneType: item.toneType || "NORMAL",
      sourceLessonId: resolveLessonId(item.sourceLessonRef, refMap, createdLessons),
      textPosition: item.textPosition ?? null,
      status: "DRAFT",
      createdAt: now,
      updatedAt: now,
    });
  }
  for (const item of payload.methods || []) {
    store.methods.unshift({
      id: newId("tkm"),
      title: item.title,
      steps: item.steps,
      conditions: item.conditions || [],
      exceptions: item.exceptions || [],
      sourceLessonId: resolveLessonId(item.sourceLessonRef, refMap, createdLessons),
      sourceQuote: item.sourceQuote || "",
      status: "DRAFT",
      createdAt: now,
      updatedAt: now,
    });
  }

  await replaceStoreSnapshot(store);
  return {
    lessonId: createdLessons.at(-1)?.id ?? null,
    lessonIds: createdLessons.map((lesson) => lesson.id),
    lessonRefMap: Object.fromEntries(refMap),
    status: "DRAFT" as const,
  };
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
  const snap = await getStoreSnapshot();
  return {
    exportedAt: new Date().toISOString(),
    type: "moox-teacher-knowledge-full",
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
  const codeMap = new Map(lessons.map((lesson) => [lesson.id, lesson.lessonCode]));
  return {
    exportedAt: new Date().toISOString(),
    type: "moox-teacher-knowledge-ai",
    rules: rules.map((rule) => ({
      ruleCode: rule.ruleCode,
      title: rule.title,
      category: rule.category,
      conditions: rule.conditions,
      analysisSteps: rule.analysisSteps,
      conclusion: rule.conclusion,
      exceptions: rule.exceptions,
      applicableAssets: rule.applicableAssets,
      applicableTimeframes: rule.applicableTimeframes,
      sourceLessonCode: rule.sourceLessonId ? codeMap.get(rule.sourceLessonId) : null,
      sourceQuote: rule.sourceQuote,
      updatedAt: rule.updatedAt,
    })),
    cases: cases.map((item) => ({
      caseCode: item.caseCode,
      title: item.title,
      asset: item.asset,
      question: item.question,
      teacherConclusion: item.teacherConclusion,
      predictedPath: item.predictedPath,
      timingWindows: item.timingWindows,
      sourceLessonCode: item.sourceLessonId ? codeMap.get(item.sourceLessonId) : null,
      sourceQuote: item.sourceQuote,
      updatedAt: item.updatedAt,
    })),
    methods: methods.map((method) => ({
      title: method.title,
      steps: method.steps,
      exceptions: method.exceptions,
      sourceLessonCode: method.sourceLessonId ? codeMap.get(method.sourceLessonId) : null,
      updatedAt: method.updatedAt,
    })),
  };
}

export async function exportAiPackMarkdown(): Promise<string> {
  const pack = await exportAiPackJson();
  const lines: string[] = [
    "# MOOX 老师投资六爻知识包（正式审核版）",
    "",
    `导出时间：${pack.exportedAt}`,
    "",
    "本文件为网站正式母库的只读镜像。编号唯一。勿依据未编号口头内容覆盖本文件。",
    "",
    "## 正式规则",
    "",
  ];
  for (const rule of pack.rules) {
    lines.push(`### ${rule.ruleCode} ${rule.title}`);
    lines.push(`- 分类：${rule.category}`);
    lines.push(`- 结论：${rule.conclusion}`);
    lines.push(`- 条件：${(rule.conditions || []).join("；") || "—"}`);
    lines.push(`- 例外：${(rule.exceptions || []).join("；") || "—"}`);
    lines.push(`- 来源课程：${rule.sourceLessonCode || "—"}`);
    lines.push(`- 老师原话：${rule.sourceQuote}`);
    lines.push(`- 更新：${rule.updatedAt}`);
    lines.push("");
  }
  lines.push("## 正式案例", "");
  for (const item of pack.cases) {
    lines.push(`### ${item.caseCode} ${item.title}`);
    lines.push(`- 资产：${item.asset}`);
    lines.push(`- 问题：${item.question}`);
    lines.push(`- 老师结论：${item.teacherConclusion}`);
    lines.push(`- 来源课程：${item.sourceLessonCode || "—"}`);
    lines.push(`- 老师原话：${item.sourceQuote}`);
    lines.push("");
  }
  lines.push("## 正式分析流程", "");
  for (const method of pack.methods) {
    lines.push(`### ${method.title}`);
    method.steps.forEach((step, index) => lines.push(`${index + 1}. ${step}`));
    lines.push("");
  }
  return lines.join("\n");
}
