/**
 * WeeklyForecastSource persistence.
 * Curated canonical six are always available; Prisma upsert is best-effort.
 */
import { prisma, hasPrisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { ensureGeneratedForecastSourceSchema } from "@/lib/weekly-source/generated-source-schema";
import {
  CANONICAL_WEEKLY_LIUYAO_SOURCES,
  findCanonicalWeeklySource,
} from "@/lib/weekly-source/canonical-six";
import type {
  GeneratedDailyForecastRecord,
  WeeklyForecastSourceRecord,
} from "@/lib/weekly-source/types";
import { executeAtomicFocusDailyAppend } from "@/lib/data/conviction/focus-daily-generation-core";
import { FOCUS_DAILY_MARKET_PREFIX, filterPublicGeneratedDailyRows, isPublicGeneratedDailyMarketCode } from "@/lib/weekly-source/generated-daily-namespace-core";

function mapWeeklyRow(row: {
  id: string;
  marketCode: string;
  periodStart: string;
  periodEnd: string;
  primaryHexagram: string | null;
  changedHexagram: string | null;
  movingLines: number[];
  specialPatterns: string[];
  weeklyDirection: string;
  weeklyPath: string;
  interpretation: string;
  riskSummary: string;
  sourceType: string;
  version: number;
  status: string;
  publishedAt: Date | null;
  lockedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): WeeklyForecastSourceRecord {
  return {
    id: row.id,
    marketCode: row.marketCode,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    primaryHexagram: row.primaryHexagram,
    changedHexagram: row.changedHexagram,
    movingLines: row.movingLines,
    specialPatterns: row.specialPatterns,
    weeklyDirection: row.weeklyDirection,
    weeklyPath: row.weeklyPath,
    interpretation: row.interpretation,
    riskSummary: row.riskSummary,
    sourceType: row.sourceType as WeeklyForecastSourceRecord["sourceType"],
    version: row.version,
    status: row.status as WeeklyForecastSourceRecord["status"],
    publishedAt: row.publishedAt?.toISOString() ?? null,
    lockedAt: row.lockedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapGeneratedRow(
  row: Prisma.GeneratedDailyForecastGetPayload<Record<string, never>>
): GeneratedDailyForecastRecord {
  return {
    id: row.id,
    marketCode: row.marketCode,
    forecastDate: row.forecastDate,
    sourceWeeklyForecastId: row.sourceWeeklyForecastId,
    direction: row.direction,
    upProbability: row.upProbability,
    sidewaysProbability: row.sidewaysProbability,
    downProbability: row.downProbability,
    expectedPath: row.expectedPath,
    supportLevels: Array.isArray(row.supportLevels) ? row.supportLevels as string[] : [],
    resistanceLevels: Array.isArray(row.resistanceLevels) ? row.resistanceLevels as string[] : [],
    confirmationLevel: row.confirmationLevel,
    invalidationLevel: row.invalidationLevel,
    riskLevel: row.riskLevel,
    catalysts: Array.isArray(row.catalysts) ? row.catalysts as string[] : [],
    risks: Array.isArray(row.risks) ? row.risks as string[] : [],
    liuyaoEvidence: row.liuyaoEvidence,
    qimenEvidence: row.qimenEvidence,
    calendarEvidence: (row.calendarEvidence as GeneratedDailyForecastRecord["calendarEvidence"]) ?? null,
    technicalEvidence: row.technicalEvidence,
    newsEvidence: row.newsEvidence,
    marketProgressStatus: row.marketProgressStatus as GeneratedDailyForecastRecord["marketProgressStatus"],
    revisionReason: row.revisionReason,
    previousVersionId: row.previousVersionId,
    version: row.version,
    status: row.status as GeneratedDailyForecastRecord["status"],
    generatedAt: row.generatedAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    lockedAt: row.lockedAt?.toISOString() ?? null,
    validatedAt: row.validatedAt?.toISOString() ?? null,
    validationStatus: row.validationStatus,
  };
}

export async function ensureCanonicalWeeklySourcesInDb(): Promise<{
  upserted: number;
  usedPrisma: boolean;
}> {
  if (!hasPrisma() || !prisma) {
    return { upserted: 0, usedPrisma: false };
  }
  let upserted = 0;
  try {
    for (const s of CANONICAL_WEEKLY_LIUYAO_SOURCES) {
      await prisma.weeklyForecastSource.upsert({
        where: { id: s.id },
        create: {
          id: s.id,
          marketCode: s.marketCode,
          periodStart: s.periodStart,
          periodEnd: s.periodEnd,
          primaryHexagram: s.primaryHexagram,
          changedHexagram: s.changedHexagram,
          movingLines: s.movingLines,
          specialPatterns: s.specialPatterns,
          weeklyDirection: s.weeklyDirection,
          weeklyPath: s.weeklyPath,
          interpretation: s.interpretation,
          riskSummary: s.riskSummary,
          sourceType: s.sourceType,
          version: s.version,
          status: s.status,
          publishedAt: s.publishedAt ? new Date(s.publishedAt) : null,
          lockedAt: s.lockedAt ? new Date(s.lockedAt) : null,
        },
        update: {
          // Non-destructive: never blank locked content; only refresh metadata if still draft.
          updatedAt: new Date(),
        },
      });
      upserted += 1;
    }
    return { upserted, usedPrisma: true };
  } catch (error) {
    // Some deployed databases predate the optional WeeklyForecastSource table.
    // Canonical in-code sources remain authoritative, so a missing table must never
    // stop daily forecast generation or the automatic trader.
    console.warn("[weekly-source] optional WeeklyForecastSource table unavailable; using code sources", error);
    return { upserted: 0, usedPrisma: false };
  }
}

export async function listWeeklyForecastSources(
  marketCodes?: readonly string[]
): Promise<WeeklyForecastSourceRecord[]> {
  const markets = marketCodes?.length
    ? Array.from(new Set(marketCodes.map((code) => code.toUpperCase())))
    : null;
  if (hasPrisma() && prisma) {
    try {
      const rows = await prisma.weeklyForecastSource.findMany({
        where: {
          status: { in: ["LOCKED", "PUBLISHED"] },
          ...(markets ? { marketCode: { in: markets } } : {}),
        },
        orderBy: [{ periodStart: "asc" }, { marketCode: "asc" }],
      });
      if (rows.length > 0) return rows.map(mapWeeklyRow);
    } catch {
      /* fall through to canonical */
    }
  }
  return markets
    ? CANONICAL_WEEKLY_LIUYAO_SOURCES.filter((row) => markets.includes(row.marketCode.toUpperCase()))
    : CANONICAL_WEEKLY_LIUYAO_SOURCES;
}

export async function getWeeklySourceForMarketDate(
  marketCode: string,
  forecastDate: string
): Promise<WeeklyForecastSourceRecord | null> {
  const code = marketCode.toUpperCase() === "CL" ? "WTI" : marketCode.toUpperCase();
  if (hasPrisma() && prisma) {
    try {
      const row = await prisma.weeklyForecastSource.findFirst({
        where: {
          marketCode: code,
          periodStart: { lte: forecastDate },
          periodEnd: { gte: forecastDate },
          status: { in: ["LOCKED", "PUBLISHED"] },
        },
        orderBy: { version: "desc" },
      });
      if (row) return mapWeeklyRow(row);
    } catch {
      /* fall through */
    }
  }
  return findCanonicalWeeklySource(code, forecastDate);
}

export async function getLatestGeneratedDailyForMarketDate(
  marketCode: string,
  forecastDate: string
): Promise<GeneratedDailyForecastRecord | null> {
  if (!isPublicGeneratedDailyMarketCode(marketCode)) return null;
  if (!hasPrisma() || !prisma) {
    throw new Error("generated-daily-authoritative-store-unavailable");
  }
  const schema = await ensureGeneratedForecastSourceSchema();
  if (!schema.ready) {
    throw new Error(`generated-daily-authoritative-schema-unavailable:${schema.error ?? "unknown"}`);
  }
  const row = await prisma.generatedDailyForecast.findFirst({
    where: {
      marketCode: marketCode.toUpperCase(),
      forecastDate,
      status: { in: ["LOCKED", "PUBLISHED"] },
    },
    orderBy: [{ version: "desc" }, { generatedAt: "desc" }, { id: "desc" }],
  });
  return row ? mapGeneratedRow(row) : null;
}

export async function listLatestGeneratedDailiesForMarketDates(
  marketCode: string,
  forecastDates: readonly string[],
  options: { readOnly?: boolean } = {}
): Promise<GeneratedDailyForecastRecord[]> {
  if (!hasPrisma() || !prisma) throw new Error("generated-daily-authoritative-store-unavailable");
  if (!marketCode.startsWith(FOCUS_DAILY_MARKET_PREFIX)) throw new Error("focus-daily-reader-namespace-required");
  if (!options.readOnly) {
    const schema = await ensureGeneratedForecastSourceSchema();
    if (!schema.ready) throw new Error(`generated-daily-authoritative-schema-unavailable:${schema.error ?? "unknown"}`);
  }
  const dates = [...new Set(forecastDates)];
  const rows = await prisma.generatedDailyForecast.findMany({
    where: {
      marketCode,
      forecastDate: { in: dates },
      status: { in: ["PUBLISHED", "LOCKED"] },
    },
    orderBy: [{ forecastDate: "asc" }, { version: "desc" }, { generatedAt: "desc" }, { id: "desc" }],
  });
  const latest = new Map<string, (typeof rows)[number]>();
  for (const row of rows) if (!latest.has(row.forecastDate)) latest.set(row.forecastDate, row);
  return [...latest.values()].map(mapGeneratedRow);
}

function generatedDailyCreateData(record: GeneratedDailyForecastRecord) {
  return {
    id: record.id,
    marketCode: record.marketCode,
    forecastDate: record.forecastDate,
    sourceWeeklyForecastId: record.sourceWeeklyForecastId,
    direction: record.direction,
    upProbability: record.upProbability,
    sidewaysProbability: record.sidewaysProbability,
    downProbability: record.downProbability,
    expectedPath: record.expectedPath,
    supportLevels: record.supportLevels,
    resistanceLevels: record.resistanceLevels,
    confirmationLevel: record.confirmationLevel,
    invalidationLevel: record.invalidationLevel,
    riskLevel: record.riskLevel,
    catalysts: record.catalysts,
    risks: record.risks,
    liuyaoEvidence: record.liuyaoEvidence,
    qimenEvidence: record.qimenEvidence,
    calendarEvidence: record.calendarEvidence ?? undefined,
    technicalEvidence: record.technicalEvidence,
    newsEvidence: record.newsEvidence,
    marketProgressStatus: record.marketProgressStatus,
    revisionReason: record.revisionReason,
    previousVersionId: record.previousVersionId,
    version: record.version,
    status: record.status,
    generatedAt: new Date(record.generatedAt),
    publishedAt: record.publishedAt ? new Date(record.publishedAt) : null,
    lockedAt: record.lockedAt ? new Date(record.lockedAt) : null,
  } satisfies Prisma.GeneratedDailyForecastUncheckedCreateInput;
}

/** Append-only atomic publication used by the isolated FOCUS namespace. */
export async function appendPublishedGeneratedDailyBatch(
  records: readonly GeneratedDailyForecastRecord[]
): Promise<{ created: number; records: GeneratedDailyForecastRecord[] }> {
  if (!records.length) return { created: 0, records: [] };
  if (!hasPrisma() || !prisma) throw new Error("generated-daily-authoritative-store-unavailable");
  const db = prisma;
  const schema = await ensureGeneratedForecastSourceSchema();
  if (!schema.ready) throw new Error(`generated-daily-authoritative-schema-unavailable:${schema.error ?? "unknown"}`);
  const marketCode = records[0]!.marketCode;
  const dates = new Set<string>();
  for (const record of records) {
    if (!marketCode.startsWith(FOCUS_DAILY_MARKET_PREFIX) || record.marketCode !== marketCode) throw new Error("focus-daily-namespace-invalid");
    if (record.status !== "PUBLISHED" || !record.publishedAt || record.lockedAt) throw new Error("focus-daily-publication-invalid");
    if (dates.has(record.forecastDate)) throw new Error("focus-daily-batch-date-duplicate");
    dates.add(record.forecastDate);
  }
  return executeAtomicFocusDailyAppend({
    records,
    writeAll: async (batch) => db.$transaction(async (tx) => {
      const out: GeneratedDailyForecastRecord[] = [];
      for (const record of batch) {
        const row = await tx.generatedDailyForecast.create({ data: generatedDailyCreateData(record) });
        out.push(mapGeneratedRow(row));
      }
      return out;
    }),
    isUniqueConflict: (error) => (error as { code?: string } | null)?.code === "P2002",
    readWinners: async (batch) => {
      const winners: GeneratedDailyForecastRecord[] = [];
      for (const record of batch) {
        const winner = await db.generatedDailyForecast.findUnique({
          where: { marketCode_forecastDate_version: { marketCode: record.marketCode, forecastDate: record.forecastDate, version: record.version } },
        });
        if (!winner || !["PUBLISHED", "LOCKED"].includes(winner.status)) return [];
        winners.push(mapGeneratedRow(winner));
      }
      return winners;
    },
  });
}

export async function upsertGeneratedDaily(
  record: GeneratedDailyForecastRecord
): Promise<{ created: boolean; record: GeneratedDailyForecastRecord }> {
  if (!hasPrisma() || !prisma) {
    throw new Error("generated-daily-authoritative-store-unavailable");
  }
  const schema = await ensureGeneratedForecastSourceSchema();
  if (!schema.ready) {
    throw new Error(`generated-daily-authoritative-schema-unavailable:${schema.error ?? "unknown"}`);
  }
  try {
    const existing = await prisma.generatedDailyForecast.findUnique({
      where: {
        marketCode_forecastDate_version: {
          marketCode: record.marketCode,
          forecastDate: record.forecastDate,
          version: record.version,
        },
      },
    });
    if (existing && (existing.status === "LOCKED" || existing.status === "PUBLISHED")) {
      // Never overwrite locked / published content in place
      return { created: false, record: mapGeneratedRow(existing) };
    }
    if (existing && existing.status === "DRAFT") {
      await prisma.generatedDailyForecast.update({
        where: { id: existing.id },
        data: {
          direction: record.direction,
          upProbability: record.upProbability,
          sidewaysProbability: record.sidewaysProbability,
          downProbability: record.downProbability,
          expectedPath: record.expectedPath,
          supportLevels: record.supportLevels,
          resistanceLevels: record.resistanceLevels,
          confirmationLevel: record.confirmationLevel,
          invalidationLevel: record.invalidationLevel,
          riskLevel: record.riskLevel,
          catalysts: record.catalysts,
          risks: record.risks,
          liuyaoEvidence: record.liuyaoEvidence,
          qimenEvidence: record.qimenEvidence,
          calendarEvidence: record.calendarEvidence ?? undefined,
          technicalEvidence: record.technicalEvidence,
          newsEvidence: record.newsEvidence,
          marketProgressStatus: record.marketProgressStatus,
          revisionReason: record.revisionReason,
          previousVersionId: record.previousVersionId,
          status: record.status,
          publishedAt: record.publishedAt ? new Date(record.publishedAt) : null,
          lockedAt: record.lockedAt ? new Date(record.lockedAt) : null,
        },
      });
      return { created: false, record };
    }
    await prisma.generatedDailyForecast.create({
      data: {
        id: record.id,
        marketCode: record.marketCode,
        forecastDate: record.forecastDate,
        sourceWeeklyForecastId: record.sourceWeeklyForecastId,
        direction: record.direction,
        upProbability: record.upProbability,
        sidewaysProbability: record.sidewaysProbability,
        downProbability: record.downProbability,
        expectedPath: record.expectedPath,
        supportLevels: record.supportLevels,
        resistanceLevels: record.resistanceLevels,
        confirmationLevel: record.confirmationLevel,
        invalidationLevel: record.invalidationLevel,
        riskLevel: record.riskLevel,
        catalysts: record.catalysts,
        risks: record.risks,
        liuyaoEvidence: record.liuyaoEvidence,
        qimenEvidence: record.qimenEvidence,
        calendarEvidence: record.calendarEvidence ?? undefined,
        technicalEvidence: record.technicalEvidence,
        newsEvidence: record.newsEvidence,
        marketProgressStatus: record.marketProgressStatus,
        revisionReason: record.revisionReason,
        previousVersionId: record.previousVersionId,
        version: record.version,
        status: record.status,
        generatedAt: new Date(record.generatedAt),
        publishedAt: record.publishedAt ? new Date(record.publishedAt) : null,
        lockedAt: record.lockedAt ? new Date(record.lockedAt) : null,
      },
    });
    return { created: true, record };
  } catch (err) {
    if ((err as { code?: string } | null)?.code === "P2002" && prisma) {
      const winner = await prisma.generatedDailyForecast.findUnique({
        where: {
          marketCode_forecastDate_version: {
            marketCode: record.marketCode,
            forecastDate: record.forecastDate,
            version: record.version,
          },
        },
      }).catch(() => null);
      if (winner) return { created: false, record: mapGeneratedRow(winner) };
    }
    console.error("[weekly-source] upsertGeneratedDaily failed", err);
    throw err;
  }
}

export async function listGeneratedDailiesForDate(
  forecastDate: string,
  options: { marketCodes?: readonly string[]; readOnly?: boolean } = {}
): Promise<GeneratedDailyForecastRecord[]> {
  if (!hasPrisma() || !prisma) return [];
  if (!options.readOnly) {
    const schema = await ensureGeneratedForecastSourceSchema();
    if (!schema.ready) return [];
  }
  const markets = options.marketCodes?.length
    ? Array.from(new Set(options.marketCodes.map((code) => code.toUpperCase())))
    : null;
  try {
    const rows = await prisma.generatedDailyForecast.findMany({
      where: {
        forecastDate,
        status: { in: ["PUBLISHED", "LOCKED"] },
        marketCode: markets
          ? { in: markets, not: { startsWith: "FOCUS:" } }
          : { not: { startsWith: "FOCUS:" } },
      },
      orderBy: [{ marketCode: "asc" }, { version: "desc" }],
    });
    // Latest version per market
    const byMarket = new Map<string, (typeof rows)[number]>();
    for (const r of filterPublicGeneratedDailyRows(rows)) {
      if (!byMarket.has(r.marketCode)) byMarket.set(r.marketCode, r);
    }
    return [...byMarket.values()].map(mapGeneratedRow);
  } catch {
    return [];
  }
}
