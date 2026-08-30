import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";

import { loadChanCandles, type LoadedChanCandles } from "@/lib/market-data/chan-market-data";
import {
  buildQimenShadowObservationFromTechnical,
  classifyQimenShadowCandidateTiming,
  mapClosedHourlyCandlesForEvaluation,
  QimenShadowAutomationSkipError,
  QIMEN_SHADOW_AUTOMATION_SCHEMA,
  QIMEN_SHADOW_LOCK_MAX_LEAD_MS,
  QIMEN_SHADOW_LOCK_MIN_LEAD_MS,
  resolveQimenShadowAutomationInstrument,
} from "@/lib/research/qimen-shadow-automation-core";
import {
  evaluateQimenShadowObservation,
  lockQimenShadowObservation,
  qimenShadowContentHash,
  verifyQimenShadowCandidateRow,
  verifyQimenShadowObservationRow,
} from "@/lib/research/qimen-shadow-store";
import { analyzeChanStructure } from "@/lib/trading-signals/chan-structure-core";
import { deriveChanStage } from "@/lib/trading-signals/chan-stage-core";
import { prisma } from "@/lib/prisma";
import {
  pairFutureQimenShadowReadings,
  type QimenShadowPairingResult,
} from "@/lib/research/qimen-shadow-reading-pairer";

const ACTOR = "AUTOMATION:qimen-shadow";
const BATCH_SIZE = 4;
const RUN_BUDGET_MS = 55_000;
const PAIR_BUDGET_MS = 10_000;

type ItemResult = { id: string; symbol: string; status: "CREATED" | "UNCHANGED" | "SKIPPED" | "FAILED"; reason?: string };

