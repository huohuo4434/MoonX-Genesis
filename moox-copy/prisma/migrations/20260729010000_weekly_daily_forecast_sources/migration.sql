-- Non-destructive: add weekly Liu Yao sources + generated daily forecasts.
-- Never truncates users, memberships, payments, or referrals.

CREATE TABLE IF NOT EXISTS "WeeklyForecastSource" (
    "id" TEXT NOT NULL,
    "marketCode" TEXT NOT NULL,
    "periodStart" TEXT NOT NULL,
    "periodEnd" TEXT NOT NULL,
    "primaryHexagram" TEXT,
    "changedHexagram" TEXT,
    "movingLines" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "specialPatterns" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "weeklyDirection" TEXT NOT NULL,
    "weeklyPath" TEXT NOT NULL,
    "interpretation" TEXT NOT NULL,
    "riskSummary" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'LIUYAO_WEEKLY',
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'LOCKED',
    "publishedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeeklyForecastSource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WeeklyForecastSource_marketCode_periodStart_version_key"
  ON "WeeklyForecastSource"("marketCode", "periodStart", "version");
CREATE INDEX IF NOT EXISTS "WeeklyForecastSource_marketCode_periodStart_periodEnd_idx"
  ON "WeeklyForecastSource"("marketCode", "periodStart", "periodEnd");
CREATE INDEX IF NOT EXISTS "WeeklyForecastSource_status_idx"
  ON "WeeklyForecastSource"("status");

CREATE TABLE IF NOT EXISTS "GeneratedDailyForecast" (
    "id" TEXT NOT NULL,
    "marketCode" TEXT NOT NULL,
    "forecastDate" TEXT NOT NULL,
    "sourceWeeklyForecastId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "upProbability" INTEGER NOT NULL,
    "sidewaysProbability" INTEGER NOT NULL,
    "downProbability" INTEGER NOT NULL,
    "expectedPath" TEXT NOT NULL,
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
);

CREATE UNIQUE INDEX IF NOT EXISTS "GeneratedDailyForecast_marketCode_forecastDate_version_key"
  ON "GeneratedDailyForecast"("marketCode", "forecastDate", "version");
CREATE INDEX IF NOT EXISTS "GeneratedDailyForecast_forecastDate_status_idx"
  ON "GeneratedDailyForecast"("forecastDate", "status");
CREATE INDEX IF NOT EXISTS "GeneratedDailyForecast_sourceWeeklyForecastId_idx"
  ON "GeneratedDailyForecast"("sourceWeeklyForecastId");
