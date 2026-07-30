/**
 * Teacher Knowledge store — Prisma primary, JSON fallback.
 * rawTranscript is immutable except via versioned admin edits.
 */
import "server-only";

import { randomBytes } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  ConflictRecordRow,
  KnowledgeStatus,
  TeacherCaseRecord,
  TeacherConceptRecord,
  TeacherLessonRecord,
  TeacherMethodRecord,
  TeacherQuoteRecord,
  TeacherRuleRecord,
} from "@/lib/teacher-knowledge/types";

type StoreFile = {
  version: 1;
  updatedAt: string;
  lessons: TeacherLessonRecord[];
  versions: Array<{
    id: string;
    lessonId: string;
    version: number;
    rawTranscript: string;
    cleanedTranscript: string;
    summary: string;
    changeReason: string | null;
    changedBy: string | null;
    createdAt: string;
  }>;
  rules: TeacherRuleRecord[];
  cases: TeacherCaseRecord[];
  concepts: TeacherConceptRecord[];
  quotes: TeacherQuoteRecord[];
  methods: TeacherMethodRecord[];
  conflicts: ConflictRecordRow[];
  seq: { lesson: number; rule: number; case: number };
  aiReaderLogs: Array<{ at: string; q: string; ip?: string }>;
};

const LOCAL = resolve(process.cwd(), "data", "teacher-knowledge.json");

function empty(): StoreFile {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    lessons: [],
    versions: [],
    rules: [],
    cases: [],
    concepts: [],
    quotes: [],
    methods: [],
    conflicts: [],
    seq: { lesson: 0, rule: 0, case: 0 },
    aiReaderLogs: [],
  };
}

function readLocal(): StoreFile {
  try {
    if (!existsSync(LOCAL)) return empty();
    return { ...empty(), ...(JSON.parse(readFileSync(LOCAL, "utf8")) as StoreFile), version: 1 };
  } catch {
    return empty();
  }
}

function writeLocal(store: StoreFile) {
  mkdirSync(resolve(process.cwd(), "data"), { recursive: true });
  writeFileSync(LOCAL, JSON.stringify({ ...store, updatedAt: new Date().toISOString() }, null, 2), "utf8");
}

const REMOTE_FILE = "teacher-knowledge.json";
const BUCKET = "moonx-data";

async function loadStore(): Promise<StoreFile> {
  try {
    const { getAdminClient } = await import("@/lib/supabase/admin");
    const admin = getAdminClient();
    if (admin) {
      const { data } = await admin.storage.from(BUCKET).download(REMOTE_FILE);
      if (data) {
        const parsed = JSON.parse(await data.text()) as Partial<StoreFile>;
        return {
          ...empty(),
          ...parsed,
          version: 1,
          lessons: Array.isArray(parsed.lessons) ? parsed.lessons : [],
          versions: Array.isArray(parsed.versions) ? parsed.versions : [],
          rules: Array.isArray(parsed.rules) ? parsed.rules : [],
          cases: Array.isArray(parsed.cases) ? parsed.cases : [],
          concepts: Array.isArray(parsed.concepts) ? parsed.concepts : [],
          quotes: Array.isArray(parsed.quotes) ? parsed.quotes : [],
          methods: Array.isArray(parsed.methods) ? parsed.methods : [],
          conflicts: Array.isArray(parsed.conflicts) ? parsed.conflicts : [],
          seq: parsed.seq ?? { lesson: 0, rule: 0, case: 0 },
          aiReaderLogs: Array.isArray(parsed.aiReaderLogs) ? parsed.aiReaderLogs : [],
        };
      }
    }
  } catch {
    /* fallthrough */
  }
  return readLocal();
}

async function persistStore(store: StoreFile): Promise<void> {
  const next = { ...store, updatedAt: new Date().toISOString(), version: 1 as const };
  writeLocal(next);
  try {
    const { getAdminClient } = await import("@/lib/supabase/admin");
    const admin = getAdminClient();
    if (!admin) return;
    const blob = new Blob([JSON.stringify(next, null, 2)], { type: "application/json" });
    await admin.storage.from(BUCKET).upload(REMOTE_FILE, blob, {
      upsert: true,
      contentType: "application/json",
    });
  } catch (err) {
    console.warn("[teacher-knowledge] remote persist skipped", err);
  }
}