function safeReason(error: unknown): string {
  return (error instanceof Error ? error.message : "UNKNOWN_ERROR").replace(/[\r\n\t]+/g, " ").slice(0, 240);
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function runQimenShadowAutomation(serverNow = new Date()) {
  const db = prisma;
  if (!db) throw new Error("未配置数据库。");
  const startedAt = new Date(serverNow);
  const deadlineMs = Date.now() + RUN_BUDGET_MS;
  const marketCache = new Map<string, Promise<LoadedChanCandles>>();
  const loadMarket = (symbol: string) => {
    const instrument = resolveQimenShadowAutomationInstrument(symbol);
    if (!instrument) return null;
    const key = instrument.symbol;
    let pending = marketCache.get(key);
    if (!pending) {
      pending = loadChanCandles({
        symbol: instrument.symbol,
        instrument,
        timeframe: "1H",
        capturedNowMs: startedAt.getTime(),
        timeoutMs: 4_500,
      });
      marketCache.set(key, pending);
    }
    return pending;
  };

  const lockResults: ItemResult[] = [];
  const evaluationResults: ItemResult[] = [];
  const candidatePool = await db.qimenShadowCandidate.findMany({
    where: {
      decisionAt: {
        gte: new Date(startedAt.getTime() + QIMEN_SHADOW_LOCK_MIN_LEAD_MS),
        lte: new Date(startedAt.getTime() + QIMEN_SHADOW_LOCK_MAX_LEAD_MS),
      },
    },
    orderBy: { decisionAt: "asc" },
    take: 100,
  });
  const existingObservationIds = candidatePool.length
    ? new Set((await db.qimenShadowObservation.findMany({ where: { id: { in: candidatePool.map((row) => row.id) } }, select: { id: true } })).map((row) => row.id))
    : new Set<string>();
  const candidateRows = candidatePool.filter((row) => !existingObservationIds.has(row.id)).slice(0, BATCH_SIZE);

  for (const row of candidateRows) {
    if (Date.now() >= deadlineMs - 5_000) {
      lockResults.push({ id: row.id, symbol: row.symbol, status: "SKIPPED", reason: "RUN_BUDGET_EXHAUSTED" });
      continue;
    }
    try {
      const candidate = verifyQimenShadowCandidateRow(row);
      if (classifyQimenShadowCandidateTiming(candidate.decisionAt, startedAt.getTime()) !== "READY") {
        lockResults.push({ id: row.id, symbol: row.symbol, status: "SKIPPED", reason: "OUTSIDE_LOCK_WINDOW" });
        continue;
      }
      const marketPromise = loadMarket(candidate.symbol);
      if (!marketPromise) {
        lockResults.push({ id: row.id, symbol: row.symbol, status: "SKIPPED", reason: "UNSUPPORTED_24X7_CRYPTO_V1" });
        continue;
      }
      const market = await marketPromise;
      if (!market.candles.length) throw new Error(`CLOSED_KLINE_UNAVAILABLE:${market.error ?? "EMPTY"}`);
      const stage = deriveChanStage(analyzeChanStructure(market.candles));
      const observation = buildQimenShadowObservationFromTechnical({
        candidate,
        stage,
        technicalRecordedAt: startedAt.toISOString(),
      });
      const result = await lockQimenShadowObservation(observation, ACTOR, startedAt);
      lockResults.push({ id: row.id, symbol: row.symbol, status: result.created ? "CREATED" : "UNCHANGED" });
    } catch (error) {
      lockResults.push({
        id: row.id,
        symbol: row.symbol,
        status: error instanceof QimenShadowAutomationSkipError ? "SKIPPED" : "FAILED",
        reason: safeReason(error),
      });
    }
  }

  const dueRows = await db.qimenShadowObservation.findMany({
    where: { evaluationDueAt: { lte: startedAt }, experiment: { is: null } },
    orderBy: { evaluationDueAt: "asc" },
    take: BATCH_SIZE,
  });
  for (const row of dueRows) {
    if (Date.now() >= deadlineMs - 5_000) {
      evaluationResults.push({ id: row.id, symbol: row.symbol, status: "SKIPPED", reason: "RUN_BUDGET_EXHAUSTED" });
      continue;
    }
    try {
      const observation = verifyQimenShadowObservationRow(row);
      const marketPromise = loadMarket(observation.setup.symbol);
      if (!marketPromise) {
        evaluationResults.push({ id: row.id, symbol: row.symbol, status: "SKIPPED", reason: "UNSUPPORTED_24X7_CRYPTO_V1" });
        continue;
      }
      const market = await marketPromise;
      if (!market.candles.length) throw new Error(`CLOSED_KLINE_UNAVAILABLE:${market.error ?? "EMPTY"}`);
      const candles = mapClosedHourlyCandlesForEvaluation({
        candles: market.candles,
        decisionAt: observation.setup.decisionAt,
        evaluationDueAt: observation.evaluationDueAt,
      });
      const result = await evaluateQimenShadowObservation({
        observationId: row.id,
        evaluatedAt: startedAt.toISOString(),
        candles,
      }, ACTOR, startedAt);
      evaluationResults.push({ id: row.id, symbol: row.symbol, status: result.created ? "CREATED" : "UNCHANGED" });
    } catch (error) {
      evaluationResults.push({ id: row.id, symbol: row.symbol, status: "FAILED", reason: safeReason(error) });
    }
  }

  let pairings: QimenShadowPairingResult[];
  if (Date.now() >= deadlineMs - 2_000) {
    pairings = [{ studyKey: "PAIRER", status: "SKIPPED", reason: "RUN_BUDGET_EXHAUSTED" }];
  } else {
    try {
      pairings = await pairFutureQimenShadowReadings({
        scanStartedAt: startedAt,
        deadlineMs: Math.min(Date.now() + PAIR_BUDGET_MS, deadlineMs - 2_000),
      });
    } catch (error) {
      pairings = [{ studyKey: "PAIRER", status: "FAILED", reason: safeReason(error) }];
    }
  }

  const finishedAt = new Date();
  const all = [...lockResults, ...evaluationResults];
  const report = {
    schemaVersion: QIMEN_SHADOW_AUTOMATION_SCHEMA,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    policy: {
      mode: "RESEARCH_ONLY",
      supportedMarkets: ["BTC", "ETH", "SOL", "HYPE"],
      candleIntervalMinutes: 60,
      batchSize: BATCH_SIZE,
      mayChangeForecast: false,
      mayChangeWeights: false,
      mayTrade: false,
    },
    locks: lockResults,
    evaluations: evaluationResults,
    pairings,
  };
  const hasFailure = all.some((item) => item.status === "FAILED") || pairings.some((item) => item.status === "FAILED");
  const status = all.length === 0 && pairings.length === 0 ? "IDLE" : hasFailure ? "PARTIAL" : "OK";
  const contentSha256 = qimenShadowContentHash(report);
  const run = await db.qimenShadowAutomationRun.create({
    data: {
      id: randomUUID(),
      schemaVersion: QIMEN_SHADOW_AUTOMATION_SCHEMA,
      startedAt,
      finishedAt,
      status,
      reportSnapshot: asJson(report),
      contentSha256,
    },
  });
  return { ok: true as const, runId: run.id, status, report };
}
