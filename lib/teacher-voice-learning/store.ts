/**
 * teacher_notes persistence — Prisma primary, JSON fallback.
 * DB columns: id, audio_url, raw_text, summary, rules, cases, keywords, created_at
 */
import "server-only";

import { randomBytes } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { prisma } from "@/lib/prisma";
import type {
  CallableKnowledgeItem,
  CoreTheoryRules,
  TeacherCaseItem,
  TeacherLearningFeedbackRecord,
  TeacherNoteRecord,
  TeacherNoteStatus,
} from "@/lib/teacher-voice-learning/types";
import type { Prisma } from "@prisma/client";

type Store = {
  version: 1;
  updatedAt: string;
  notes: TeacherNoteRecord[];
  feedback: TeacherLearningFeedbackRecord[];
};

const LOCAL_FILE = resolve(process.cwd(), "data", "teacher-notes.json");

export function newTeacherNoteId(): string {
  return `tn_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`;
}

function empty(): Store {
  return { version: 1, updatedAt: new Date().toISOString(), notes: [], feedback: [] };
}

function asJson<T>(value: T): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

function parseRules(value: unknown): CoreTheoryRules | null {
  if (!value || typeof value !== "object") return null;
  return value as CoreTheoryRules;
}

function parseCases(value: unknown): TeacherCaseItem[] {
  return Array.isArray(value) ? (value as TeacherCaseItem[]) : [];
}

function parseKnowledge(value: unknown): CallableKnowledgeItem[] {
  return Array.isArray(value) ? (value as CallableKnowledgeItem[]) : [];
}

