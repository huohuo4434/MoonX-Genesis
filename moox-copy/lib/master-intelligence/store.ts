/**
 * Master Intelligence JSON store — works without Prisma.
 * Primary remote: moonx-data/master-intelligence/store.json
 * Local: data/master-intelligence.json
 */
import "server-only";

import { randomBytes } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { getAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import type {
  CaseHitStatus,
  KnowledgeKind,
  LessonSource,
  LessonStatus,
  ReviewStatus,
} from "@/lib/master-intelligence/types";

export type LessonRecord = {
  id: string;
  title: string;
  teacher: string;
  course: string | null;
  lessonNumber: number | null;
  uploadTime: string;
  durationSec: number | null;
  source: LessonSource;
  status: LessonStatus;
  mediaPath: string | null;
  mediaMime: string | null;
  mediaSize: number | null;
  mediaFileName: string | null;
  errorMessage: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TranscriptRecord = {
  id: string;
  lessonId: string;
  rawText: string;
  cleanText: string;
  language: string;
  rawLocked: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ExtractionRecord = {
  id: string;
  lessonId: string;
  status: ReviewStatus | "DRAFT" | "REVIEWING" | "PUBLISHED";
  summary: string | null;
  rulesJson: unknown;
  casesJson: unknown;
  conceptsJson: unknown;
  formulasJson: unknown;
  exceptionsJson: unknown;
  predictionsJson: unknown;
  quotesJson: unknown;
  lessonOutputJson: unknown;
  createdAt: string;
  updatedAt: string;
};

export type CandidateRecord = {
  id: string;
  lessonId: string | null;
  kind: KnowledgeKind;
  title: string;
  body: string;
  payload: unknown;
  weightStars: number;
  reviewStatus: ReviewStatus;
  publishedRef: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RuleTreeNodeRecord = {
  id: string;
  ruleCode: string | null;
  parentId: string | null;
  label: string;
  condition: string | null;
  yesChildId: string | null;
  noChildId: string | null;
  outcomeText: string | null;
  sortOrder: number;
};

export type KnowledgeNodeRecord = {
  id: string;
  key: string;
  label: string;
  kind: string;
  weightStars: number;
  sourceLessonId: string | null;
};

export type KnowledgeEdgeRecord = {
  id: string;
  fromKey: string;
  toKey: string;
  relation: string;
  weightStars: number;
  sourceLessonId: string | null;
};

export type ConflictRecord = {
  id: string;
  ruleCodeOrMotif: string;
  leftCandidateId: string | null;
  rightCandidateId: string | null;
  leftText: string;
  rightText: string;
  hypothesizedCause: string | null;
  status: "OPEN" | "RESOLVED";
  resolvedNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MarketWeightRecord = {
  id: string;
  ruleCode: string;
  assetId: string;
  weightStars: number;
  note: string | null;
};

export type PublishedRuleRecord = {
  id: string;
  ruleCode: string;
  title: string;
  category: string;
  ruleText: string;
  teacherOriginalText: string | null;
  status: string;
  lessonId: string | null;
  candidateId: string | null;
  priority: number;
  createdAt: string;
  updatedAt: string;
};

export type PublishedCaseRecord = {
  id: string;
  caseTitle: string;
  assetId: string;
  question: string | null;
  forecastStartAt: string;
  forecastEndAt: string;
  teacherConclusion: string | null;
  actualResult: string | null;
  hitStatus: CaseHitStatus | null;
  lessonId: string | null;
  candidateId: string | null;
  researchId: string | null;
  createdAt: string;
  updatedAt: string;
};

type Store = {
  version: 1;
  updatedAt: string;
  lessons: LessonRecord[];
  transcripts: TranscriptRecord[];
  extractions: ExtractionRecord[];
  candidates: CandidateRecord[];
  ruleTree: RuleTreeNodeRecord[];
  nodes: KnowledgeNodeRecord[];
  edges: KnowledgeEdgeRecord[];
  conflicts: ConflictRecord[];
  marketWeights: MarketWeightRecord[];
  publishedRules: PublishedRuleRecord[];
  publishedCases: PublishedCaseRecord[];
};

const BUCKET = "moonx-data";
const FILE = "master-intelligence/store.json";
const LOCAL_FILE = resolve(process.cwd(), "data", "master-intelligence.json");

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`;
}

function emptyStore(): Store {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    lessons: [],
    transcripts: [],
    extractions: [],
    candidates: [],
    ruleTree: [],
    nodes: [],
    edges: [],
    conflicts: [],
    marketWeights: [],
    publishedRules: [],
    publishedCases: [],
  };
}

function readLocal(): Store | null {
  try {
    if (!existsSync(LOCAL_FILE)) return null;
    const parsed = JSON.parse(readFileSync(LOCAL_FILE, "utf8")) as Store;
    if (!parsed?.lessons) return null;
    return { ...emptyStore(), ...parsed, version: 1 };
  } catch {
    return null;
  }
}

function writeLocal(store: Store): void {
  mkdirSync(resolve(process.cwd(), "data"), { recursive: true });
  writeFileSync(LOCAL_FILE, JSON.stringify(store, null, 2), "utf8");
}

async function readStore(): Promise<Store> {
  try {
    const admin = getAdminClient();
    if (admin) {
      const { data, error } = await admin.storage.from(BUCKET).download(FILE);
      if (!error && data) {
        const parsed = JSON.parse(await data.text()) as Store;
        if (parsed?.lessons) return { ...emptyStore(), ...parsed, version: 1 };
      }
    }
  } catch {
    /* fall through */
  }
  return readLocal() ?? emptyStore();
}

async function writeStore(store: Store): Promise<void> {
  const payload: Store = { ...store, version: 1, updatedAt: new Date().toISOString() };
  let wroteRemote = false;
  try {
    const admin = getAdminClient();
    if (admin) {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const { error } = await admin.storage.from(BUCKET).upload(FILE, blob, {
        upsert: true,
        contentType: "application/json",
      });
      if (!error) wroteRemote = true;
    }
  } catch {
    /* ignore */
  }
  if (!process.env.VERCEL) writeLocal(payload);
  else if (!wroteRemote) writeLocal(payload);
}

export async function listLessons(): Promise<LessonRecord[]> {
  const store = await readStore();
  return [...store.lessons].sort((a, b) => b.uploadTime.localeCompare(a.uploadTime));
}

export async function getLesson(id: string): Promise<{
  lesson: LessonRecord;
  transcript: TranscriptRecord | null;
  extraction: ExtractionRecord | null;
  candidates: CandidateRecord[];
} | null> {
  const store = await readStore();
  const lesson = store.lessons.find((l) => l.id === id);
  if (!lesson) return null;
  return {
    lesson,
    transcript: store.transcripts.find((t) => t.lessonId === id) ?? null,
    extraction: store.extractions.find((e) => e.lessonId === id) ?? null,
    candidates: store.candidates.filter((c) => c.lessonId === id),
  };
}

export async function createLesson(input: {
  title: string;
  teacher?: string;
  course?: string | null;
  lessonNumber?: number | null;
  source?: LessonSource;
  mediaPath?: string | null;
  mediaMime?: string | null;
  mediaSize?: number | null;
  mediaFileName?: string | null;
  createdBy?: string | null;
}): Promise<LessonRecord> {
  const store = await readStore();
  const now = new Date().toISOString();
  const lesson: LessonRecord = {
    id: newId("lesson"),
    title: input.title.trim() || "未命名课程",
    teacher: input.teacher?.trim() || "老师",
    course: input.course ?? null,
    lessonNumber: input.lessonNumber ?? null,
    uploadTime: now,
    durationSec: null,
    source: input.source ?? "MASTER",
    status: "UPLOADED",
    mediaPath: input.mediaPath ?? null,
    mediaMime: input.mediaMime ?? null,
    mediaSize: input.mediaSize ?? null,
    mediaFileName: input.mediaFileName ?? null,
    errorMessage: null,
    createdBy: input.createdBy ?? null,
    updatedBy: input.createdBy ?? null,
    createdAt: now,
    updatedAt: now,
  };
  store.lessons.unshift(lesson);
  store.transcripts.push({
    id: newId("tr"),
    lessonId: lesson.id,
    rawText: "",
    cleanText: "",
    language: "zh-CN",
    rawLocked: false,
    createdAt: now,
    updatedAt: now,
  });
  await writeStore(store);

  // Best-effort Prisma mirror
  if (prisma) {
    try {
      await prisma.lesson.create({
        data: {
          id: lesson.id,
          title: lesson.title,
          teacher: lesson.teacher,
          course: lesson.course,
          lessonNumber: lesson.lessonNumber,
          source: lesson.source,
          status: lesson.status,
          mediaPath: lesson.mediaPath,
          mediaMime: lesson.mediaMime,
          mediaSize: lesson.mediaSize,
          mediaFileName: lesson.mediaFileName,
          createdBy: lesson.createdBy,
          updatedBy: lesson.updatedBy,
        },
      });
      await prisma.lessonTranscript.create({
        data: { id: newId("tr"), lessonId: lesson.id, rawText: "", cleanText: "" },
      });
    } catch {
      /* JSON is source of truth when Prisma lagging */
    }
  }

  return lesson;
}

export async function updateLesson(
  id: string,
  patch: Partial<LessonRecord>
): Promise<LessonRecord | null> {
  const store = await readStore();
  const idx = store.lessons.findIndex((l) => l.id === id);
  if (idx < 0) return null;
  const next = {
    ...store.lessons[idx]!,
    ...patch,
    id,
    updatedAt: new Date().toISOString(),
  };
  store.lessons[idx] = next;
  await writeStore(store);
  return next;
}

/** Set raw transcript once; subsequent non-empty writes rejected if locked. */
export async function setRawTranscript(
  lessonId: string,
  rawText: string,
  opts?: { force?: boolean }
): Promise<TranscriptRecord | null> {
  const store = await readStore();
  const t = store.transcripts.find((x) => x.lessonId === lessonId);
  if (!t) return null;
  if (t.rawLocked && t.rawText.trim() && !opts?.force) {
    throw new Error("Raw Transcript 已锁定，不可修改");
  }
  const now = new Date().toISOString();
  t.rawText = rawText;
  if (rawText.trim()) t.rawLocked = true;
  t.updatedAt = now;
  await writeStore(store);
  return t;
}

export async function setCleanTranscript(
  lessonId: string,
  cleanText: string
): Promise<TranscriptRecord | null> {
  const store = await readStore();
  const t = store.transcripts.find((x) => x.lessonId === lessonId);
  if (!t) return null;
  t.cleanText = cleanText;
  t.updatedAt = new Date().toISOString();
  await writeStore(store);
  return t;
}

export async function upsertExtraction(
  lessonId: string,
  data: Partial<ExtractionRecord> & { summary?: string | null }
): Promise<ExtractionRecord> {
  const store = await readStore();
  const now = new Date().toISOString();
  let ex = store.extractions.find((e) => e.lessonId === lessonId);
  if (!ex) {
    ex = {
      id: newId("ex"),
      lessonId,
      status: "DRAFT",
      summary: null,
      rulesJson: null,
      casesJson: null,
      conceptsJson: null,
      formulasJson: null,
      exceptionsJson: null,
      predictionsJson: null,
      quotesJson: null,
      lessonOutputJson: null,
      createdAt: now,
      updatedAt: now,
    };
    store.extractions.push(ex);
  }
  Object.assign(ex, data, { updatedAt: now });
  await writeStore(store);
  return ex;
}

export async function replaceCandidatesForLesson(
  lessonId: string,
  items: Array<Omit<CandidateRecord, "id" | "createdAt" | "updatedAt" | "lessonId" | "publishedRef" | "reviewStatus"> & {
    reviewStatus?: ReviewStatus;
  }>
): Promise<CandidateRecord[]> {
  const store = await readStore();
  const now = new Date().toISOString();
  store.candidates = store.candidates.filter(
    (c) => c.lessonId !== lessonId || c.reviewStatus === "APPROVED" || c.reviewStatus === "PUBLISHED"
  );
  const created: CandidateRecord[] = items.map((item) => ({
    id: newId("cand"),
    lessonId,
    kind: item.kind,
    title: item.title,
    body: item.body,
    payload: item.payload ?? null,
    weightStars: item.weightStars,
    reviewStatus: item.reviewStatus ?? "DRAFT",
    publishedRef: null,
    createdAt: now,
    updatedAt: now,
  }));
  store.candidates.unshift(...created);
  await writeStore(store);
  return created;
}

export async function listCandidates(filter?: {
  reviewStatus?: ReviewStatus;
}): Promise<CandidateRecord[]> {
  const store = await readStore();
  let rows = [...store.candidates];
  if (filter?.reviewStatus) rows = rows.filter((c) => c.reviewStatus === filter.reviewStatus);
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateCandidate(
  id: string,
  patch: Partial<CandidateRecord>
): Promise<CandidateRecord | null> {
  const store = await readStore();
  const idx = store.candidates.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  store.candidates[idx] = {
    ...store.candidates[idx]!,
    ...patch,
    id,
    updatedAt: new Date().toISOString(),
  };
  await writeStore(store);
  return store.candidates[idx]!;
}

export async function listPublishedRules(): Promise<PublishedRuleRecord[]> {
  const store = await readStore();
  const fromJson = store.publishedRules.filter((r) => r.status === "PUBLISHED" || r.status === "ACTIVE");
  if (prisma) {
    try {
      const rows = await prisma.masterRule.findMany({
        where: { status: { in: ["PUBLISHED", "ACTIVE", "DRAFT"] } },
        orderBy: { ruleCode: "asc" },
      });
      if (rows.length) {
        return rows.map((r) => ({
          id: r.id,
          ruleCode: r.ruleCode,
          title: r.title,
          category: r.category,
          ruleText: r.ruleText,
          teacherOriginalText: r.teacherOriginalText,
          status: r.status,
          lessonId: r.lessonId,
          candidateId: r.candidateId,
          priority: r.priority,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        }));
      }
    } catch {
      /* use json */
    }
  }
  return fromJson;
}

export async function upsertPublishedRule(rule: PublishedRuleRecord): Promise<void> {
  const store = await readStore();
  const idx = store.publishedRules.findIndex((r) => r.ruleCode === rule.ruleCode);
  if (idx >= 0) store.publishedRules[idx] = rule;
  else store.publishedRules.push(rule);
  await writeStore(store);
  if (prisma) {
    try {
      await prisma.masterRule.upsert({
        where: { ruleCode: rule.ruleCode },
        create: {
          id: rule.id,
          ruleCode: rule.ruleCode,
          title: rule.title,
          category: rule.category,
          ruleText: rule.ruleText,
          teacherOriginalText: rule.teacherOriginalText,
          status: rule.status,
          lessonId: rule.lessonId,
          candidateId: rule.candidateId,
          priority: rule.priority,
        },
        update: {
          title: rule.title,
          ruleText: rule.ruleText,
          teacherOriginalText: rule.teacherOriginalText,
          status: rule.status,
          lessonId: rule.lessonId,
          candidateId: rule.candidateId,
        },
      });
    } catch {
      /* ignore */
    }
  }
}

export async function listPublishedCases(): Promise<PublishedCaseRecord[]> {
  const store = await readStore();
  return [...store.publishedCases].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function upsertPublishedCase(c: PublishedCaseRecord): Promise<void> {
  const store = await readStore();
  const idx = store.publishedCases.findIndex((x) => x.id === c.id);
  if (idx >= 0) store.publishedCases[idx] = c;
  else store.publishedCases.unshift(c);
  await writeStore(store);
}

export async function listRuleTree(): Promise<RuleTreeNodeRecord[]> {
  return (await readStore()).ruleTree;
}

export async function replaceRuleTree(nodes: RuleTreeNodeRecord[]): Promise<void> {
  const store = await readStore();
  store.ruleTree = nodes;
  await writeStore(store);
}

export async function listGraph(): Promise<{ nodes: KnowledgeNodeRecord[]; edges: KnowledgeEdgeRecord[] }> {
  const store = await readStore();
  return { nodes: store.nodes, edges: store.edges };
}

export async function upsertGraphNode(node: KnowledgeNodeRecord): Promise<void> {
  const store = await readStore();
  const idx = store.nodes.findIndex((n) => n.key === node.key);
  if (idx >= 0) store.nodes[idx] = node;
  else store.nodes.push(node);
  await writeStore(store);
}

export async function upsertGraphEdge(edge: KnowledgeEdgeRecord): Promise<void> {
  const store = await readStore();
  const idx = store.edges.findIndex(
    (e) => e.fromKey === edge.fromKey && e.toKey === edge.toKey && e.relation === edge.relation
  );
  if (idx >= 0) store.edges[idx] = edge;
  else store.edges.push(edge);
  await writeStore(store);
}

export async function listConflicts(): Promise<ConflictRecord[]> {
  return (await readStore()).conflicts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addConflicts(rows: ConflictRecord[]): Promise<void> {
  const store = await readStore();
  for (const row of rows) {
    const dup = store.conflicts.some(
      (c) =>
        c.status === "OPEN" &&
        c.ruleCodeOrMotif === row.ruleCodeOrMotif &&
        c.leftText === row.leftText &&
        c.rightText === row.rightText
    );
    if (!dup) store.conflicts.unshift(row);
  }
  await writeStore(store);
}

export async function updateConflict(
  id: string,
  patch: Partial<ConflictRecord>
): Promise<ConflictRecord | null> {
  const store = await readStore();
  const idx = store.conflicts.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  store.conflicts[idx] = {
    ...store.conflicts[idx]!,
    ...patch,
    id,
    updatedAt: new Date().toISOString(),
  };
  await writeStore(store);
  return store.conflicts[idx]!;
}

export async function listMarketWeights(): Promise<MarketWeightRecord[]> {
  return (await readStore()).marketWeights;
}

export async function upsertMarketWeight(row: MarketWeightRecord): Promise<void> {
  const store = await readStore();
  const idx = store.marketWeights.findIndex(
    (m) => m.ruleCode === row.ruleCode && m.assetId === row.assetId
  );
  if (idx >= 0) store.marketWeights[idx] = row;
  else store.marketWeights.push(row);
  await writeStore(store);
}

export async function getFullStore(): Promise<Store> {
  return readStore();
}
