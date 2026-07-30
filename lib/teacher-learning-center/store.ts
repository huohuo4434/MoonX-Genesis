/**
 * Legacy Teacher Learning Center — JSON-only (audio pipeline frozen).
 * Formal knowledge lives in lib/teacher-knowledge.
 */
import "server-only";

import { randomBytes } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import {
  defaultProgress,
  type KnowledgeGrowthStats,
  type TeacherLessonRecord,
} from "@/lib/teacher-learning-center/types";

type StoreFile = {
  version: 1;
  updatedAt: string;
  lessons: TeacherLessonRecord[];
  ruleSeq: number;
  logs: Array<{
    id: string;
    day: string;
    lessonId: string | null;
    lessonTitle: string;
    rulesAdded: number;
    casesAdded: number;
    rulesRevised: number;
    pendingReview: number;
    note: string | null;
    createdAt: string;
  }>;
  published: {
    rules: Array<{
      id: string;
      code: string;
      lessonId: string;
      title: string;
      content: string;
      sourceMinute: string | null;
      confidence: string;
      status: string;
      createdAt: string;
    }>;
    cases: Array<{
      id: string;
      lessonId: string;
      assetName: string;
      question: string;
      teacherConclusion: string;
      sourceText: string;
      status: string;
      createdAt: string;
    }>;
    concepts: Array<{
      id: string;
      lessonId: string;
      kind: string;
      title: string;
      content: string;
      status: string;
      createdAt: string;
    }>;
    quotes: Array<{
      id: string;
      lessonId: string;
      text: string;
      sourceMinute: string | null;
      status: string;
      createdAt: string;
    }>;
  };
};

const LOCAL_FILE = resolve(process.cwd(), "data", "teacher-learning-center.json");

function empty(): StoreFile {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    lessons: [],
    ruleSeq: 0,
    logs: [],
    published: { rules: [], cases: [], concepts: [], quotes: [] },
  };
}

function readLocal(): StoreFile {
  try {
    if (!existsSync(LOCAL_FILE)) return empty();
    return { ...empty(), ...(JSON.parse(readFileSync(LOCAL_FILE, "utf8")) as StoreFile), version: 1 };
  } catch {
    return empty();
  }
}

function writeLocal(store: StoreFile) {
  mkdirSync(resolve(process.cwd(), "data"), { recursive: true });
  writeFileSync(LOCAL_FILE, JSON.stringify({ ...store, updatedAt: new Date().toISOString() }, null, 2), "utf8");
}

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`;
}

export async function listLessons(): Promise<TeacherLessonRecord[]> {
  return [...readLocal().lessons].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getLesson(id: string) {
  return readLocal().lessons.find((l) => l.id === id) ?? null;
}

export async function createLesson(input: {
  title: string;
  fileName: string;
  fileSize: number;
  durationSec: number | null;
  mime: string | null;
  audioUrl: string;
}): Promise<TeacherLessonRecord> {
  const now = new Date().toISOString();
  const lesson: TeacherLessonRecord = {
    id: newId("tl"),
    title: input.title,
    fileName: input.fileName,
    fileSize: input.fileSize,
    durationSec: input.durationSec,
    mime: input.mime,
    audioUrl: input.audioUrl,
    wavUrl: null,
    rawText: "",
    segments: [],
    courseSummary: "",
    coreViews: "",
    classicQuotes: [],
    draftRules: [],
    draftCases: [],
    draftConcepts: [],
    draftQuotes: [],
    draftMnemonics: [],
    draftExceptions: [],
    draftPredictions: [],
    status: "UPLOADED",
    progress: defaultProgress(),
    errorMessage: null,
    publishedAt: null,
    learningSeconds: 0,
    createdAt: now,
    updatedAt: now,
  };
  const store = readLocal();
  store.lessons.unshift(lesson);
  writeLocal(store);
  return lesson;
}

export async function updateLesson(id: string, patch: Partial<TeacherLessonRecord>) {
  const store = readLocal();
  const idx = store.lessons.findIndex((l) => l.id === id);
  if (idx < 0) return null;
  const next = { ...store.lessons[idx]!, ...patch, id, updatedAt: new Date().toISOString() };
  store.lessons[idx] = next;
  writeLocal(store);
  return next;
}

export async function deleteLesson(id: string) {
  const store = readLocal();
  store.lessons = store.lessons.filter((l) => l.id !== id);
  writeLocal(store);
  return true;
}

export async function publishLessonToKnowledgeBase(lessonId: string) {
  const lesson = await getLesson(lessonId);
  if (!lesson) throw new Error("课程不存在");
  const store = readLocal();
  let rulesAdded = 0;
  let casesAdded = 0;
  for (const r of lesson.draftRules) {
    store.ruleSeq += 1;
    store.published.rules.push({
      id: newId("tr"),
      code: `Rule${String(store.ruleSeq).padStart(4, "0")}`,
      lessonId,
      title: r.title,
      content: r.content,
      sourceMinute: r.sourceMinute,
      confidence: "Draft",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    });
    rulesAdded += 1;
  }
  for (const c of lesson.draftCases) {
    store.published.cases.push({
      id: newId("tc"),
      lessonId,
      assetName: c.assetName,
      question: c.question,
      teacherConclusion: c.teacherConclusion,
      sourceText: c.sourceText,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    });
    casesAdded += 1;
  }
  writeLocal(store);
  await updateLesson(lessonId, { status: "PUBLISHED", publishedAt: new Date().toISOString() });
  return { rulesAdded, casesAdded, conceptsAdded: 0, quotesAdded: 0 };
}

export async function appendLearningLog() {
  /* no-op legacy */
}

export async function listLearningLogs() {
  return readLocal().logs;
}

export async function searchTeacherKnowledge(query: string) {
  const q = query.trim().toLowerCase();
  const store = readLocal();
  const lessons = store.lessons.filter((l) => l.title.toLowerCase().includes(q) || l.rawText.toLowerCase().includes(q));
  return {
    lessons,
    rules: store.published.rules.filter((r) => r.title.toLowerCase().includes(q) || r.content.toLowerCase().includes(q)),
    cases: store.published.cases.filter((c) => c.assetName.toLowerCase().includes(q)),
    concepts: store.published.concepts.filter((c) => c.title.toLowerCase().includes(q)),
    quotes: store.published.quotes.filter((qt) => qt.text.toLowerCase().includes(q)),
  };
}

export async function getKnowledgeGrowthStats(): Promise<KnowledgeGrowthStats> {
  const store = readLocal();
  const learningSeconds = store.lessons.reduce((s, l) => s + (l.durationSec || 0), 0);
  return {
    lessonCount: store.lessons.length,
    learningHours: Math.round((learningSeconds / 3600) * 10) / 10,
    ruleCount: store.published.rules.length,
    caseCount: store.published.cases.length,
    quoteCount: store.published.quotes.length,
  };
}

export async function listActiveTeacherRules(limit = 50) {
  return readLocal()
    .published.rules.filter((r) => r.status === "ACTIVE")
    .slice(0, limit)
    .map((r) => ({
      id: r.id,
      code: r.code,
      title: r.title,
      content: r.content,
      status: r.status,
    }));
}
