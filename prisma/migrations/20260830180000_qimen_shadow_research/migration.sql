-- Two-stage append-only Qimen shadow research ledger.
CREATE TABLE IF NOT EXISTS "QimenShadowObservation" (
  "id" TEXT NOT NULL,
  "schemaVersion" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "horizon" TEXT NOT NULL,
  "officialDirection" TEXT NOT NULL,
  "formalForecastKind" TEXT NOT NULL,
  "formalForecastId" TEXT NOT NULL,
  "formalForecastVersion" TEXT NOT NULL,
  "decisionAt" TIMESTAMP(3) NOT NULL,
  "evaluationDueAt" TIMESTAMP(3) NOT NULL,
  "setupSnapshot" JSONB NOT NULL,
  "contentSha256" TEXT NOT NULL,
  "lockedBy" TEXT,
  "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QimenShadowObservation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QimenShadowExperiment" (
  "id" TEXT NOT NULL,
  "observationId" TEXT NOT NULL,
  "schemaVersion" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "horizon" TEXT NOT NULL,
  "officialDirection" TEXT NOT NULL,
  "formalForecastKind" TEXT NOT NULL,
  "formalForecastId" TEXT NOT NULL,
  "formalForecastVersion" TEXT NOT NULL,
  "decisionAt" TIMESTAMP(3) NOT NULL,
  "evaluatedAt" TIMESTAMP(3) NOT NULL,
  "setupSnapshot" JSONB NOT NULL,
  "candleSnapshot" JSONB NOT NULL,
  "trialSnapshot" JSONB NOT NULL,
  "contentSha256" TEXT NOT NULL,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QimenShadowExperiment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QimenShadowExperiment_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "QimenShadowObservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "QimenShadowObservation_contentSha256_key" ON "QimenShadowObservation"("contentSha256");
CREATE INDEX IF NOT EXISTS "QimenShadowObservation_decisionAt_idx" ON "QimenShadowObservation"("decisionAt");
CREATE INDEX IF NOT EXISTS "QimenShadowObservation_symbol_horizon_decisionAt_idx" ON "QimenShadowObservation"("symbol", "horizon", "decisionAt");
CREATE INDEX IF NOT EXISTS "QimenShadowObservation_formalForecastId_formalForecastVersion_idx" ON "QimenShadowObservation"("formalForecastId", "formalForecastVersion");
CREATE UNIQUE INDEX IF NOT EXISTS "QimenShadowExperiment_observationId_key" ON "QimenShadowExperiment"("observationId");
CREATE UNIQUE INDEX IF NOT EXISTS "QimenShadowExperiment_contentSha256_key" ON "QimenShadowExperiment"("contentSha256");
CREATE INDEX IF NOT EXISTS "QimenShadowExperiment_decisionAt_idx" ON "QimenShadowExperiment"("decisionAt");
CREATE INDEX IF NOT EXISTS "QimenShadowExperiment_symbol_horizon_decisionAt_idx" ON "QimenShadowExperiment"("symbol", "horizon", "decisionAt");
CREATE INDEX IF NOT EXISTS "QimenShadowExperiment_formalForecastId_formalForecastVersion_idx" ON "QimenShadowExperiment"("formalForecastId", "formalForecastVersion");
