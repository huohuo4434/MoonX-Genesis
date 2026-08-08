/**
 * WeeklyForecastSource persistence.
 * Curated canonical six are always available; Prisma upsert is best-effort.
 */
import { prisma, hasPrisma } from "@/lib/prisma";
import { ensureGeneratedForecastSourceSchema } from "@/lib/weekly-source/generated-source-schema";
import {
  CANONICAL_WEEKLY_LIUYAO_SOURCES,
  findCanonicalWeeklySource,
} from "@/lib/weekly-source/canonical-six";
import type {
  GeneratedDailyForecastRecord,
  WeeklyForecastSourceRecord,
} from "@/lib/weekly-source/types";

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

export async function listWeeklyForecastSources(): Promise<WeeklyForecastSourceRecord[]> {
  if (hasPrisma() && prisma) {
    try {
      const rows = await prisma.weeklyForecastSource.findMany({
        where: { status: { in: ["LOCKED", "PUBLISHED"] } },
        orderBy: [{ periodStart: "asc" }, { marketCode: "asc" }],
      });
      if (rows.length > 0) return rows.map(mapWeeklyRow);
    } catch {
      /* fall through to canonical */
    }
  }
  return CANONICAL_WEEKLY_LIUYAO_SOURCES;
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

export async function upsertGeneratedDaily(
  record: GeneratedDailyForecastRecord
): Promise<{ created: boolean; record: GeneratedDailyForecastRecord }> {
  if (!hasPrisma() || !prisma) {
    return { created: true, record };
  }
  const schema = await ensureGeneratedForecastSourceSchema();
  if (!schema.ready) {
    console.warn("[weekly-source] GeneratedDailyForecast schema unavailable; generated record remains runtime-only", schema.error);
    return { created: true, record };
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
      return {
        created: false,
        record: {
          ...record,
          id: existing.id,
          status: existing.status as GeneratedDailyForecastRecord["status"],
          publishedAt: existing.publishedAt?.toISOString() ?? record.publishedAt,
          lockedAt: existing.lockedAt?.toISOString() ?? record.lockedAt,
        },
      };
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
    console.error("[weekly-source] upsertGeneratedDaily failed", err);
    return { created: false, record };
  }
}

export async function listGeneratedDailiesForDate(
  forecastDate: string
): Promise<GeneratedDailyForecastRecord[]> {
  if (!hasPrisma() || !prisma) return [];
  const schema = await ensureGeneratedForecastSourceSchema();
  if (!schema.ready) return [];
  try {
    const rows = await prisma.generatedDailyForecast.findMany({
      where: {
        forecastDate,
        status: { in: ["PUBLISHED", "LOCKED"] },
      },
      orderBy: [{ marketCode: "asc" }, { version: "desc" }],
    });
    // Latest version per market
    const byMarket = new Map<string, (typeof rows)[number]>();
    for (const r of rows) {
      if (!byMarket.has(r.marketCode)) byMarket.set(r.marketCode, r);
    }
    return [...byMarket.values()].map((r) => ({
      id: r.id,
      marketCode: r.marketCode,
      forecastDate: r.forecastDate,
      sourceWeeklyForecastId: r.sourceWeeklyForecastId,
      direction: r.direction,
      upProbability: r.upProbability,
      sidewaysProbability: r.sidewaysProbability,
      downProbability: r.downProbability,
      expectedPath: r.expectedPath,
      supportLevels: Array.isArray(r.supportLevels) ? (r.supportLevels as string[]) : [],
      resistanceLevels: Array.isArray(r.resistanceLevels) ? (r.resistanceLevels as string[]) : [],
      confirmationLevel: r.confirmationLevel,
      invalidationLevel: r.invalidationLevel,
      riskLevel: r.riskLevel,
      catalysts: Array.isArray(r.catalysts) ? (r.catalysts as string[]) : [],
      risks: Array.isArray(r.risks) ? (r.risks as string[]) : [],
      liuyaoEvidence: r.liuyaoEvidence,
      qimenEvidence: r.qimenEvidence,
      calendarEvidence: (r.calendarEvidence as GeneratedDailyForecastRecord["calendarEvidence"]) ?? null,
      technicalEvidence: r.technicalEvidence,
      newsEvidence: r.newsEvidence,
      marketProgressStatus: r.marketProgressStatus as GeneratedDailyForecastRecord["marketProgressStatus"],
      revisionReason: r.revisionReason,
      previousVersionId: r.previousVersionId,
      version: r.version,
      status: r.status as GeneratedDailyForecastRecord["status"],
      generatedAt: r.generatedAt.toISOString(),
      publishedAt: r.publishedAt?.toISOString() ?? null,
      lockedAt: r.lockedAt?.toISOString() ?? null,
      validatedAt: r.validatedAt?.toISOString() ?? null,
      validationStatus: r.validationStatus,
    }));
  } catch {
    return [];
  }
}