function parseKeywords(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function fromPrismaRow(row: {
  id: string;
  sourceAudio: string;
  rawText: string;
  summary: string;
  rules: unknown;
  cases: unknown;
  knowledge: unknown;
  keywords: unknown;
  status: string;
  progress: number;
  errorMessage: string | null;
  createdTime: Date;
  updatedAt: Date;
}): TeacherNoteRecord {
  return {
    id: row.id,
    sourceAudio: row.sourceAudio,
    rawText: row.rawText,
    summary: row.summary,
    rules: parseRules(row.rules),
    cases: parseCases(row.cases),
    knowledge: parseKnowledge(row.knowledge),
    keywords: parseKeywords(row.keywords),
    status: row.status as TeacherNoteStatus,
    progress: row.progress,
    errorMessage: row.errorMessage,
    createdTime: row.createdTime.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function readLocal(): Store | null {
  try {
    if (!existsSync(LOCAL_FILE)) return null;
    const parsed = JSON.parse(readFileSync(LOCAL_FILE, "utf8")) as Store;
    if (!parsed?.notes) return null;
    return { ...empty(), ...parsed, version: 1 };
  } catch {
    return null;
  }
}

function writeLocal(store: Store): void {
  mkdirSync(resolve(process.cwd(), "data"), { recursive: true });
  writeFileSync(LOCAL_FILE, JSON.stringify(store, null, 2), "utf8");
}

async function readJsonStore(): Promise<Store> {
  return readLocal() ?? empty();
}

async function writeJsonStore(store: Store): Promise<void> {
  writeLocal({ ...store, version: 1, updatedAt: new Date().toISOString() });
}

async function upsertPrisma(note: TeacherNoteRecord): Promise<boolean> {
  if (!prisma) return false;
  try {
    await prisma.teacherNote.upsert({
      where: { id: note.id },
      create: {
        id: note.id,
        sourceAudio: note.sourceAudio,
        rawText: note.rawText,
        summary: note.summary,
        rules: note.rules ? asJson(note.rules) : undefined,
        cases: asJson(note.cases),
        knowledge: asJson(note.knowledge),
        keywords: asJson(note.keywords),
        status: note.status,
        progress: note.progress,
        errorMessage: note.errorMessage,
        createdTime: new Date(note.createdTime),
      },
      update: {
        sourceAudio: note.sourceAudio,
        rawText: note.rawText,
        summary: note.summary,
        rules: note.rules ? asJson(note.rules) : undefined,
        cases: asJson(note.cases),
        knowledge: asJson(note.knowledge),
        keywords: asJson(note.keywords),
        status: note.status,
        progress: note.progress,
        errorMessage: note.errorMessage,
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function listTeacherNotes(): Promise<TeacherNoteRecord[]> {
  if (prisma) {
    try {
      const rows = await prisma.teacherNote.findMany({ orderBy: { createdTime: "desc" } });
      if (rows.length > 0) return rows.map(fromPrismaRow);
    } catch {
      /* fall through to JSON */
    }
  }
  const store = await readJsonStore();
  return [...store.notes].sort((a, b) => b.createdTime.localeCompare(a.createdTime));
}

export async function getTeacherNote(id: string): Promise<TeacherNoteRecord | null> {
  if (prisma) {
    try {
      const row = await prisma.teacherNote.findUnique({ where: { id } });
      if (row) return fromPrismaRow(row);
    } catch {
      /* fall through */
    }
  }
  const store = await readJsonStore();
  return store.notes.find((n) => n.id === id) ?? null;
}

export async function createTeacherNote(input: {
  sourceAudio: string;
}): Promise<TeacherNoteRecord> {
  const now = new Date().toISOString();
  const note: TeacherNoteRecord = {
    id: newTeacherNoteId(),
    sourceAudio: input.sourceAudio,
    rawText: "",
    summary: "",
    rules: null,
    cases: [],
    knowledge: [],
    keywords: [],
    status: "UPLOADED",
    progress: 5,
    errorMessage: null,
    createdTime: now,
    updatedAt: now,
  };

  const saved = await upsertPrisma(note);
  if (!saved) {
    const store = await readJsonStore();
    store.notes.unshift(note);
    await writeJsonStore(store);
  }
  return note;
}

export async function updateTeacherNote(
  id: string,
  patch: Partial<TeacherNoteRecord>
): Promise<TeacherNoteRecord | null> {
  const existing = await getTeacherNote(id);
  if (!existing) return null;
  const next: TeacherNoteRecord = {
    ...existing,
    ...patch,
    id,
    updatedAt: new Date().toISOString(),
  };

  const saved = await upsertPrisma(next);
  if (!saved) {
    const store = await readJsonStore();
    const idx = store.notes.findIndex((n) => n.id === id);
    if (idx < 0) store.notes.unshift(next);
    else store.notes[idx] = next;
    await writeJsonStore(store);
  }
  return next;
}

export async function addLearningFeedback(
  row: Omit<TeacherLearningFeedbackRecord, "id" | "createdAt">
): Promise<TeacherLearningFeedbackRecord> {
  const record: TeacherLearningFeedbackRecord = {
    ...row,
    id: `tfb_${Date.now().toString(36)}_${randomBytes(3).toString("hex")}`,
    createdAt: new Date().toISOString(),
  };

  if (prisma) {
    try {
      await prisma.teacherLearningFeedback.create({
        data: {
          id: record.id,
          teacherNoteId: record.teacherNoteId,
          assetId: record.assetId,
          query: record.query,
          prediction: record.prediction,
          actual: record.actual,
          correct: record.correct,
          reviewNote: record.reviewNote,
        },
      });
      return record;
    } catch {
      /* fall through */
    }
  }

  const store = await readJsonStore();
  store.feedback.unshift(record);
  await writeJsonStore(store);
  return record;
}

export async function listLearningFeedback(): Promise<TeacherLearningFeedbackRecord[]> {
  if (prisma) {
    try {
      const rows = await prisma.teacherLearningFeedback.findMany({
        orderBy: { createdAt: "desc" },
      });
      if (rows.length > 0) {
        return rows.map((r) => ({
          id: r.id,
          teacherNoteId: r.teacherNoteId,
          assetId: r.assetId,
          query: r.query,
          prediction: r.prediction,
          actual: r.actual,
          correct: r.correct,
          reviewNote: r.reviewNote,
          createdAt: r.createdAt.toISOString(),
        }));
      }
    } catch {
      /* fall through */
    }
  }
  return (await readJsonStore()).feedback;
}

export type { CoreTheoryRules, TeacherCaseItem, CallableKnowledgeItem, TeacherNoteStatus };
