import "server-only";

import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  QIMEN_SHADOW_LEDGER_SCHEMA,
  summarizeQimenShadowTrials,
  type QimenShadowSetup,
  type QimenShadowTrial,
} from "@/lib/research/qimen-shadow-ab-core";
import {
  assertQimenFormalForecastAvailableNow,
  assertQimenWriteBeforeDecision,
  prepareQimenShadowEvaluation,
  prepareQimenShadowCandidate,
  prepareQimenShadowObservation,
  qimenShadowCandidateSchema,
  qimenShadowReadingSchema,
  type PreparedQimenShadowCandidate,
  type PreparedQimenShadowObservation,
  type QimenFormalForecastSnapshot,
  type QimenShadowEvaluationInput,
  type QimenShadowCandidateInput,
  type QimenShadowObservationInput,
  type QimenShadowReadingInput,
} from "@/lib/research/qimen-shadow-capture-core";
import {
  prepareQimenShadowReading,
  QIMEN_SHADOW_READING_SCHEMA,
  type PreparedQimenShadowReading,
} from "@/lib/research/qimen-shadow-reading-core";

const OBSERVATION_SCHEMA = "moox.qimen-shadow-observation.v1" as const;
const CANDIDATE_SCHEMA_V1 = "moox.qimen-shadow-candidate.v1" as const;
const CANDIDATE_SCHEMA_V2 = "moox.qimen-shadow-candidate.v2" as const;
const CANDIDATE_SCHEMA = CANDIDATE_SCHEMA_V2;

export class QimenShadowConflictError extends Error {}
export class QimenShadowValidationError extends Error {}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}

