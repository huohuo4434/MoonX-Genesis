-- Append-only structured method-reading inbox for future Qimen shadow studies.
CREATE TABLE IF NOT EXISTS "QimenShadowReading" (
  "id" TEXT NOT NULL,
  "schemaVersion" TEXT NOT NULL,
  "studyKey" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "formalForecastKind" TEXT NOT NULL,
  "formalForecastId" TEXT NOT NULL,
  "formalForecastVersion" TEXT NOT NULL,
  "horizon" TEXT NOT NULL,
  "decisionAt" TIMESTAMP(3) NOT NULL,
  "evaluationDueAt" TIMESTAMP(3) NOT NULL,
  "direction" TEXT NOT NULL,
  "confidence" INTEGER NOT NULL,
  "readiness" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "chartId" TEXT NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL,
  "evidenceSha256" TEXT NOT NULL,
  "readingSnapshot" JSONB NOT NULL,
  "contentSha256" TEXT NOT NULL,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QimenShadowReading_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "QimenShadowReading_contentSha256_key" ON "QimenShadowReading"("contentSha256");
CREATE INDEX IF NOT EXISTS "QimenShadowReading_studyKey_schoolId_idx" ON "QimenShadowReading"("studyKey", "schoolId");
CREATE INDEX IF NOT EXISTS "QimenShadowReading_decisionAt_idx" ON "QimenShadowReading"("decisionAt");
CREATE INDEX IF NOT EXISTS "QimenShadowReading_formalForecastId_formalForecastVersion_horizon_decisionAt_idx" ON "QimenShadowReading"("formalForecastId", "formalForecastVersion", "horizon", "decisionAt");