export function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${randomBytes(3).toString("hex")}`;
}

function asJson<T>(v: T): Prisma.InputJsonValue {
  return v as unknown as Prisma.InputJsonValue;
}

function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.map(String) : [];
}

async function nextCode(kind: "lesson" | "rule" | "case"): Promise<string> {
  const store = readLocal();
  if (prisma) {
    try {
      if (kind === "lesson") {
        const n = await prisma.teacherLesson.count();
        return `TL-${String(n + 1).padStart(4, "0")}`;
      }
      if (kind === "rule") {
        const n = await prisma.teacherRule.count();
        return `MR-${String(n + 1).padStart(4, "0")}`;
      }
      const n = await prisma.teacherCase.count();
      return `MC-${String(n + 1).padStart(4, "0")}`;
    } catch {
      /* fallthrough */
    }
  }
  store.seq[kind] += 1;
  writeLocal(store);
  const prefix = kind === "lesson" ? "TL" : kind === "rule" ? "MR" : "MC";
  return `${prefix}-${String(store.seq[kind]).padStart(4, "0")}`;
}

function mapLesson(row: {
  id: string;
  lessonCode: string;
  title: string;
  teacherName: string;
  courseSeries: string;
  lessonNumber: string;
  lessonDate: Date | null;
  originalFileName: string | null;
  sourceType: string;
  assets: unknown;
  timeframes: unknown;
  tags: unknown;
  rawTranscript: string;
  cleanedTranscript: string;
  summary: string;
  adminNotes: string;
  status: string;
  version: number;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}): TeacherLessonRecord {
  return {
    id: row.id,
    lessonCode: row.lessonCode,
    title: row.title,
    teacherName: row.teacherName,
    courseSeries: row.courseSeries,
    lessonNumber: row.lessonNumber,
    lessonDate: row.lessonDate?.toISOString() ?? null,
    originalFileName: row.originalFileName,
    sourceType: row.sourceType as TeacherLessonRecord["sourceType"],
    assets: arr(row.assets),
    timeframes: arr(row.timeframes),
    tags: arr(row.tags),
    rawTranscript: row.rawTranscript,
    cleanedTranscript: row.cleanedTranscript,
    summary: row.summary,
    adminNotes: row.adminNotes,
    status: row.status as TeacherLessonRecord["status"],
    version: row.version,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapRule(row: {
  id: string;
  ruleCode: string;
  title: string;
  category: string;
  conditions: unknown;
  analysisSteps: unknown;
  conclusion: string;
  exceptions: unknown;
  applicableAssets: unknown;
  applicableTimeframes: unknown;
  keywords: unknown;
  priority: number;
  confidence: number;
  sourceLessonId: string | null;
  sourceQuote: string;
  sourceTextStart: number | null;
  sourceTextEnd: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): TeacherRuleRecord {
  return {
    id: row.id,
    ruleCode: row.ruleCode,
    title: row.title,
    category: row.category,
    conditions: arr(row.conditions),
    analysisSteps: arr(row.analysisSteps),
    conclusion: row.conclusion,
    exceptions: arr(row.exceptions),
    applicableAssets: arr(row.applicableAssets),
    applicableTimeframes: arr(row.applicableTimeframes),
    keywords: arr(row.keywords),
    priority: row.priority,
    confidence: row.confidence,
    sourceLessonId: row.sourceLessonId,
    sourceQuote: row.sourceQuote,
    sourceTextStart: row.sourceTextStart,
    sourceTextEnd: row.sourceTextEnd,
    status: row.status as KnowledgeStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listLessons(): Promise<TeacherLessonRecord[]> {
  if (prisma) {
    try {
      const rows = await prisma.teacherLesson.findMany({ orderBy: { createdAt: "desc" } });
      if (rows.length) return rows.map(mapLesson);
    } catch {
      /* fallthrough */
    }
  }
  const store = await loadStore();
  return [...store.lessons].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getLesson(id: string): Promise<TeacherLessonRecord | null> {
  if (prisma) {
    try {
      const row = await prisma.teacherLesson.findUnique({ where: { id } });
      if (row) return mapLesson(row);
    } catch {
      /* fallthrough */
    }
  }
  const store = await loadStore();
  return store.lessons.find((l) => l.id === id || l.lessonCode === id) ?? null;
}

export async function createLesson(input: {
  title: string;
  teacherName?: string;
  courseSeries?: string;
  lessonNumber?: string;
  lessonDate?: string | null;
  originalFileName?: string | null;
  sourceType?: TeacherLessonRecord["sourceType"];
  assets?: string[];
  timeframes?: string[];
  tags?: string[];
  rawTranscript: string;
  adminNotes?: string;
  createdBy?: string | null;
}): Promise<TeacherLessonRecord> {
  if (!input.rawTranscript.trim()) throw new Error("原始转写文字不能为空");
  const now = new Date().toISOString();
  const lesson: TeacherLessonRecord = {
    id: newId("tkl"),
    lessonCode: await nextCode("lesson"),
    title: input.title.trim() || "未命名课程",
    teacherName: input.teacherName?.trim() || "",
    courseSeries: input.courseSeries?.trim() || "",
    lessonNumber: input.lessonNumber?.trim() || "",
    lessonDate: input.lessonDate || null,
    originalFileName: input.originalFileName || null,
    sourceType: input.sourceType || "MANUAL_NOTE",
    assets: input.assets || [],
    timeframes: input.timeframes || [],
    tags: input.tags || [],
    rawTranscript: input.rawTranscript,
    cleanedTranscript: "",
    summary: "",
    adminNotes: input.adminNotes || "",
    status: "DRAFT",
    version: 1,
    createdBy: input.createdBy || null,
    createdAt: now,
    updatedAt: now,
  };

  if (prisma) {
    try {
      await prisma.teacherLesson.create({
        data: {
          id: lesson.id,
          lessonCode: lesson.lessonCode,
          title: lesson.title,
          teacherName: lesson.teacherName,
          courseSeries: lesson.courseSeries,
          lessonNumber: lesson.lessonNumber,
          lessonDate: lesson.lessonDate ? new Date(lesson.lessonDate) : null,
          originalFileName: lesson.originalFileName,
          sourceType: lesson.sourceType,
          assets: asJson(lesson.assets),
          timeframes: asJson(lesson.timeframes),
          tags: asJson(lesson.tags),
          rawTranscript: lesson.rawTranscript,
          cleanedTranscript: "",
          summary: "",
          adminNotes: lesson.adminNotes,
          status: "DRAFT",
          version: 1,
          createdBy: lesson.createdBy,
        },
      });
      return lesson;
    } catch {
      /* fallthrough */
    }
  }
  const store = await loadStore();
  store.lessons.unshift(lesson);
  await persistStore(store);
  return lesson;
}

export async function deleteLesson(id: string): Promise<void> {
  if (prisma) {
    try {
      await prisma.teacherLesson.delete({ where: { id } });
      return;
    } catch {
      /* fallthrough */
    }
  }
  const store = await loadStore();
  const before = store.lessons.length;
  store.lessons = store.lessons.filter((l) => l.id !== id && l.lessonCode !== id);
  store.versions = store.versions.filter((v) => v.lessonId !== id);
  if (store.lessons.length === before) throw new Error("课程不存在");
  await persistStore(store);
}

/** Version snapshot then update. Never silently overwrite raw without version. */
export async function updateLessonWithVersion(
  id: string,
  patch: Partial<TeacherLessonRecord> & { changeReason?: string; changedBy?: string | null },
  options?: { allowRawChange?: boolean }
): Promise<TeacherLessonRecord> {
  const existing = await getLesson(id);
  if (!existing) throw new Error("课程不存在");

  const rawChanging =
    options?.allowRawChange &&
    patch.rawTranscript !== undefined &&
    patch.rawTranscript !== existing.rawTranscript;

  const nextVersion = existing.version + (rawChanging || patch.cleanedTranscript !== undefined || patch.summary !== undefined ? 1 : 0);
  const versionRow = {
    id: newId("tkv"),
    lessonId: id,
    version: existing.version,
    rawTranscript: existing.rawTranscript,
    cleanedTranscript: existing.cleanedTranscript,
    summary: existing.summary,
    changeReason: patch.changeReason || "编辑前备份",
    changedBy: patch.changedBy || null,
    createdAt: new Date().toISOString(),
  };

  const next: TeacherLessonRecord = {
    ...existing,
    ...patch,
    id,
    lessonCode: existing.lessonCode,
    rawTranscript: rawChanging ? String(patch.rawTranscript) : existing.rawTranscript,
    version: nextVersion || existing.version,
    updatedAt: new Date().toISOString(),
  };
  delete (next as { changeReason?: string }).changeReason;
  delete (next as { changedBy?: string | null }).changedBy;

  if (prisma) {
    try {
      await prisma.teacherLessonVersion.create({
        data: {
          id: versionRow.id,
          lessonId: versionRow.lessonId,
          version: versionRow.version,
          rawTranscript: versionRow.rawTranscript,
          cleanedTranscript: versionRow.cleanedTranscript,
          summary: versionRow.summary,
          changeReason: versionRow.changeReason,
          changedBy: versionRow.changedBy,
        },
      });
      await prisma.teacherLesson.update({
        where: { id },
        data: {
          title: next.title,
          teacherName: next.teacherName,
          courseSeries: next.courseSeries,
          lessonNumber: next.lessonNumber,
          lessonDate: next.lessonDate ? new Date(next.lessonDate) : null,
          originalFileName: next.originalFileName,
          sourceType: next.sourceType,
          assets: asJson(next.assets),
          timeframes: asJson(next.timeframes),
          tags: asJson(next.tags),
          rawTranscript: next.rawTranscript,
          cleanedTranscript: next.cleanedTranscript,
          summary: next.summary,
          adminNotes: next.adminNotes,
          status: next.status,
          version: next.version,
        },
      });
      return next;
    } catch {
      /* fallthrough */
    }
  }

  const store = await loadStore();
  store.versions.unshift(versionRow);
  const idx = store.lessons.findIndex((l) => l.id === id);
  if (idx >= 0) store.lessons[idx] = next;
  await persistStore(store);
  return next;
}

export async function listRules(filter?: { status?: string }): Promise<TeacherRuleRecord[]> {
  if (prisma) {
    try {
      const rows = await prisma.teacherRule.findMany({
        where: filter?.status ? { status: filter.status } : undefined,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      });
      if (rows.length) return rows.map(mapRule);
    } catch {
      /* fallthrough */
    }
  }
  let rows = readLocal().rules;
  if (filter?.status) rows = rows.filter((r) => r.status === filter.status);
  return rows;
}

export async function listCases(filter?: { status?: string }): Promise<TeacherCaseRecord[]> {
  if (prisma) {
    try {
      const rows = await prisma.teacherCase.findMany({
        where: filter?.status ? { status: filter.status } : undefined,
        orderBy: { createdAt: "desc" },
      });
      if (rows.length) {
        return rows.map((r) => ({
          id: r.id,
          caseCode: r.caseCode,
          title: r.title,
          asset: r.asset,
          question: r.question,
          predictionStart: r.predictionStart,
          predictionEnd: r.predictionEnd,
          mainHexagram: r.mainHexagram,
          changedHexagram: r.changedHexagram,
          movingLines: r.movingLines,
          useGod: r.useGod,
          shiLine: r.shiLine,
          yingLine: r.yingLine,
          monthBranch: r.monthBranch,
          dayBranch: r.dayBranch,
          sixRelationsStructure: (r.sixRelationsStructure as Record<string, unknown>) || null,
          hiddenFlyingStructure: (r.hiddenFlyingStructure as Record<string, unknown>) || null,
          teacherConclusion: r.teacherConclusion,
          predictedPath: r.predictedPath,
          timingWindows: arr(r.timingWindows),
          sourceLessonId: r.sourceLessonId,
          sourceQuote: r.sourceQuote,
          actualResult: r.actualResult,
          validationStatus: r.validationStatus,
          validationNotes: r.validationNotes,
          status: r.status as KnowledgeStatus,
          needsAdminFill: arr(r.needsAdminFill),
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        }));
      }
    } catch {
      /* fallthrough */
    }
  }
  let rows = readLocal().cases;
  if (filter?.status) rows = rows.filter((c) => c.status === filter.status);
  return rows;
}

export async function listMethods(filter?: { status?: string }) {
  if (prisma) {
    try {
      const rows = await prisma.teacherMethod.findMany({
        where: filter?.status ? { status: filter.status } : undefined,
      });
      if (rows.length) {
        return rows.map((r) => ({
          id: r.id,
          title: r.title,
          steps: arr(r.steps),
          conditions: arr(r.conditions),
          exceptions: arr(r.exceptions),
          sourceLessonId: r.sourceLessonId,
          sourceQuote: r.sourceQuote,
          status: r.status as KnowledgeStatus,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        }));
      }
    } catch {
      /* fallthrough */
    }
  }
  let rows = readLocal().methods;
  if (filter?.status) rows = rows.filter((m) => m.status === filter.status);
  return rows;
}

export async function listQuotes(filter?: { status?: string }) {
  if (prisma) {
    try {
      const rows = await prisma.teacherQuote.findMany({
        where: filter?.status ? { status: filter.status } : undefined,
      });
      if (rows.length) {
        return rows.map((r) => ({
          id: r.id,
          quote: r.quote,
          meaning: r.meaning,
          toneType: r.toneType,
          sourceLessonId: r.sourceLessonId,
          textPosition: r.textPosition,
          status: r.status as KnowledgeStatus,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        }));
      }
    } catch {
      /* fallthrough */
    }
  }
  let rows = readLocal().quotes;
  if (filter?.status) rows = rows.filter((q) => q.status === filter.status);
  return rows;
}

export async function listConcepts(filter?: { status?: string }) {
  if (prisma) {
    try {
      const rows = await prisma.teacherConcept.findMany({
        where: filter?.status ? { status: filter.status } : undefined,
      });
      if (rows.length) {
        return rows.map((r) => ({
          id: r.id,
          name: r.name,
          definition: r.definition,
          conditions: arr(r.conditions),
          sourceLessonId: r.sourceLessonId,
          sourceQuote: r.sourceQuote,
          status: r.status as KnowledgeStatus,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        }));
      }
    } catch {
      /* fallthrough */
    }
  }
  let rows = readLocal().concepts;
  if (filter?.status) rows = rows.filter((c) => c.status === filter.status);
  return rows;
}

export async function listConflicts() {
  if (prisma) {
    try {
      const rows = await prisma.conflictRecord.findMany({ orderBy: { createdAt: "desc" } });
      if (rows.length) {
        return rows.map((r) => ({
          id: r.id,
          ruleAId: r.ruleAId,
          ruleBId: r.ruleBId,
          conflictType: r.conflictType,
          possibleReason: r.possibleReason,
          resolution: r.resolution,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        }));
      }
    } catch {
      /* fallthrough */
    }
  }
  return readLocal().conflicts;
}

export async function saveDraftExtraction(
  lessonId: string,
  payload: {
    summary: string;
    cleanedTranscript?: string;
    rules: Array<Partial<TeacherRuleRecord> & { title: string; conclusion: string; sourceQuote: string }>;
    cases: Array<Partial<TeacherCaseRecord> & { title: string; teacherConclusion: string; sourceQuote: string }>;
    concepts: Array<Partial<TeacherConceptRecord> & { name: string; definition: string; sourceQuote: string }>;
    quotes: Array<Partial<TeacherQuoteRecord> & { quote: string }>;
    methods: Array<Partial<TeacherMethodRecord> & { title: string; steps: string[] }>;
  }
) {
  const lesson = await getLesson(lessonId);
  if (!lesson) throw new Error("课程不存在");

  await updateLessonWithVersion(lessonId, {
    summary: payload.summary,
    cleanedTranscript: payload.cleanedTranscript ?? lesson.cleanedTranscript,
    status: "ANALYZED",
    changeReason: "AI整理课程",
  });

  const createdRules: TeacherRuleRecord[] = [];
  for (const r of payload.rules) {
    const rule = await createRuleDraft({
      ...r,
      sourceLessonId: lessonId,
      status: "DRAFT",
    });
    createdRules.push(rule);
  }
  for (const c of payload.cases) {
    await createCaseDraft({ ...c, sourceLessonId: lessonId, status: "DRAFT" });
  }
  for (const c of payload.concepts) {
    await createConceptDraft({ ...c, sourceLessonId: lessonId, status: "DRAFT" });
  }
  for (const q of payload.quotes) {
    await createQuoteDraft({ ...q, sourceLessonId: lessonId, status: "DRAFT" });
  }
  for (const m of payload.methods) {
    await createMethodDraft({ ...m, sourceLessonId: lessonId, status: "DRAFT" });
  }

  for (const rule of createdRules) {
    await detectConflictsForRule(rule);
  }

  return { rules: createdRules.length, cases: payload.cases.length };
}

export async function createRuleDraft(
  input: Partial<TeacherRuleRecord> & { title: string; conclusion: string; sourceQuote: string }
): Promise<TeacherRuleRecord> {
  const now = new Date().toISOString();
  const rule: TeacherRuleRecord = {
    id: newId("tkr"),
    ruleCode: await nextCode("rule"),
    title: input.title,
    category: input.category || "OTHER",
    conditions: input.conditions || [],
    analysisSteps: input.analysisSteps || [],
    conclusion: input.conclusion,
    exceptions: input.exceptions || [],
    applicableAssets: input.applicableAssets || [],
    applicableTimeframes: input.applicableTimeframes || [],
    keywords: input.keywords || [],
    priority: input.priority ?? 50,
    confidence: input.confidence ?? 50,
    sourceLessonId: input.sourceLessonId || null,
    sourceQuote: input.sourceQuote,
    sourceTextStart: input.sourceTextStart ?? null,
    sourceTextEnd: input.sourceTextEnd ?? null,
    status: (input.status as KnowledgeStatus) || "DRAFT",
    createdAt: now,
    updatedAt: now,
  };

  if (prisma) {
    try {
      await prisma.teacherRule.create({
        data: {
          id: rule.id,
          ruleCode: rule.ruleCode,
          title: rule.title,
          category: rule.category,
          conditions: asJson(rule.conditions),
          analysisSteps: asJson(rule.analysisSteps),
          conclusion: rule.conclusion,
          exceptions: asJson(rule.exceptions),
          applicableAssets: asJson(rule.applicableAssets),
          applicableTimeframes: asJson(rule.applicableTimeframes),
          keywords: asJson(rule.keywords),
          priority: rule.priority,
          confidence: rule.confidence,
          sourceLessonId: rule.sourceLessonId,
          sourceQuote: rule.sourceQuote,
          sourceTextStart: rule.sourceTextStart,
          sourceTextEnd: rule.sourceTextEnd,
          status: rule.status,
        },
      });
      return rule;
    } catch {
      /* fallthrough */
    }
  }
  const store = readLocal();
  store.rules.unshift(rule);
  writeLocal(store);
  return rule;
}

async function createCaseDraft(
  input: Partial<TeacherCaseRecord> & { title: string; teacherConclusion: string; sourceQuote: string }
) {
  const now = new Date().toISOString();
  const hexFields = ["mainHexagram", "changedHexagram", "movingLines", "monthBranch", "dayBranch"] as const;
  const needsAdminFill: string[] = [];
  for (const f of hexFields) {
    if (!input[f]) needsAdminFill.push(f);
  }
  const row: TeacherCaseRecord = {
    id: newId("tkc"),
    caseCode: await nextCode("case"),
    title: input.title,
    asset: input.asset || "",
    question: input.question || "",
    predictionStart: input.predictionStart || null,
    predictionEnd: input.predictionEnd || null,
    mainHexagram: input.mainHexagram || null,
    changedHexagram: input.changedHexagram || null,
    movingLines: input.movingLines || null,
    useGod: input.useGod || null,
    shiLine: input.shiLine || null,
    yingLine: input.yingLine || null,
    monthBranch: input.monthBranch || null,
    dayBranch: input.dayBranch || null,
    sixRelationsStructure: input.sixRelationsStructure || null,
    hiddenFlyingStructure: input.hiddenFlyingStructure || null,
    teacherConclusion: input.teacherConclusion,
    predictedPath: input.predictedPath || "",
    timingWindows: input.timingWindows || [],
    sourceLessonId: input.sourceLessonId || null,
    sourceQuote: input.sourceQuote,
    actualResult: null,
    validationStatus: "PENDING",
    validationNotes: needsAdminFill.length ? `原文未明确，请管理员补充：${needsAdminFill.join(", ")}` : null,
    status: "DRAFT",
    needsAdminFill,
    createdAt: now,
    updatedAt: now,
  };

  if (prisma) {
    try {
      await prisma.teacherCase.create({
        data: {
          id: row.id,
          caseCode: row.caseCode,
          title: row.title,
          asset: row.asset,
          question: row.question,
          predictionStart: row.predictionStart,
          predictionEnd: row.predictionEnd,
          mainHexagram: row.mainHexagram,
          changedHexagram: row.changedHexagram,
          movingLines: row.movingLines,
          useGod: row.useGod,
          shiLine: row.shiLine,
          yingLine: row.yingLine,
          monthBranch: row.monthBranch,
          dayBranch: row.dayBranch,
          sixRelationsStructure: row.sixRelationsStructure ? asJson(row.sixRelationsStructure) : undefined,
          hiddenFlyingStructure: row.hiddenFlyingStructure ? asJson(row.hiddenFlyingStructure) : undefined,
          teacherConclusion: row.teacherConclusion,
          predictedPath: row.predictedPath,
          timingWindows: asJson(row.timingWindows),
          sourceLessonId: row.sourceLessonId,
          sourceQuote: row.sourceQuote,
          validationStatus: row.validationStatus,
          validationNotes: row.validationNotes,
          status: row.status,
          needsAdminFill: asJson(row.needsAdminFill),
        },
      });
      return row;
    } catch {
      /* fallthrough */
    }
  }
  const store = readLocal();
  store.cases.unshift(row);
  writeLocal(store);
  return row;
}

async function createConceptDraft(
  input: Partial<TeacherConceptRecord> & { name: string; definition: string; sourceQuote: string }
) {
  const now = new Date().toISOString();
  const row: TeacherConceptRecord = {
    id: newId("tkcon"),
    name: input.name,
    definition: input.definition,
    conditions: input.conditions || [],
    sourceLessonId: input.sourceLessonId || null,
    sourceQuote: input.sourceQuote,
    status: "DRAFT",
    createdAt: now,
    updatedAt: now,
  };
  if (prisma) {
    try {
      await prisma.teacherConcept.create({
        data: {
          id: row.id,
          name: row.name,
          definition: row.definition,
          conditions: asJson(row.conditions),
          sourceLessonId: row.sourceLessonId,
          sourceQuote: row.sourceQuote,
          status: row.status,
        },
      });
      return row;
    } catch {
      /* fallthrough */
    }
  }
  const store = readLocal();
  store.concepts.unshift(row);
  writeLocal(store);
  return row;
}

async function createQuoteDraft(input: Partial<TeacherQuoteRecord> & { quote: string }) {
  const now = new Date().toISOString();
  const row: TeacherQuoteRecord = {
    id: newId("tkq"),
    quote: input.quote,
    meaning: input.meaning || "",
    toneType: input.toneType || "NORMAL",
    sourceLessonId: input.sourceLessonId || null,
    textPosition: input.textPosition ?? null,
    status: "DRAFT",
    createdAt: now,
    updatedAt: now,
  };
  if (prisma) {
    try {
      await prisma.teacherQuote.create({
        data: {
          id: row.id,
          quote: row.quote,
          meaning: row.meaning,
          toneType: row.toneType,
          sourceLessonId: row.sourceLessonId,
          textPosition: row.textPosition,
          status: row.status,
        },
      });
      return row;
    } catch {
      /* fallthrough */
    }
  }
  const store = readLocal();
  store.quotes.unshift(row);
  writeLocal(store);
  return row;
}

async function createMethodDraft(
  input: Partial<TeacherMethodRecord> & { title: string; steps: string[] }
) {
  const now = new Date().toISOString();
  const row: TeacherMethodRecord = {
    id: newId("tkm"),
    title: input.title,
    steps: input.steps,
    conditions: input.conditions || [],
    exceptions: input.exceptions || [],
    sourceLessonId: input.sourceLessonId || null,
    sourceQuote: input.sourceQuote || "",
    status: "DRAFT",
    createdAt: now,
    updatedAt: now,
  };
  if (prisma) {
    try {
      await prisma.teacherMethod.create({
        data: {
          id: row.id,
          title: row.title,
          steps: asJson(row.steps),
          conditions: asJson(row.conditions),
          exceptions: asJson(row.exceptions),
          sourceLessonId: row.sourceLessonId,
          sourceQuote: row.sourceQuote,
          status: row.status,
        },
      });
      return row;
    } catch {
      /* fallthrough */
    }
  }
  const store = readLocal();
  store.methods.unshift(row);
  writeLocal(store);
  return row;
}

export async function setKnowledgeStatus(
  kind: "rule" | "case" | "concept" | "quote" | "method",
  id: string,
  status: KnowledgeStatus
) {
  if (prisma) {
    try {
      if (kind === "rule") await prisma.teacherRule.update({ where: { id }, data: { status } });
      if (kind === "case") await prisma.teacherCase.update({ where: { id }, data: { status } });
      if (kind === "concept") await prisma.teacherConcept.update({ where: { id }, data: { status } });
      if (kind === "quote") await prisma.teacherQuote.update({ where: { id }, data: { status } });
      if (kind === "method") await prisma.teacherMethod.update({ where: { id }, data: { status } });
      return;
    } catch {
      /* fallthrough */
    }
  }
  const store = readLocal();
  const key = kind === "rule" ? "rules" : kind === "case" ? "cases" : kind === "concept" ? "concepts" : kind === "quote" ? "quotes" : "methods";
  const list = store[key] as Array<{ id: string; status: string; updatedAt: string }>;
  const item = list.find((x) => x.id === id);
  if (item) {
    item.status = status;
    item.updatedAt = new Date().toISOString();
    writeLocal(store);
  }
}

export async function detectConflictsForRule(rule: TeacherRuleRecord) {
  const approved = await listRules({ status: "APPROVED" });
  const drafts = (await listRules()).filter((r) => r.id !== rule.id);
  const pool = [...approved, ...drafts];
  for (const other of pool) {
    if (other.id === rule.id) continue;
    const sameTitle = other.title === rule.title;
    const overlapKw = rule.keywords.some((k) => other.keywords.includes(k) || other.title.includes(k));
    const opposite =
      (rule.conclusion.includes("看多") && other.conclusion.includes("看空")) ||
      (rule.conclusion.includes("看空") && other.conclusion.includes("看多"));
    if (!(sameTitle || (overlapKw && opposite) || (overlapKw && rule.category === other.category && rule.conclusion !== other.conclusion))) {
      continue;
    }
    let reason = "暂时无法判断";
    if (rule.applicableAssets.join() !== other.applicableAssets.join()) reason = "资产不同";
    else if (rule.applicableTimeframes.join() !== other.applicableTimeframes.join()) reason = "周期不同";
    else if (rule.exceptions.length || other.exceptions.length) reason = "存在特殊例外";
    else if (opposite) reason = "老师后期修正规则";

    const conflict: ConflictRecordRow = {
      id: newId("tkcf"),
      ruleAId: rule.id,
      ruleBId: other.id,
      conflictType: "POSSIBLE",
      possibleReason: reason,
      resolution: null,
      status: "OPEN",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (prisma) {
      try {
        await prisma.conflictRecord.create({
          data: {
            id: conflict.id,
            ruleAId: conflict.ruleAId,
            ruleBId: conflict.ruleBId,
            conflictType: conflict.conflictType,
            possibleReason: conflict.possibleReason,
            status: conflict.status,
          },
        });
        continue;
      } catch {
        /* fallthrough */
      }
    }
    const store = readLocal();
    store.conflicts.unshift(conflict);
    writeLocal(store);
  }
}

export async function logAiReaderAccess(q: string, ip?: string) {
  const store = readLocal();
  store.aiReaderLogs.unshift({ at: new Date().toISOString(), q, ip });
  store.aiReaderLogs = store.aiReaderLogs.slice(0, 500);
  writeLocal(store);
}

export function getStoreSnapshot(): StoreFile {
  return readLocal();
}

export function replaceStoreSnapshot(store: StoreFile) {
  writeLocal(store);
}

export { nextCode };
