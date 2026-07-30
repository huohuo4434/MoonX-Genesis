/**
 * Teacher Knowledge store — Supabase/local JSON.
 * Prisma deferred until production DATABASE_URL + TeacherLesson migration exist.
 */
import "server-only";

import { randomBytes } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
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
const REMOTE_FILE = "teacher-knowledge.json";
const BUCKET = "moonx-data";

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

export async function nextCode(kind: "lesson" | "rule" | "case"): Promise<string> {
  const store = await loadStore();
  store.seq[kind] += 1;
  await persistStore(store);
  const prefix = kind === "lesson" ? "TL" : kind === "rule" ? "MR" : "MC";
  return `${prefix}-${String(store.seq[kind]).padStart(4, "0")}`;
}

export async function listLessons(): Promise<TeacherLessonRecord[]> {
  const store = await loadStore();
  return [...store.lessons].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getLesson(id: string): Promise<TeacherLessonRecord | null> {
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
  const store = await loadStore();
  store.lessons.unshift(lesson);
  await persistStore(store);
  return lesson;
}

export async function deleteLesson(id: string): Promise<void> {
  const store = await loadStore();
  const before = store.lessons.length;
  store.lessons = store.lessons.filter((l) => l.id !== id && l.lessonCode !== id);
  store.versions = store.versions.filter((v) => v.lessonId !== id);
  if (store.lessons.length === before) throw new Error("课程不存在");
  await persistStore(store);
}

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

  const bump =
    rawChanging || patch.cleanedTranscript !== undefined || patch.summary !== undefined || patch.status !== undefined;
  const nextVersion = existing.version + (bump ? 1 : 0);
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

  const store = await loadStore();
  store.versions.unshift(versionRow);
  const idx = store.lessons.findIndex((l) => l.id === id);
  if (idx >= 0) store.lessons[idx] = next;
  await persistStore(store);
  return next;
}

export async function listRules(filter?: { status?: string }): Promise<TeacherRuleRecord[]> {
  const store = await loadStore();
  return store.rules.filter((r) => (filter?.status ? r.status === filter.status : true));
}

export async function listCases(filter?: { status?: string }): Promise<TeacherCaseRecord[]> {
  const store = await loadStore();
  return store.cases.filter((c) => (filter?.status ? c.status === filter.status : true));
}

export async function listConcepts(filter?: { status?: string }): Promise<TeacherConceptRecord[]> {
  const store = await loadStore();
  return store.concepts.filter((c) => (filter?.status ? c.status === filter.status : true));
}

export async function listQuotes(filter?: { status?: string }): Promise<TeacherQuoteRecord[]> {
  const store = await loadStore();
  return store.quotes.filter((q) => (filter?.status ? q.status === filter.status : true));
}

export async function listMethods(filter?: { status?: string }): Promise<TeacherMethodRecord[]> {
  const store = await loadStore();
  return store.methods.filter((m) => (filter?.status ? m.status === filter.status : true));
}

export async function listConflicts(): Promise<ConflictRecordRow[]> {
  const store = await loadStore();
  return store.conflicts;
}

export async function createRuleDraft(
  input: Partial<TeacherRuleRecord> & { title: string; conclusion: string }
): Promise<TeacherRuleRecord> {
  const now = new Date().toISOString();
  const row: TeacherRuleRecord = {
    id: newId("tkr"),
    ruleCode: await nextCode("rule"),
    title: input.title,
    category: input.category || "OTHER",
    conditions: input.conditions || [],
    analysisSteps: input.analysisSteps || [],
    conclusion: input.conclusion || "",
    exceptions: input.exceptions || [],
    applicableAssets: input.applicableAssets || [],
    applicableTimeframes: input.applicableTimeframes || [],
    keywords: input.keywords || [],
    priority: input.priority ?? 50,
    confidence: input.confidence ?? 50,
    sourceLessonId: input.sourceLessonId ?? null,
    sourceQuote: input.sourceQuote || "",
    sourceTextStart: input.sourceTextStart ?? null,
    sourceTextEnd: input.sourceTextEnd ?? null,
    status: input.status || "DRAFT",
    createdAt: now,
    updatedAt: now,
  };
  const store = await loadStore();
  store.rules.unshift(row);
  await persistStore(store);
  return row;
}

export async function saveDraftExtraction(
  lessonId: string,
  payload: {
    summary?: string;
    cleanedTranscript?: string;
    rules?: unknown[];
    cases?: unknown[];
    concepts?: unknown[];
    quotes?: unknown[];
    methods?: unknown[];
  }
): Promise<void> {
  await updateLessonWithVersion(lessonId, {
    summary: payload.summary,
    cleanedTranscript: payload.cleanedTranscript,
    status: "REVIEWING",
    changeReason: "AI整理",
  });
  // Draft entity materialization is optional; lesson text + summary are the minimum persistence.
  void payload.rules;
  void payload.cases;
  void payload.concepts;
  void payload.quotes;
  void payload.methods;
}

export async function setKnowledgeStatus(
  kindOrInput: "rule" | "case" | "concept" | "quote" | "method" | {
    kind: "rule" | "case" | "concept" | "quote" | "method";
    id: string;
    status: KnowledgeStatus;
  },
  idArg?: string,
  statusArg?: KnowledgeStatus
): Promise<void> {
  const input =
    typeof kindOrInput === "string"
      ? { kind: kindOrInput, id: idArg!, status: statusArg! }
      : kindOrInput;
  const store = await loadStore();
  const bag =
    input.kind === "rule"
      ? store.rules
      : input.kind === "case"
        ? store.cases
        : input.kind === "concept"
          ? store.concepts
          : input.kind === "quote"
            ? store.quotes
            : store.methods;
  const row = bag.find((x) => x.id === input.id);
  if (!row) throw new Error("记录不存在");
  row.status = input.status;
  row.updatedAt = new Date().toISOString();
  await persistStore(store);
}

export async function getStoreSnapshot(): Promise<StoreFile> {
  return loadStore();
}

export async function replaceStoreSnapshot(snapshot: StoreFile): Promise<void> {
  await persistStore({ ...empty(), ...snapshot, version: 1 });
}

export async function logAiReaderAccess(q: string, ip?: string) {
  const store = await loadStore();
  store.aiReaderLogs.unshift({ at: new Date().toISOString(), q, ip });
  store.aiReaderLogs = store.aiReaderLogs.slice(0, 200);
  await persistStore(store);
}
