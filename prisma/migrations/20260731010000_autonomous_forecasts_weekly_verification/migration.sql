CREATE TABLE IF NOT EXISTS "WeeklyVerificationRecord" (
  "id" TEXT NOT NULL,
  "weeklyAnalysisId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "weekStart" TEXT NOT NULL,
  "weekEnd" TEXT NOT NULL,
  "predictedPattern" TEXT NOT NULL,
  "actualPattern" TEXT,
  "result" TEXT NOT NULL DEFAULT 'PENDING',
  "directionScore" INTEGER,
  "pathScore" INTEGER,
  "levelScore" INTEGER,
  "totalScore" INTEGER,
  "dataSource" TEXT,
  "explanation" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WeeklyVerificationRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "WeeklyVerificationRecord_weeklyAnalysisId_key" ON "WeeklyVerificationRecord"("weeklyAnalysisId");
CREATE INDEX IF NOT EXISTS "WeeklyVerificationRecord_weekEnd_result_idx" ON "WeeklyVerificationRecord"("weekEnd", "result");
CREATE INDEX IF NOT EXISTS "WeeklyVerificationRecord_assetId_weekStart_idx" ON "WeeklyVerificationRecord"("assetId", "weekStart");

CREATE TABLE IF NOT EXISTS "ForecastOverride" (
  "id" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "targetDate" TEXT NOT NULL,
  "direction" TEXT,
  "supportLevels" JSONB,
  "resistanceLevels" JSONB,
  "confirmation" TEXT,
  "invalidation" TEXT,
  "note" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ForecastOverride_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ForecastOverride_scope_assetId_targetDate_key" ON "ForecastOverride"("scope", "assetId", "targetDate");
CREATE INDEX IF NOT EXISTS "ForecastOverride_targetDate_enabled_idx" ON "ForecastOverride"("targetDate", "enabled");

ALTER TABLE "teacher_lessons" ADD COLUMN IF NOT EXISTS "primaryMethod" TEXT NOT NULL DEFAULT 'LIUYAO';
ALTER TABLE "teacher_lessons" ADD COLUMN IF NOT EXISTS "auxiliaryMethods" JSONB;
CREATE INDEX IF NOT EXISTS "teacher_lessons_primaryMethod_idx" ON "teacher_lessons"("primaryMethod");
