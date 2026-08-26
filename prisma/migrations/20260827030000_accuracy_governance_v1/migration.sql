ALTER TABLE "WeeklyVerificationRecord"
ADD COLUMN IF NOT EXISTS "scoreVersion" TEXT NOT NULL DEFAULT 'LEGACY_UNVERSIONED';

UPDATE "WeeklyVerificationRecord"
SET "scoreVersion" = 'WEEKLY_SCORE_V3_BALANCED_PARTIAL'
WHERE "explanation" LIKE '%WEEKLY_SCORE_V3_BALANCED_PARTIAL%'
   OR "dataSource" LIKE '%WEEKLY_SCORE_V3_BALANCED_PARTIAL%';

CREATE TABLE IF NOT EXISTS "WeeklyVerificationRevision" (
  "id" TEXT NOT NULL,
  "weeklyAnalysisId" TEXT NOT NULL,
  "weeklyVerificationRecordId" TEXT NOT NULL,
  "scoreVersion" TEXT NOT NULL,
  "predictedPattern" TEXT NOT NULL,
  "actualPattern" TEXT,
  "result" TEXT NOT NULL,
  "directionScore" INTEGER,
  "pathScore" INTEGER,
  "levelScore" INTEGER,
  "totalScore" INTEGER,
  "dataSource" TEXT,
  "explanation" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WeeklyVerificationRevision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WeeklyVerificationRevision_weeklyAnalysisId_scoreVersion_key"
ON "WeeklyVerificationRevision"("weeklyAnalysisId", "scoreVersion");

CREATE INDEX IF NOT EXISTS "WeeklyVerificationRevision_weeklyVerificationRecordId_createdAt_idx"
ON "WeeklyVerificationRevision"("weeklyVerificationRecordId", "createdAt");

CREATE INDEX IF NOT EXISTS "WeeklyVerificationRevision_scoreVersion_result_idx"
ON "WeeklyVerificationRevision"("scoreVersion", "result");

INSERT INTO "WeeklyVerificationRevision" (
  "id", "weeklyAnalysisId", "weeklyVerificationRecordId", "scoreVersion",
  "predictedPattern", "actualPattern", "result", "directionScore", "pathScore",
  "levelScore", "totalScore", "dataSource", "explanation", "verifiedAt", "createdAt"
)
SELECT
  'WVRR-' || md5("weeklyAnalysisId" || ':' || "scoreVersion"),
  "weeklyAnalysisId", "id", "scoreVersion", "predictedPattern", "actualPattern",
  "result", "directionScore", "pathScore", "levelScore", "totalScore",
  "dataSource", "explanation", "verifiedAt", CURRENT_TIMESTAMP
FROM "WeeklyVerificationRecord"
WHERE "result" <> 'PENDING'
ON CONFLICT ("weeklyAnalysisId", "scoreVersion") DO NOTHING;
