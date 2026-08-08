import "server-only";

import { hasPrisma, prisma } from "@/lib/prisma";

export type GeneratedForecastSchemaStatus = {
  available: boolean;
  ready: boolean;
  repaired: boolean;
  error: string | null;
};

const GENERATED_DAILY_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "GeneratedDailyForecast" (
    "id" TEXT NOT NULL,
    "marketCode" TEXT NOT NULL,
    "forecastDate" TEXT NOT NULL,
    "sourceWeeklyForecastId" TEXT NOT NULL DEFAULT 'legacy',
    "direction" TEXT NOT NULL DEFAULT '震荡',
    "upProbability" INTEGER NOT NULL DEFAULT 0,
    "sidewaysProbability" INTEGER NOT NULL DEFAULT 0,
    "downProbability" INTEGER NOT NULL DEFAULT 0,
    "expectedPath" TEXT NOT NULL DEFAULT '',
    "supportLevels" JSONB,
    "resistanceLevels" JSONB,
    "confirmationLevel" TEXT,
    "invalidationLevel" TEXT,
    "riskLevel" TEXT,
    "catalysts" JSONB,
    "risks" JSONB,
    "liuyaoEvidence" TEXT,
    "qimenEvidence" TEXT,
    "calendarEvidence" JSONB,
    "technicalEvidence" TEXT,
    "newsEvidence" TEXT,
    "marketProgressStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "revisionReason" TEXT,
    "previousVersionId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "validatedAt" TIMESTAMP(3),
    "validationStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GeneratedDailyForecast_pkey" PRIMARY KEY ("id")
  )`,
  `ALTER TABLE "GeneratedDailyForecast" ADD COLUMN IF NOT EXISTS "sourceWeeklyForecastId" TEXT NOT NULL DEFAULT 'legacy'`,
  `ALTER TABLE "GeneratedDailyForecast" ADD COLUMN IF NOT EXISTS "direction" TEXT NOT NULL DEFAULT '震荡'`,
  `ALTER TABLE "GeneratedDailyForecast" ADD COLUMN IF NOT EXISTS "upProbability" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "GeneratedDailyForecast" ADD COLUMN IF NOT EXISTS "sidewaysProbability" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "GeneratedDailyForecast" ADD COLUMN IF NOT EXISTS "downProbability" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "GeneratedDailyForecast" ADD COLUMN IF NOT EXISTS "expectedPath" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "GeneratedDailyForecast" ADD COLUMN IF NOT EXISTS "supportLevels" JSONB`,
  `ALTER TABLE "GeneratedDailyForecast" ADD COLUMN IF NOT EXISTS "resistanceLevels" JSONB`,
  `ALTER TABLE "GeneratedDailyForecast" ADD COLUMN IF NOT EXISTS "confirmationLevel" TEXT`,
  `ALTER TABLE "GeneratedDailyForecast" ADD COLUMN IF NOT EXISTS "invalidationLevel" TEXT`,
  `ALTER TABLE "GeneratedDailyForecast" ADD COLUMN IF NOT EXISTS "riskLevel" TEXT`,
  `ALTER TABLE "GeneratedDailyForecast" ADD COLUMN IF NOT EXISTS "catalysts" JSONB`,
  `ALTER TABLE "GeneratedDailyForecast" ADD COLUMN IF NOT EXISTS "risks" JSONB`,
  `ALTER TABLE "GeneratedDailyForecast" ADD COLUMN IF NOT EXISTS "liuyaoEvidence" TEXT`,
  `ALTER TABLE "GeneratedDailyForecast" ADD COLUMN IF NOT EXISTS "qimenEvidence" TEXT`,
  `ALTER TABLE "GeneratedDailyForecast" ADD COLUMN IF NOT EXISTS "calendarEvidence" JSONB`,
  `ALTER TABLE "GeneratedDailyForecast" ADD COLUMN IF NOT EXISTS "technicalEvidence" TEXT`,
  `ALTER TABLE "GeneratedDailyForecast" ADD COLUMN IF NOT EXISTS "newsEvidence" TEXT`,
  `ALTER TABLE "GeneratedDailyForecast" ADD COLUMN IF NOT EXISTS "marketProgressStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED'`,
  `ALTER TABLE "GeneratedDailyForecast" ADD COLUMN IF NOT EXISTS "revisionReason" TEXT`,
  `ALTER TABLE "GeneratedDailyForecast" ADD COLUMN IF NOT EXISTS "previousVersionId" TEXT`,
  `ALTER TABLE "GeneratedDailyForecast" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE "GeneratedDailyForecast" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'DRAFT'`,
  `ALTER TABLE "GeneratedDailyForecast" ADD COLUMN IF NOT EXISTS "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
  `ALTER TABLE "GeneratedDailyForecast" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3)`,
  `ALTER TABLE "GeneratedDailyForecast" ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3)`,
  `ALTER TABLE "GeneratedDailyForecast" ADD COLUMN IF NOT EXISTS "validatedAt" TIMESTAMP(3)`,
  `ALTER TABLE "GeneratedDailyForecast" ADD COLUMN IF NOT EXISTS "validationStatus" TEXT`,
  `ALTER TABLE "GeneratedDailyForecast" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
  `ALTER TABLE "GeneratedDailyForecast" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "GeneratedDailyForecast_marketCode_forecastDate_version_key" ON "GeneratedDailyForecast"("marketCode", "forecastDate", "version")`,
  `CREATE INDEX IF NOT EXISTS "GeneratedDailyForecast_forecastDate_status_idx" ON "GeneratedDailyForecast"("forecastDate", "status")`,
  `CREATE INDEX IF NOT EXISTS "GeneratedDailyForecast_sourceWeeklyForecastId_idx" ON "GeneratedDailyForecast"("sourceWeeklyForecastId")`,
] as const;

let readyUntil = 0;
let inFlight: Promise<GeneratedForecastSchemaStatus> | null = null;

async function tableExists(): Promise<boolean> {
  if (!prisma) return false;
  const rows = await prisma.$queryRawUnsafe<Array<{ name: string | null }>>(
    `SELECT to_regclass('public."GeneratedDailyForecast"')::text AS name`
  );
  return Boolean(rows[0]?.name);
}

async function repairSchema(): Promise<GeneratedForecastSchemaStatus> {
  if (!hasPrisma() || !prisma) {
    return { available: false, ready: false, repaired: false, error: null };
  }

  try {
    const existedBefore = await tableExists().catch(() => false);
    for (const statement of GENERATED_DAILY_STATEMENTS) {
      await prisma.$executeRawUnsafe(statement);
    }
    const ready = await tableExists();
    if (ready) readyUntil = Date.now() + 10 * 60_000;
    return {
      available: true,
      ready,
      repaired: ready && !existedBefore,
      error: ready ? null : "GeneratedDailyForecast table is still unavailable after repair",
    };
  } catch (error) {
    return {
      available: true,
      ready: false,
      repaired: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Idempotent runtime bootstrap for the optional generated-daily source table.
 * It is additive-only and preserves existing rows. This is intentionally
 * separate from public reads; forecast-generation and verification Cron paths
 * call it before persisting/querying the formal source.
 */
export async function ensureGeneratedForecastSourceSchema(): Promise<GeneratedForecastSchemaStatus> {
  if (!hasPrisma() || !prisma) {
    return { available: false, ready: false, repaired: false, error: null };
  }
  if (Date.now() < readyUntil) {
    return { available: true, ready: true, repaired: false, error: null };
  }
  if (!inFlight) {
    inFlight = repairSchema().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}