export function qimenShadowContentHash(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export async function loadQimenFormalForecast(input: {
  formalForecastKind: "WEEKLY" | "DAILY";
  formalForecastId: string;
}): Promise<QimenFormalForecastSnapshot> {
  const db = prisma;
  if (!db) throw new Error("未配置数据库。");
  if (input.formalForecastKind === "WEEKLY") {
    const row = await db.weeklyForecastSource.findUnique({ where: { id: input.formalForecastId } });
    if (!row) throw new QimenShadowValidationError("找不到指定的正式周预测。");
    return {
      kind: "WEEKLY", id: row.id, marketCode: row.marketCode, periodStart: row.periodStart,
      periodEnd: row.periodEnd, direction: row.weeklyDirection, version: row.version,
      status: row.status, publishedAt: row.publishedAt, lockedAt: row.lockedAt,
    };
  }
  const row = await db.generatedDailyForecast.findUnique({ where: { id: input.formalForecastId } });
  if (!row) throw new QimenShadowValidationError("找不到指定的正式日预测。");
  return {
    kind: "DAILY", id: row.id, marketCode: row.marketCode, periodStart: row.forecastDate,
    periodEnd: row.forecastDate, direction: row.direction, version: row.version,
    status: row.status, publishedAt: row.publishedAt, lockedAt: row.lockedAt,
  };
}

function isUniqueConflict(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");
}

export async function lockQimenShadowObservation(
  input: QimenShadowObservationInput,
  lockedBy: string | null,
  serverNow = new Date(),
) {
  const db = prisma;
  if (!db) throw new Error("未配置数据库。");
  const existing = await db.qimenShadowObservation.findUnique({ where: { id: input.observationId } });
  const formal = await loadQimenFormalForecast(input);
  let prepared: PreparedQimenShadowObservation;
  try {
    prepared = prepareQimenShadowObservation(input, formal);
  } catch (error) {
    throw new QimenShadowValidationError(error instanceof Error ? error.message : "观察单不符合前瞻规则。");
  }
  const immutablePayload = { schemaVersion: OBSERVATION_SCHEMA, ...prepared };
  const sha256 = qimenShadowContentHash(immutablePayload);
  if (existing) {
    if (existing.contentSha256 !== sha256) throw new QimenShadowConflictError("观察编号已存在且内容不同；前瞻观察禁止覆盖。");
    return { created: false, observation: existing };
  }
  if (Date.parse(input.decisionAt) < serverNow.getTime()) {
    throw new QimenShadowValidationError("观察单必须在决策时间之前由服务器锁定。");
  }
  try {
    const observation = await db.qimenShadowObservation.create({
      data: {
        id: input.observationId,
        schemaVersion: OBSERVATION_SCHEMA,
        symbol: prepared.setup.symbol,
        horizon: prepared.setup.horizon,
        officialDirection: prepared.setup.officialDirection,
        formalForecastKind: input.formalForecastKind,
        formalForecastId: prepared.setup.formalForecastId,
        formalForecastVersion: prepared.setup.formalForecastVersion,
        decisionAt: new Date(prepared.setup.decisionAt),
        evaluationDueAt: new Date(prepared.evaluationDueAt),
        setupSnapshot: asJson(prepared),
        contentSha256: sha256,
        lockedBy,
        lockedAt: serverNow,
      },
    });
    return { created: true, observation };
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;
    const concurrent = await db.qimenShadowObservation.findUnique({ where: { id: input.observationId } });
    if (concurrent?.contentSha256 === sha256) return { created: false, observation: concurrent };
    throw new QimenShadowConflictError("观察单发生并发冲突，未写入任何覆盖。");
  }
}

export function verifyQimenShadowObservationRow(row: {
  id: string;
  schemaVersion: string;
  symbol: string;
  horizon: string;
  officialDirection: string;
  formalForecastId: string;
  formalForecastVersion: string;
  decisionAt: Date;
  evaluationDueAt: Date;
  setupSnapshot: Prisma.JsonValue;
  contentSha256: string;
  lockedAt: Date;
}): PreparedQimenShadowObservation {
  if (row.schemaVersion !== OBSERVATION_SCHEMA) throw new Error("观察单版本不受支持。");
  const expectedHash = qimenShadowContentHash({ schemaVersion: row.schemaVersion, ...(row.setupSnapshot as object) });
  if (expectedHash !== row.contentSha256) throw new Error("观察单快照校验失败。");
  const prepared = row.setupSnapshot as unknown as PreparedQimenShadowObservation;
  const setup = prepared.setup;
  if (
    setup.experimentId !== row.id || setup.symbol !== row.symbol || setup.horizon !== row.horizon
    || setup.officialDirection !== row.officialDirection || setup.formalForecastId !== row.formalForecastId
    || setup.formalForecastVersion !== row.formalForecastVersion || Date.parse(setup.decisionAt) !== row.decisionAt.getTime()
    || Date.parse(prepared.evaluationDueAt) !== row.evaluationDueAt.getTime() || row.lockedAt.getTime() > row.decisionAt.getTime()
  ) throw new Error("观察单元数据与锁定快照不一致。");
  return prepared;
}

export async function evaluateQimenShadowObservation(
  input: QimenShadowEvaluationInput,
  createdBy: string | null,
  serverNow = new Date(),
) {
  const db = prisma;
  if (!db) throw new Error("未配置数据库。");
  if (Date.parse(input.evaluatedAt) > serverNow.getTime()) throw new QimenShadowValidationError("不能使用服务器当前时间之后的评估时点。");
  const observation = await db.qimenShadowObservation.findUnique({ where: { id: input.observationId } });
  if (!observation) throw new QimenShadowValidationError("找不到已锁定的前瞻观察单。");
  let locked: PreparedQimenShadowObservation;
  try {
    locked = verifyQimenShadowObservationRow(observation);
  } catch (error) {
    throw new QimenShadowValidationError(error instanceof Error ? error.message : "前瞻观察单校验失败。");
  }
  let prepared: ReturnType<typeof prepareQimenShadowEvaluation>;
  try {
    prepared = prepareQimenShadowEvaluation(locked, input);
  } catch (error) {
    throw new QimenShadowValidationError(error instanceof Error ? error.message : "评估不符合锁定规则。");
  }
  const immutablePayload = {
    schemaVersion: QIMEN_SHADOW_LEDGER_SCHEMA,
    observationSha256: observation.contentSha256,
    setup: prepared.setup,
    candles: prepared.candles,
    trials: prepared.trials,
  };
  const sha256 = qimenShadowContentHash(immutablePayload);
  const existing = await db.qimenShadowExperiment.findUnique({ where: { observationId: observation.id } });
  if (existing) {
    if (existing.contentSha256 !== sha256) throw new QimenShadowConflictError("该观察单已有不同评估；历史结果禁止覆盖。");
    return { created: false, experiment: existing };
  }
  try {
    const experiment = await db.qimenShadowExperiment.create({
      data: {
        id: observation.id,
        observationId: observation.id,
        schemaVersion: QIMEN_SHADOW_LEDGER_SCHEMA,
        symbol: prepared.setup.symbol,
        horizon: prepared.setup.horizon,
        officialDirection: prepared.setup.officialDirection,
        formalForecastKind: observation.formalForecastKind,
        formalForecastId: prepared.setup.formalForecastId,
        formalForecastVersion: prepared.setup.formalForecastVersion,
        decisionAt: new Date(prepared.setup.decisionAt),
        evaluatedAt: new Date(prepared.setup.evaluatedAt),
        setupSnapshot: asJson(prepared.setup),
        candleSnapshot: asJson(prepared.candles),
        trialSnapshot: asJson(prepared.trials),
        contentSha256: sha256,
        createdBy,
      },
    });
    return { created: true, experiment };
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;
    const concurrent = await db.qimenShadowExperiment.findUnique({ where: { observationId: observation.id } });
    if (concurrent?.contentSha256 === sha256) return { created: false, experiment: concurrent };
    throw new QimenShadowConflictError("评估发生并发冲突，未写入任何覆盖。");
  }
}

function parseTrials(value: Prisma.JsonValue): QimenShadowTrial[] {
  if (!Array.isArray(value)) throw new Error("实验结果快照损坏。");
  return value as unknown as QimenShadowTrial[];
}

function verifiedTrials(row: {
  id: string; observationId: string; schemaVersion: string; symbol: string; horizon: string;
  officialDirection: string; formalForecastId: string; formalForecastVersion: string;
  decisionAt: Date; evaluatedAt: Date; setupSnapshot: Prisma.JsonValue; candleSnapshot: Prisma.JsonValue;
  trialSnapshot: Prisma.JsonValue; contentSha256: string; observation: {
    id: string; schemaVersion: string; symbol: string; horizon: string; officialDirection: string;
    formalForecastId: string; formalForecastVersion: string; decisionAt: Date; evaluationDueAt: Date;
    setupSnapshot: Prisma.JsonValue; contentSha256: string; lockedAt: Date;
  };
}): QimenShadowTrial[] {
  const observation = verifyQimenShadowObservationRow(row.observation);
  if (row.schemaVersion !== QIMEN_SHADOW_LEDGER_SCHEMA || row.observationId !== observation.setup.experimentId) throw new Error("实验版本或观察绑定无效。");
  const expectedHash = qimenShadowContentHash({
    schemaVersion: row.schemaVersion, observationSha256: row.observation.contentSha256,
    setup: row.setupSnapshot, candles: row.candleSnapshot, trials: row.trialSnapshot,
  });
  if (expectedHash !== row.contentSha256) throw new Error("实验快照校验失败。");
  const setup = row.setupSnapshot as unknown as QimenShadowSetup;
  const trials = parseTrials(row.trialSnapshot);
  if (
    setup.experimentId !== row.id || setup.symbol !== row.symbol || setup.horizon !== row.horizon
    || setup.officialDirection !== row.officialDirection || setup.formalForecastId !== row.formalForecastId
    || setup.formalForecastVersion !== row.formalForecastVersion || Date.parse(setup.decisionAt) !== row.decisionAt.getTime()
    || Date.parse(setup.evaluatedAt) !== row.evaluatedAt.getTime() || row.evaluatedAt.getTime() < row.observation.evaluationDueAt.getTime()
    || trials.length !== 5 || trials.some((trial) => trial.experimentId !== row.id || trial.sourceForecastId !== row.formalForecastId || trial.sourceForecastVersion !== row.formalForecastVersion)
  ) throw new Error("实验元数据与锁定快照不一致。");
  summarizeQimenShadowTrials(trials);
  return trials;
}

export async function getQimenShadowDashboard(limit = 300) {
  const db = prisma;
  if (!db) throw new Error("未配置数据库。");
  const take = Math.max(1, Math.min(1000, limit));
  const [totalReadings, totalCandidates, totalObservations, totalExperiments, readingSchoolCounts, readings, candidates, automationRuns, observations, rows] = await Promise.all([
    db.qimenShadowReading.count(),
    db.qimenShadowCandidate.count(),
    db.qimenShadowObservation.count(),
    db.qimenShadowExperiment.count(),
    db.qimenShadowReading.groupBy({ by: ["schoolId"], _count: { _all: true } }),
    db.qimenShadowReading.findMany({ orderBy: { decisionAt: "desc" }, take: Math.min(take, 100) }),
    db.qimenShadowCandidate.findMany({ orderBy: { decisionAt: "desc" }, take: Math.min(take, 100) }),
    db.qimenShadowAutomationRun.findMany({ orderBy: { startedAt: "desc" }, take: 20 }),
    db.qimenShadowObservation.findMany({ orderBy: { decisionAt: "desc" }, take, include: { experiment: { select: { id: true } } } }),
    db.qimenShadowExperiment.findMany({ orderBy: { decisionAt: "desc" }, take, include: { observation: true } }),
  ]);
  const trials: QimenShadowTrial[] = [];
  let corruptExperiments = 0;
  for (const row of rows) {
    try { trials.push(...verifiedTrials(row)); } catch { corruptExperiments += 1; }
  }
  return {
    generatedAt: new Date().toISOString(),
    totalReadings,
    totalCandidates,
    totalObservations,
    totalExperiments,
    readingSchoolCounts: Object.fromEntries(readingSchoolCounts.map((item) => [item.schoolId, item._count._all])),
    observations,
    readings,
    candidates,
    automationRuns,
    pendingObservations: Math.max(0, totalObservations - totalExperiments),
    experiments: rows,
    summaries: summarizeQimenShadowTrials(trials),
    corruptExperiments,
  };
}

export async function registerQimenShadowReading(
  input: QimenShadowReadingInput,
  createdBy: string | null,
  options: { clock?: () => Date } = {},
) {
  const db = prisma;
  if (!db) throw new Error("未配置数据库。");
  const existing = await db.qimenShadowReading.findUnique({ where: { id: input.readingId } });
  if (existing) {
    const locked = verifyQimenShadowReadingRow(existing);
    const submitted = { ...input, reading: { ...input.reading } };
    const stored = {
      readingId: locked.readingId,
      studyKey: locked.studyKey,
      formalForecastKind: locked.formalForecastKind,
      formalForecastId: locked.formalForecastId,
      ...(locked.expectedFormalForecastVersion ? { expectedFormalForecastVersion: locked.expectedFormalForecastVersion } : {}),
      horizon: locked.horizon,
      decisionAt: locked.decisionAt,
      evaluationDueAt: locked.evaluationDueAt,
      reading: locked.reading,
      ...(locked.sourceEvidence ? { sourceEvidence: locked.sourceEvidence } : {}),
    };
    if (canonicalJson(submitted) === canonicalJson(stored)) return { created: false, reading: existing };
    throw new QimenShadowConflictError("奇门读数编号已存在且内容不同；禁止覆盖。需要修订时必须使用新的研究编号。");
  }
  const formal = await loadQimenFormalForecast(input);
  if (createdBy === "AUTOMATION:qimen-lesson-ingestion" && (!input.sourceEvidence || !input.expectedFormalForecastVersion)) {
    throw new QimenShadowValidationError("自动课程读数必须保存不可变逐字证据快照并锁定预期正式版本。");
  }
  const clock = options.clock ?? (() => new Date());
  let serverNow = clock();
  try {
    assertQimenFormalForecastAvailableNow(formal, serverNow);
  } catch (error) {
    throw new QimenShadowValidationError(error instanceof Error ? error.message : "正式预测当前不可用。");
  }
  let prepared: PreparedQimenShadowReading;
  try {
    prepared = prepareQimenShadowReading(input, formal);
  } catch (error) {
    throw new QimenShadowValidationError(error instanceof Error ? error.message : "奇门读数不符合前瞻规则。");
  }
  serverNow = clock();
  try {
    assertQimenFormalForecastAvailableNow(formal, serverNow);
    assertQimenWriteBeforeDecision(prepared.decisionAt, serverNow);
  } catch (error) {
    throw new QimenShadowValidationError(error instanceof Error ? error.message : "奇门读数不满足当前前瞻时间。");
  }
  if (Date.parse(prepared.reading.recordedAt) > serverNow.getTime()) throw new QimenShadowValidationError("奇门读数记录时间不能晚于服务器接收时间。");
  const immutablePayload = { schemaVersion: QIMEN_SHADOW_READING_SCHEMA, reading: prepared };
  const sha256 = qimenShadowContentHash(immutablePayload);
  try {
    const reading = await db.qimenShadowReading.create({
      data: {
        id: prepared.readingId,
        schemaVersion: QIMEN_SHADOW_READING_SCHEMA,
        studyKey: prepared.studyKey,
        schoolId: prepared.reading.schoolId,
        formalForecastKind: prepared.formalForecastKind,
        formalForecastId: prepared.formalForecastId,
        formalForecastVersion: prepared.formalForecastVersion,
        horizon: prepared.horizon,
        decisionAt: new Date(prepared.decisionAt),
        evaluationDueAt: new Date(prepared.evaluationDueAt),
        direction: prepared.reading.direction,
        confidence: prepared.reading.confidence,
        readiness: prepared.reading.readiness,
        sourceId: prepared.reading.sourceId,
        chartId: prepared.reading.chartId,
        recordedAt: new Date(prepared.reading.recordedAt),
        evidenceSha256: prepared.reading.evidenceSha256,
        readingSnapshot: asJson(prepared),
        contentSha256: sha256,
        createdBy,
        createdAt: serverNow,
      },
    });
    return { created: true, reading };
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;
    const concurrent = await db.qimenShadowReading.findUnique({ where: { id: input.readingId } });
    if (concurrent?.contentSha256 === sha256) return { created: false, reading: concurrent };
    const competingSchool = await db.qimenShadowReading.findUnique({
      where: { studyKey_schoolId: { studyKey: prepared.studyKey, schoolId: prepared.reading.schoolId } },
    });
    if (competingSchool) {
      throw new QimenShadowConflictError("同一研究窗口已经锁定该流派读数；禁止重复计票或用新课程覆盖。 ".trim());
    }
    throw new QimenShadowConflictError("奇门读数发生并发冲突，未覆盖任何内容。");
  }
}

export function verifyQimenShadowReadingRow(row: {
  id: string; schemaVersion: string; studyKey: string; schoolId: string;
  formalForecastKind: string; formalForecastId: string; formalForecastVersion: string;
  horizon: string; decisionAt: Date; evaluationDueAt: Date; direction: string;
  confidence: number; readiness: string; sourceId: string; chartId: string;
  recordedAt: Date; evidenceSha256: string; readingSnapshot: Prisma.JsonValue;
  contentSha256: string; createdAt: Date;
}): PreparedQimenShadowReading {
  if (row.schemaVersion !== QIMEN_SHADOW_READING_SCHEMA) throw new Error("奇门读数版本不受支持。");
  const prepared = row.readingSnapshot as unknown as PreparedQimenShadowReading;
  const parsed = qimenShadowReadingSchema.safeParse({
    readingId: prepared.readingId,
    studyKey: prepared.studyKey,
    formalForecastKind: prepared.formalForecastKind,
    formalForecastId: prepared.formalForecastId,
    ...(prepared.expectedFormalForecastVersion ? { expectedFormalForecastVersion: prepared.expectedFormalForecastVersion } : {}),
    horizon: prepared.horizon,
    decisionAt: prepared.decisionAt,
    evaluationDueAt: prepared.evaluationDueAt,
    reading: prepared.reading,
    ...(prepared.sourceEvidence ? { sourceEvidence: prepared.sourceEvidence } : {}),
  });
  const expectedHash = qimenShadowContentHash({ schemaVersion: row.schemaVersion, reading: row.readingSnapshot });
  if (!parsed.success || expectedHash !== row.contentSha256) throw new Error("奇门读数快照结构或哈希无效。");
  if (
    prepared.readingId !== row.id || prepared.studyKey !== row.studyKey || prepared.reading.schoolId !== row.schoolId
    || prepared.formalForecastKind !== row.formalForecastKind || prepared.formalForecastId !== row.formalForecastId
    || prepared.formalForecastVersion !== row.formalForecastVersion || prepared.horizon !== row.horizon
    || Date.parse(prepared.decisionAt) !== row.decisionAt.getTime() || Date.parse(prepared.evaluationDueAt) !== row.evaluationDueAt.getTime()
    || prepared.reading.direction !== row.direction || prepared.reading.confidence !== row.confidence
    || prepared.reading.readiness !== row.readiness || prepared.reading.sourceId !== row.sourceId
    || prepared.reading.chartId !== row.chartId || Date.parse(prepared.reading.recordedAt) !== row.recordedAt.getTime()
    || prepared.reading.evidenceSha256 !== row.evidenceSha256 || row.createdAt.getTime() >= row.decisionAt.getTime()
  ) throw new Error("奇门读数元数据与不可变快照不一致。");
  return prepared;
}

export async function registerQimenShadowCandidate(
  input: QimenShadowCandidateInput,
  createdBy: string | null,
  options: { clock?: () => Date } = {},
) {
  const db = prisma;
  if (!db) throw new Error("未配置数据库。");
  const existing = await db.qimenShadowCandidate.findUnique({ where: { id: input.candidateId } });
  if (existing) {
    const locked = verifyQimenShadowCandidateRow(existing);
    const submitted = {
      candidateId: input.candidateId,
      studyKey: input.studyKey,
      formalForecastKind: input.formalForecastKind,
      formalForecastId: input.formalForecastId,
      horizon: input.horizon,
      decisionAt: input.decisionAt,
      evaluationDueAt: input.evaluationDueAt,
      methodReadings: [...input.methodReadings].sort((a, b) => a.schoolId.localeCompare(b.schoolId)),
    };
    const stored = {
      candidateId: locked.candidateId,
      studyKey: locked.studyKey,
      formalForecastKind: locked.formalForecastKind,
      formalForecastId: locked.formalForecastId,
      horizon: locked.horizon,
      decisionAt: locked.decisionAt,
      evaluationDueAt: locked.evaluationDueAt,
      methodReadings: [...locked.methodReadings],
    };
    if (canonicalJson(submitted) === canonicalJson(stored)) return { created: false, candidate: existing };
    throw new QimenShadowConflictError("候选编号已存在且内容不同；禁止覆盖。");
  }
  const formal = await loadQimenFormalForecast(input);
  const clock = options.clock ?? (() => new Date());
  let serverNow = clock();
  try {
    assertQimenFormalForecastAvailableNow(formal, serverNow);
  } catch (error) {
    throw new QimenShadowValidationError(error instanceof Error ? error.message : "正式预测当前不可用。");
  }
  let prepared: PreparedQimenShadowCandidate;
  try {
    prepared = prepareQimenShadowCandidate(input, formal);
  } catch (error) {
    throw new QimenShadowValidationError(error instanceof Error ? error.message : "候选不符合前瞻规则。");
  }
  const immutablePayload = { schemaVersion: CANDIDATE_SCHEMA, candidate: prepared };
  const sha256 = qimenShadowContentHash(immutablePayload);
  serverNow = clock();
  try {
    assertQimenFormalForecastAvailableNow(formal, serverNow);
    assertQimenWriteBeforeDecision(prepared.decisionAt, serverNow);
  } catch (error) {
    throw new QimenShadowValidationError(error instanceof Error ? error.message : "候选不满足当前前瞻时间。");
  }
  try {
    const candidate = await db.qimenShadowCandidate.create({
      data: {
        id: prepared.candidateId,
        studyKey: prepared.studyKey,
        schemaVersion: CANDIDATE_SCHEMA,
        symbol: prepared.symbol,
        horizon: prepared.horizon,
        formalForecastKind: prepared.formalForecastKind,
        formalForecastId: prepared.formalForecastId,
        formalForecastVersion: prepared.formalForecastVersion,
        decisionAt: new Date(prepared.decisionAt),
        evaluationDueAt: new Date(prepared.evaluationDueAt),
        candleIntervalMinutes: prepared.candleIntervalMinutes,
        methodSnapshot: asJson(prepared),
        contentSha256: sha256,
        createdBy,
        createdAt: serverNow,
      },
    });
    return { created: true, candidate };
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;
    const concurrent = await db.qimenShadowCandidate.findUnique({ where: { id: input.candidateId } });
    if (concurrent?.contentSha256 === sha256) return { created: false, candidate: concurrent };
    throw new QimenShadowConflictError("候选发生并发冲突，未覆盖任何内容。");
  }
}

export function verifyQimenShadowCandidateRow(row: {
  id: string;
  studyKey: string | null;
  schemaVersion: string;
  symbol: string;
  horizon: string;
  formalForecastKind: string;
  formalForecastId: string;
  formalForecastVersion: string;
  decisionAt: Date;
  evaluationDueAt: Date;
  candleIntervalMinutes: number;
  methodSnapshot: Prisma.JsonValue;
  contentSha256: string;
  createdAt: Date;
}): PreparedQimenShadowCandidate {
  if (row.schemaVersion !== CANDIDATE_SCHEMA_V1 && row.schemaVersion !== CANDIDATE_SCHEMA_V2) throw new Error("候选版本不受支持。");
  const snapshot = row.methodSnapshot as unknown as Omit<PreparedQimenShadowCandidate, "studyKey"> & { studyKey?: unknown };
  const studyKey = row.schemaVersion === CANDIDATE_SCHEMA_V2
    ? snapshot.studyKey
    : row.studyKey ?? `legacy:${row.id}`;
  const prepared = { ...snapshot, studyKey } as PreparedQimenShadowCandidate;
  const parsedSource = qimenShadowCandidateSchema.safeParse({
    candidateId: prepared.candidateId,
    studyKey: prepared.studyKey,
    formalForecastKind: prepared.formalForecastKind,
    formalForecastId: prepared.formalForecastId,
    expectedFormalForecastVersion: prepared.formalForecastVersion,
    horizon: prepared.horizon,
    decisionAt: prepared.decisionAt,
    evaluationDueAt: prepared.evaluationDueAt,
    methodReadings: prepared.methodReadings,
  });
  if (!parsedSource.success || !["LONG", "SHORT"].includes(prepared.officialDirection) || prepared.candleIntervalMinutes !== 60) {
    throw new Error("候选不可变快照结构无效。");
  }
  const expectedHash = qimenShadowContentHash({ schemaVersion: row.schemaVersion, candidate: row.methodSnapshot });
  if (expectedHash !== row.contentSha256) throw new Error("候选快照哈希校验失败。");
  if (
    prepared.candidateId !== row.id
    || (row.schemaVersion === CANDIDATE_SCHEMA_V2 && (!row.studyKey || prepared.studyKey !== row.studyKey))
    || (row.schemaVersion === CANDIDATE_SCHEMA_V1 && row.studyKey !== null && prepared.studyKey !== row.studyKey)
    || prepared.symbol !== row.symbol || prepared.horizon !== row.horizon
    || prepared.formalForecastKind !== row.formalForecastKind || prepared.formalForecastId !== row.formalForecastId
    || prepared.formalForecastVersion !== row.formalForecastVersion || Date.parse(prepared.decisionAt) !== row.decisionAt.getTime()
    || Date.parse(prepared.evaluationDueAt) !== row.evaluationDueAt.getTime()
    || prepared.candleIntervalMinutes !== row.candleIntervalMinutes || row.createdAt.getTime() >= row.decisionAt.getTime()
  ) throw new Error("候选元数据与不可变快照不一致。");
  return prepared;
}
