-- Non-destructive: add I Ching (六爻) research engine tables.
-- No updates / deletes of existing prediction, membership, payments, or referral tables.

CREATE TABLE IF NOT EXISTS "IChingResearch" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "assetId" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "forecastType" TEXT NOT NULL,
  "forecastStartAt" TEXT NOT NULL,
  "forecastEndAt" TEXT NOT NULL,
  "castAt" TIMESTAMP(3) NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Shanghai',
  "sourceType" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "researchStatus" TEXT NOT NULL,

  "hexagramName" TEXT NOT NULL,
  "changedHexagramName" TEXT,
  "hexagramSpecialTypes" JSONB,
  "movingLines" JSONB,

  "monthStemBranch" TEXT,
  "dayStemBranch" TEXT,
  "emptyBranches" JSONB,
  "usefulGod" TEXT,
  "worldLine" JSONB,
  "responseLine" JSONB,
  "lineData" JSONB,

  "rawImageUrls" JSONB,
  "rawTranscript" TEXT,
  "masterOriginalAnalysis" TEXT,
  "masterStructuredSummary" TEXT,
  "internalAnalysis" TEXT,
  "analysisSteps" JSONB,
  "timeWindows" JSONB,

  "pathConclusion" TEXT,
  "directionConclusion" TEXT,
  "confidence" INTEGER,

  "adoptedSource" TEXT NOT NULL DEFAULT 'NONE',
  "adoptedResearchId" TEXT,
  "masterOverride" BOOLEAN NOT NULL DEFAULT FALSE,

  "knowledgeVersion" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,

  "createdBy" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "IChingResearch_assetId_forecastStartAt_idx"
  ON "IChingResearch"("assetId", "forecastStartAt");
CREATE INDEX IF NOT EXISTS "IChingResearch_researchStatus_idx"
  ON "IChingResearch"("researchStatus");

CREATE TABLE IF NOT EXISTS "IChingResearchVersion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "researchId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "changeReason" TEXT NOT NULL,
  "changedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IChingResearchVersion_researchId_fkey"
    FOREIGN KEY ("researchId") REFERENCES "IChingResearch"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "IChingResearchVersion_researchId_version_key"
  ON "IChingResearchVersion"("researchId","version");
CREATE INDEX IF NOT EXISTS "IChingResearchVersion_researchId_idx"
  ON "IChingResearchVersion"("researchId");

CREATE TABLE IF NOT EXISTS "MasterRule" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ruleCode" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "ruleText" TEXT NOT NULL,
  "teacherOriginalText" TEXT,
  "structuredLogic" JSONB,
  "applicableMarkets" JSONB,
  "applicableForecastTypes" JSONB,
  "priority" INTEGER NOT NULL DEFAULT 50,
  "confidence" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "sourceResearchId" TEXT,
  "supersedesRuleId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "MasterCase" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "researchId" TEXT NOT NULL,
  "caseTitle" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "forecastStartAt" TEXT NOT NULL,
  "forecastEndAt" TEXT NOT NULL,
  "teacherConclusion" TEXT,
  "actualResult" TEXT,
  "validationScore" INTEGER,
  "validationStatus" TEXT,
  "lessons" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MasterCase_researchId_fkey"
    FOREIGN KEY ("researchId") REFERENCES "IChingResearch"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "MasterCase_assetId_forecastStartAt_idx"
  ON "MasterCase"("assetId","forecastStartAt");

CREATE TABLE IF NOT EXISTS "IChingValidation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "researchId" TEXT NOT NULL,
  "actualDirection" TEXT,
  "actualOpen" DOUBLE PRECISION,
  "actualHigh" DOUBLE PRECISION,
  "actualLow" DOUBLE PRECISION,
  "actualClose" DOUBLE PRECISION,
  "actualPath" TEXT,
  "result" TEXT,
  "directionScore" INTEGER,
  "pathScore" INTEGER,
  "timingScore" INTEGER,
  "levelScore" INTEGER,
  "totalScore" INTEGER,
  "validationNotes" TEXT,
  "verifiedBy" TEXT,
  "verifiedAt" TIMESTAMP(3),
  CONSTRAINT "IChingValidation_researchId_fkey"
    FOREIGN KEY ("researchId") REFERENCES "IChingResearch"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IChingValidation_researchId_idx"
  ON "IChingValidation"("researchId");

