-- Append-only candidate queue and automation diagnostics for Qimen shadow research.
CREATE TABLE IF NOT EXISTS "QimenShadowCandidate" (
  "id" TEXT NOT NULL,
  "schemaVersion" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "horizon" TEXT NOT NULL,
  "formalForecastKind" TEXT NOT NULL,
  "formalForecastId" TEXT NOT NULL,
  "formalForecastVersion" TEXT NOT NULL,
  "decisionAt" TIMESTAMP(3) NOT NULL,
  "evaluationDueAt" TIMESTAMP(3) NOT NULL,
  "candleIntervalMinutes" INTEGER NOT NULL DEFAULT 60,
  "methodSnapshot" JSONB NOT NULL,
  "contentSha256" TEXT NOT NULL,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QimenShadowCandidate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QimenShadowAutomationRun" (
  "id" TEXT NOT NULL,
  "schemaVersion" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "finishedAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL,
  "reportSnapshot" JSONB NOT NULL,
  "contentSha256" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QimenShadowAutomationRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "QimenShadowCandidate_contentSha256_key" ON "QimenShadowCandidate"("contentSha256");
CREATE INDEX IF NOT EXISTS "QimenShadowCandidate_decisionAt_idx" ON "QimenShadowCandidate"("decisionAt");
CREATE INDEX IF NOT EXISTS "QimenShadowCandidate_symbol_horizon_decisionAt_idx" ON "QimenShadowCandidate"("symbol", "horizon", "decisionAt");
CREATE INDEX IF NOT EXISTS "QimenShadowCandidate_formalForecastId_formalForecastVersion_idx" ON "QimenShadowCandidate"("formalForecastId", "formalForecastVersion");
CREATE UNIQUE INDEX IF NOT EXISTS "QimenShadowAutomationRun_contentSha256_key" ON "QimenShadowAutomationRun"("contentSha256");
CREATE INDEX IF NOT EXISTS "QimenShadowAutomationRun_startedAt_idx" ON "QimenShadowAutomationRun"("startedAt");
CREATE INDEX IF NOT EXISTS "QimenShadowAutomationRun_status_startedAt_idx" ON "QimenShadowAutomationRun"("status", "startedAt");
