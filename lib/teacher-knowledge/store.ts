/**
 * Teacher Knowledge store — Supabase/local JSON.
 * Prisma deferred until production DATABASE_URL + TeacherLesson migration exist.
 */
import "server-only";

import { randomBytes } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import seedData from "@/data/teacher-knowledge-seed.json";
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
import {
  applyTeacherQimenOnlyBackfill,
  preferStableQimenReport,
  qimenReportAttemptSummary,
  qimenReportOutcomeSha256,
  selectQimenOnlyBackfillRows,
  selectValidExtractedQimenRows,
} from "@/lib/research/qimen-shadow-lesson-backfill-core";
import { qimenLessonTranscriptSha256 } from "@/lib/research/qimen-shadow-lesson-ingestion-core";
import {
  acquireQimenStoreWriteLease,
  renewQimenStoreWriteLease,
  releaseQimenStoreWriteLease,
} from "@/lib/research/qimen-lesson-automation-lease";
import {
  isMissingResearchStoreObject,
  researchStoreReady,
  researchStoreUnavailable,
  safeResearchStoreError,
  type ResearchStoreHealth,
  type ResearchStoreInitializationResult,
} from "@/lib/research/research-store-health-core";
import { registerLessonAutomationFailure } from "@/lib/research/lesson-processing-retry-core";

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
    qimenShadowExtraction: unknown | null;
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

