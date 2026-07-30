-- Wave analyst module tables (mirrors prisma/schema.prisma)

DO $$ BEGIN
  CREATE TYPE "WaveDirection" AS ENUM (
    'UP', 'DOWN', 'SIDEWAYS', 'UP_AFTER_PULLBACK', 'DOWN_AFTER_REBOUND', 'REBOUND', 'PULLBACK'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "WaveValidationStatus" AS ENUM (
    'PENDING', 'HIT', 'PARTIAL', 'FAILED', 'EXPIRED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "WaveAnalyst" (
  "id" TEXT PRIMARY KEY,
  "slug" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "source" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "baseWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
  "maxWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.22,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "WavePrediction" (
  "id" TEXT PRIMARY KEY,
  "analystId" TEXT NOT NULL,
  "marketCode" TEXT NOT NULL,
  "marketName" TEXT NOT NULL,
  "timeframe" TEXT NOT NULL DEFAULT '1D',
  "publishedAt" TIMESTAMP(3) NOT NULL,
  "validUntil" TIMESTAMP(3),
  "direction" "WaveDirection" NOT NULL,
  "summary" TEXT NOT NULL,
  "waveLabel" TEXT,
  "supportLevels" JSONB NOT NULL,
  "resistanceLevels" JSONB NOT NULL,
  "targetLevels" JSONB NOT NULL,
  "invalidationLevel" DOUBLE PRECISION,
  "confirmationLevel" DOUBLE PRECISION,
  "expectedPath" JSONB,
  "sourceImageUrl" TEXT,
  "sourceMessageId" TEXT,
  "rawText" TEXT,
  "status" "WaveValidationStatus" NOT NULL DEFAULT 'PENDING',
  "entryReference" DOUBLE PRECISION,
  "maxFavorableMove" DOUBLE PRECISION,
  "maxAdverseMove" DOUBLE PRECISION,
  "realizedReturn" DOUBLE PRECISION,
  "rewardRisk" DOUBLE PRECISION,
  "validatedAt" TIMESTAMP(3),
  "validationNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WavePrediction_analystId_fkey"
    FOREIGN KEY ("analystId") REFERENCES "WaveAnalyst"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "WavePrediction_analystId_marketCode_publishedAt_key"
  ON "WavePrediction"("analystId", "marketCode", "publishedAt");

CREATE INDEX IF NOT EXISTS "WavePrediction_marketCode_publishedAt_idx"
  ON "WavePrediction"("marketCode", "publishedAt");

CREATE INDEX IF NOT EXISTS "WavePrediction_analystId_status_idx"
  ON "WavePrediction"("analystId", "status");
