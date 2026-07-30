-- CreateEnum
CREATE TYPE "WaveDirection" AS ENUM ('UP', 'DOWN', 'SIDEWAYS', 'UP_AFTER_PULLBACK', 'DOWN_AFTER_REBOUND', 'REBOUND', 'PULLBACK');

-- CreateEnum
CREATE TYPE "WaveValidationStatus" AS ENUM ('PENDING', 'HIT', 'PARTIAL', 'FAILED', 'EXPIRED');

-- CreateTable
CREATE TABLE "WaveAnalyst" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "baseWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "maxWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.22,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WaveAnalyst_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WavePrediction" (
    "id" TEXT NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WavePrediction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WaveAnalyst_slug_key" ON "WaveAnalyst"("slug");

-- CreateIndex
CREATE INDEX "WavePrediction_marketCode_publishedAt_idx" ON "WavePrediction"("marketCode", "publishedAt");

-- CreateIndex
CREATE INDEX "WavePrediction_analystId_status_idx" ON "WavePrediction"("analystId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WavePrediction_analystId_marketCode_publishedAt_key" ON "WavePrediction"("analystId", "marketCode", "publishedAt");

-- AddForeignKey
ALTER TABLE "WavePrediction" ADD CONSTRAINT "WavePrediction_analystId_fkey" FOREIGN KEY ("analystId") REFERENCES "WaveAnalyst"("id") ON DELETE CASCADE ON UPDATE CASCADE;