function normalizeStore(input: Partial<StoreFile> | null | undefined): StoreFile {
  const base = empty();
  const parsed = input ?? {};
  return {
    ...base,
    ...parsed,
    version: 1,
    lessons: Array.isArray(parsed.lessons)
      ? parsed.lessons.map((lesson) => ({
          ...lesson,
          qimenShadowExtraction: lesson.qimenShadowExtraction ?? null,
          qimenShadowAttemptMeta: lesson.qimenShadowAttemptMeta ?? null,
        }))
      : [],
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

export function isValidTeacherKnowledgeStore(value: unknown): value is StoreFile {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<StoreFile>;
  const seq = row.seq;
  return row.version === 1
    && typeof row.updatedAt === "string"
    && Array.isArray(row.lessons)
    && Array.isArray(row.versions)
    && Array.isArray(row.rules)
    && Array.isArray(row.cases)
    && Array.isArray(row.concepts)
    && Array.isArray(row.quotes)
    && Array.isArray(row.methods)
    && Array.isArray(row.conflicts)
    && Array.isArray(row.aiReaderLogs)
    && Boolean(seq)
    && Number.isInteger(seq?.lesson)
    && Number.isInteger(seq?.rule)
    && Number.isInteger(seq?.case)
    && (seq?.lesson ?? -1) >= 0
    && (seq?.rule ?? -1) >= 0
    && (seq?.case ?? -1) >= 0;
}

function teacherCounts(store: StoreFile): Record<string, number> {
  return {
    lessons: store.lessons.length,
    rules: store.rules.length,
    cases: store.cases.length,
    methods: store.methods.length,
    conflicts: store.conflicts.length,
  };
}

function readSeed(): StoreFile {
  return normalizeStore(seedData as unknown as Partial<StoreFile>);
}

function mergeRows<T extends { id: string }>(current: T[], seed: T[]): T[] {
  const ids = new Set(current.map((row) => row.id));
  return [...current, ...seed.filter((row) => !ids.has(row.id))];
}

function mergeSeed(current: StoreFile): StoreFile {
  const seed = readSeed();
  return {
    ...current,
    lessons: mergeRows(current.lessons, seed.lessons),
    versions: mergeRows(current.versions, seed.versions),
    rules: mergeRows(current.rules, seed.rules),
    cases: mergeRows(current.cases, seed.cases),
    concepts: mergeRows(current.concepts, seed.concepts),
    quotes: mergeRows(current.quotes, seed.quotes),
    methods: mergeRows(current.methods, seed.methods),
    conflicts: mergeRows(current.conflicts, seed.conflicts),
    seq: {
      lesson: Math.max(current.seq.lesson, seed.seq.lesson),
      rule: Math.max(current.seq.rule, seed.seq.rule),
      case: Math.max(current.seq.case, seed.seq.case),
    },
  };
}

function readLocal(): StoreFile {
  if (!existsSync(LOCAL)) return mergeSeed(empty());
  const parsed = JSON.parse(readFileSync(LOCAL, "utf8")) as unknown;
  if (!isValidTeacherKnowledgeStore(parsed)) {
    throw new Error("老师知识库本地对象结构无效，拒绝读取或覆盖。");
  }
  return mergeSeed(normalizeStore(parsed));
}

function writeLocal(store: StoreFile) {
  mkdirSync(resolve(process.cwd(), "data"), { recursive: true });
  writeFileSync(LOCAL, JSON.stringify(store, null, 2), "utf8");
}

async function loadStore(): Promise<StoreFile> {
  const isProd = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
  try {
    const { getAdminClient } = await import("@/lib/supabase/admin");
    const admin = getAdminClient();
    if (isProd && !admin) throw new Error("老师知识库读取失败：生产环境缺少 Supabase 服务端配置");
    if (admin) {
      const { data, error } = await admin.storage.from(BUCKET).download(REMOTE_FILE);
      if (data) {
        const parsed = JSON.parse(await data.text()) as unknown;
        if (isValidTeacherKnowledgeStore(parsed)) return mergeSeed(normalizeStore(parsed));
      }
      if (isProd) throw new Error(`老师知识库读取失败：${error?.message ?? "远端文件缺失或结构无效"}`);
    }
  } catch (error) {
    if (isProd) throw error;
  }
  return readLocal();
}

export async function getTeacherKnowledgeStoreHealth(): Promise<ResearchStoreHealth> {
  const isProd = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
  try {
    const { getAdminClient } = await import("@/lib/supabase/admin");
    const admin = getAdminClient();
    if (admin) {
      const { data, error } = await admin.storage.from(BUCKET).download(REMOTE_FILE);
      if (error || !data) {
        return researchStoreUnavailable({
          id: "teacher-knowledge",
          label: "老师原始笔记知识库",
          backend: "SUPABASE",
          state: isMissingResearchStoreObject(error) ? "MISSING" : "ERROR",
          updatedAt: null,
          counts: {},
          detail: isMissingResearchStoreObject(error) ? "远端对象尚未初始化" : safeResearchStoreError(error),
        });
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(await data.text()) as unknown;
      } catch {
        return researchStoreUnavailable({
          id: "teacher-knowledge",
          label: "老师原始笔记知识库",
          backend: "SUPABASE",
          state: "INVALID",
          updatedAt: null,
          counts: {},
          detail: "远端对象不是有效 JSON；为避免覆盖，系统已停止写入",
        });
      }
      if (!isValidTeacherKnowledgeStore(parsed)) {
        return researchStoreUnavailable({
          id: "teacher-knowledge",
          label: "老师原始笔记知识库",
          backend: "SUPABASE",
          state: "INVALID",
          updatedAt: null,
          counts: {},
          detail: "远端对象存在，但结构不完整；为避免覆盖，系统已停止写入",
        });
      }
      const store = mergeSeed(normalizeStore(parsed));
      return researchStoreReady({
        id: "teacher-knowledge",
        label: "老师原始笔记知识库",
        backend: "SUPABASE",
        updatedAt: store.updatedAt,
        counts: teacherCounts(store),
        detail: "远端对象可读且结构完整",
      });
    }
  } catch (error) {
    return researchStoreUnavailable({
      id: "teacher-knowledge",
      label: "老师原始笔记知识库",
      backend: isProd ? "SUPABASE" : "LOCAL",
      state: "ERROR",
      updatedAt: null,
      counts: {},
      detail: safeResearchStoreError(error),
    });
  }
  if (isProd) {
    return researchStoreUnavailable({
      id: "teacher-knowledge",
      label: "老师原始笔记知识库",
      backend: "SUPABASE",
      state: "UNCONFIGURED",
      updatedAt: null,
      counts: {},
      detail: "生产环境缺少 Supabase 服务端配置",
    });
  }
  const local = readLocal();
  return researchStoreReady({
    id: "teacher-knowledge",
    label: "老师原始笔记知识库",
    backend: "LOCAL",
    updatedAt: local.updatedAt,
    counts: teacherCounts(local),
    detail: existsSync(LOCAL) ? "使用本地开发存储" : "使用内置种子；尚未产生本地写入文件",
  });
}

async function persistStore(store: StoreFile): Promise<void> {
  const baseUpdatedAt = store.updatedAt;
  const nextUpdatedAt = new Date(Math.max(Date.now(), Date.parse(baseUpdatedAt) + 1)).toISOString();
  const next = { ...store, updatedAt: nextUpdatedAt, version: 1 as const };
  const isProd = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
  const owner = `teacher-${randomBytes(12).toString("hex")}`;
  const acquired = await acquireQimenStoreWriteLease({ storeId: "teacher-knowledge", owner });
  if (isProd && !acquired) throw new Error("老师知识库正在被另一任务更新，请重试。");

  try {
    const { getAdminClient } = await import("@/lib/supabase/admin");
    const admin = getAdminClient();
    if (isProd && !admin) throw new Error("老师知识库保存失败：生产环境缺少 Supabase 服务端配置");
    if (admin) {
      const { data: currentData, error: currentError } = await admin.storage.from(BUCKET).download(REMOTE_FILE);
      if (currentError || !currentData) throw new Error(`老师知识库写前校验失败：${currentError?.message ?? "远端文件缺失"}`);
      const currentRaw = JSON.parse(await currentData.text()) as unknown;
      if (!isValidTeacherKnowledgeStore(currentRaw)) throw new Error("老师知识库写前校验失败：远端对象结构无效。");
      const current = normalizeStore(currentRaw);
      if (current.updatedAt !== baseUpdatedAt) throw new Error("老师知识库版本已变化，拒绝覆盖并请重试。");
      if (acquired && !await renewQimenStoreWriteLease({ storeId: "teacher-knowledge", owner })) {
        throw new Error("老师知识库写锁已失效，拒绝覆盖并请重试。");
      }
      const blob = new Blob([JSON.stringify(next, null, 2)], { type: "application/json" });
      const { error } = await admin.storage.from(BUCKET).upload(REMOTE_FILE, blob, {
        upsert: true,
        contentType: "application/json",
      });
      if (error) throw new Error(`老师知识库保存失败：${error.message}`);
      try { writeLocal(next); } catch { /* best-effort mirror */ }
      return;
    }
    const local = readLocal();
    if (local.updatedAt !== baseUpdatedAt) throw new Error("老师知识库本地版本已变化，拒绝覆盖并请重试。");
    if (acquired && !await renewQimenStoreWriteLease({ storeId: "teacher-knowledge", owner })) {
      throw new Error("老师知识库写锁已失效，拒绝覆盖并请重试。");
    }
    writeLocal(next);
  } finally {
    if (acquired) await releaseQimenStoreWriteLease("teacher-knowledge", owner).catch(() => undefined);
  }
}

export async function initializeTeacherKnowledgeStoreIfMissing(): Promise<ResearchStoreInitializationResult> {
  const { getAdminClient } = await import("@/lib/supabase/admin");
  const admin = getAdminClient();
  if (admin) {
    const current = await admin.storage.from(BUCKET).download(REMOTE_FILE);
    if (current.data) {
      const parsed = JSON.parse(await current.data.text()) as unknown;
      if (!isValidTeacherKnowledgeStore(parsed)) throw new Error("老师知识库对象已存在但结构无效，拒绝自动覆盖。请先人工备份审计。");
      return { id: "teacher-knowledge", outcome: "ALREADY_READY" };
    }
    if (current.error && !isMissingResearchStoreObject(current.error)) {
      throw new Error(`老师知识库初始化前检查失败：${safeResearchStoreError(current.error)}`);
    }
    const seed = readSeed();
    const blob = new Blob([JSON.stringify(seed, null, 2)], { type: "application/json" });
    const { error } = await admin.storage.from(BUCKET).upload(REMOTE_FILE, blob, {
      upsert: false,
      contentType: "application/json",
    });
    if (error) {
      const afterRace = await admin.storage.from(BUCKET).download(REMOTE_FILE);
      if (afterRace.data) {
        let parsed: unknown;
        try { parsed = JSON.parse(await afterRace.data.text()) as unknown; } catch { parsed = null; }
        if (isValidTeacherKnowledgeStore(parsed)) return { id: "teacher-knowledge", outcome: "ALREADY_READY" };
        throw new Error("老师知识库初始化竞争对象结构无效，拒绝把存在误报为成功。");
      }
      throw new Error(`老师知识库初始化失败：${safeResearchStoreError(error)}`);
    }
    return { id: "teacher-knowledge", outcome: "CREATED" };
  }
  const isProd = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
  if (isProd) throw new Error("老师知识库初始化失败：生产环境缺少 Supabase 服务端配置。");
  if (existsSync(LOCAL)) return { id: "teacher-knowledge", outcome: "ALREADY_READY" };
  writeLocal(readSeed());
  return { id: "teacher-knowledge", outcome: "CREATED" };
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
    qimenShadowExtraction: null,
    qimenShadowAttemptMeta: null,
    automationAttemptCount: 0,
    automationNextRetryAt: null,
    automationLastError: null,
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
  const store = await loadStore();
  const idx = store.lessons.findIndex((lesson) => lesson.id === id || lesson.lessonCode === id);
  const existing = idx >= 0 ? store.lessons[idx]! : null;
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
    lessonId: existing.id,
    version: existing.version,
    rawTranscript: existing.rawTranscript,
    cleanedTranscript: existing.cleanedTranscript,
    summary: existing.summary,
    qimenShadowExtraction: existing.qimenShadowExtraction,
    changeReason: patch.changeReason || "编辑前备份",
    changedBy: patch.changedBy || null,
    createdAt: new Date().toISOString(),
  };

  const next: TeacherLessonRecord = {
    ...existing,
    ...patch,
    id: existing.id,
    lessonCode: existing.lessonCode,
    rawTranscript: rawChanging ? String(patch.rawTranscript) : existing.rawTranscript,
    version: nextVersion || existing.version,
    updatedAt: new Date().toISOString(),
  };
  if (rawChanging) {
    next.qimenShadowExtraction = null;
    next.qimenShadowAttemptMeta = null;
  }
  delete (next as { changeReason?: string }).changeReason;
  delete (next as { changedBy?: string | null }).changedBy;

  if (idx >= 0 && !rawChanging && patch.qimenShadowExtraction !== undefined) {
    next.qimenShadowExtraction = preferStableQimenReport(
      store.lessons[idx]!.qimenShadowExtraction,
      next.qimenShadowExtraction,
    );
  }
  store.versions.unshift(versionRow);
  if (idx >= 0) store.lessons[idx] = next;
  await persistStore(store);
  return next;
}

export async function touchTeacherKnowledgeLessonProcessingAttempt(id: string, errorMessage: string): Promise<void> {
  const store = await loadStore();
  const index = store.lessons.findIndex((lesson) => lesson.id === id || lesson.lessonCode === id);
  if (index < 0) return;
  const retry = registerLessonAutomationFailure(store.lessons[index]!);
  store.lessons[index] = {
    ...store.lessons[index]!,
    automationAttemptCount: retry.attemptCount,
    automationNextRetryAt: retry.nextRetryAt,
    automationLastError: errorMessage.slice(0, 500),
    updatedAt: new Date().toISOString(),
  };
  await persistStore(store);
}

export async function resetTeacherKnowledgeLessonProcessingRetry(id: string): Promise<void> {
  const store = await loadStore();
  const index = store.lessons.findIndex((lesson) => lesson.id === id || lesson.lessonCode === id);
  if (index < 0) return;
  store.lessons[index] = {
    ...store.lessons[index]!,
    automationAttemptCount: 0,
    automationNextRetryAt: null,
    automationLastError: null,
    updatedAt: new Date().toISOString(),
  };
  await persistStore(store);
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

export async function listTeacherKnowledgeQimenPacks(limit = 20, options: { serverNow?: Date } = {}): Promise<Array<{
  lesson: Pick<TeacherLessonRecord, "id" | "status" | "updatedAt">;
  qimenShadowExtraction: unknown;
  sourceVersion: string;
  transcriptSha256: string;
  reportSha256: string;
}>> {
  const store = await loadStore();
  const take = Math.max(1, Math.min(100, Math.trunc(limit)));
  return selectValidExtractedQimenRows({
    rows: [...store.lessons]
      .filter((lesson) => ["ANALYZED", "REVIEWING", "APPROVED"].includes(lesson.status))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    reportOf: (lesson) => lesson.qimenShadowExtraction,
    limit: take,
    serverNow: options.serverNow,
  })
    .map((lesson) => ({
      lesson: { id: lesson.id, status: lesson.status, updatedAt: lesson.updatedAt },
      qimenShadowExtraction: lesson.qimenShadowExtraction,
      sourceVersion: `${lesson.version}|${lesson.updatedAt}`,
      transcriptSha256: qimenLessonTranscriptSha256(lesson.rawTranscript),
      reportSha256: qimenLessonTranscriptSha256(JSON.stringify(lesson.qimenShadowExtraction)),
    }));
}

export async function listTeacherKnowledgeQimenBackfillCandidates(limit = 1): Promise<Array<{
  id: string;
  status: TeacherLessonRecord["status"];
  rawTranscript: string;
  transcriptSha256: string;
}>> {
  const store = await loadStore();
  return selectQimenOnlyBackfillRows(
    [...store.lessons].sort((left, right) => left.updatedAt.localeCompare(right.updatedAt)),
    ["ANALYZED", "REVIEWING", "APPROVED"],
    limit,
  ).map((lesson) => ({
    id: lesson.id,
    status: lesson.status,
    rawTranscript: lesson.rawTranscript,
    transcriptSha256: qimenLessonTranscriptSha256(lesson.rawTranscript),
  }));
}

export async function saveTeacherKnowledgeQimenBackfill(input: {
  lessonId: string;
  expectedTranscriptSha256: string;
  report: unknown;
}): Promise<boolean> {
  const store = await loadStore();
  const index = store.lessons.findIndex((lesson) => lesson.id === input.lessonId);
  if (index < 0) return false;
  const current = store.lessons[index]!;
  const now = new Date().toISOString();
  const next = applyTeacherQimenOnlyBackfill({
    current,
    allowedStatuses: ["ANALYZED", "REVIEWING", "APPROVED"],
    expectedTranscriptSha256: input.expectedTranscriptSha256,
    report: input.report,
    updatedAt: now,
  });
  if (!next) return false;
  const outcomeChanged = qimenReportOutcomeSha256(current.qimenShadowExtraction) !== qimenReportOutcomeSha256(input.report);
  const summary = qimenReportAttemptSummary(input.report);
  const attemptMeta = {
    count: Math.max(0, current.qimenShadowAttemptMeta?.count ?? 0) + 1,
    lastAttemptAt: now,
    lastOutcomeSha256: summary?.outcomeSha256 ?? null,
    lastModelStatus: summary?.modelStatus ?? "INVALID_REPORT",
  };
  if (outcomeChanged) {
    store.versions.unshift({
      id: newId("tkv"),
      lessonId: current.id,
      version: current.version,
      rawTranscript: current.rawTranscript,
      cleanedTranscript: current.cleanedTranscript,
      summary: current.summary,
      qimenShadowExtraction: current.qimenShadowExtraction,
      changeReason: "自动奇门补抽前备份",
      changedBy: "AUTOMATION:process-lessons:qimen-backfill",
      createdAt: now,
    });
  }
  store.lessons[index] = outcomeChanged
    ? { ...next, qimenShadowAttemptMeta: attemptMeta, version: current.version + 1 }
    : { ...current, qimenShadowAttemptMeta: attemptMeta, updatedAt: now };
  await persistStore(store);
  return true;
}

export async function isTeacherKnowledgeQimenPackCurrent(snapshot: {
  lessonId: string;
  sourceVersion: string;
  transcriptSha256: string;
  reportSha256: string;
  reportGeneratedAt: string;
}): Promise<boolean> {
  const store = await loadStore();
  const lesson = store.lessons.find((item) => item.id === snapshot.lessonId);
  const report = lesson?.qimenShadowExtraction && typeof lesson.qimenShadowExtraction === "object"
    ? lesson.qimenShadowExtraction as { generatedAt?: unknown; transcriptSha256?: unknown }
    : null;
  return Boolean(
    lesson
    && `${lesson.version}|${lesson.updatedAt}` === snapshot.sourceVersion
    && qimenLessonTranscriptSha256(lesson.rawTranscript) === snapshot.transcriptSha256
    && report?.transcriptSha256 === snapshot.transcriptSha256
    && report?.generatedAt === snapshot.reportGeneratedAt
    && qimenLessonTranscriptSha256(JSON.stringify(lesson.qimenShadowExtraction)) === snapshot.reportSha256
  );
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
      qimenShadowExtraction?: unknown;
      changedBy?: string | null;
  }
): Promise<void> {
  await updateLessonWithVersion(lessonId, {
      summary: payload.summary,
      cleanedTranscript: payload.cleanedTranscript,
      qimenShadowExtraction: payload.qimenShadowExtraction ?? null,
      qimenShadowAttemptMeta: null,
      automationAttemptCount: 0,
      automationNextRetryAt: null,
      automationLastError: null,
      status: "REVIEWING",
      changeReason: "AI整理并生成奇门影子证据",
      changedBy: payload.changedBy ?? null,
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
