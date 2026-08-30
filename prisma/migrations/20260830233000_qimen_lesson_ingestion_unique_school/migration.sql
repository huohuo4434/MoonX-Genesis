-- One method family may contribute at most one immutable reading to one study.
-- Refuse deployment instead of silently deleting or choosing among duplicates.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "QimenShadowReading"
    GROUP BY "studyKey", "schoolId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'QimenShadowReading contains duplicate studyKey/schoolId rows';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "QimenShadowReading_studyKey_schoolId_key"
  ON "QimenShadowReading"("studyKey", "schoolId");

CREATE INDEX IF NOT EXISTS "QimenShadowReading_sourceId_schoolId_horizon_evidenceSha256_idx"
  ON "QimenShadowReading"("sourceId", "schoolId", "horizon", "evidenceSha256");

-- Persist the immutable study identity on candidates so already-paired groups
-- are excluded before LIMIT. Existing rows are backfilled only through an
-- exact forecast/window plus both evidence hashes; ambiguous rows remain NULL
-- and therefore cannot falsely claim a study.
ALTER TABLE "QimenShadowCandidate" ADD COLUMN IF NOT EXISTS "studyKey" TEXT;

WITH candidate_study_matches AS (
  SELECT c."id", r."studyKey"
  FROM "QimenShadowCandidate" c
  JOIN "QimenShadowReading" r
    ON r."formalForecastId" = c."formalForecastId"
   AND r."formalForecastVersion" = c."formalForecastVersion"
   AND r."horizon" = c."horizon"
   AND r."decisionAt" = c."decisionAt"
   AND r."evaluationDueAt" = c."evaluationDueAt"
   AND EXISTS (
     SELECT 1
     FROM jsonb_array_elements(COALESCE(c."methodSnapshot"->'methodReadings', '[]'::jsonb)) method
     WHERE method->>'schoolId' = r."schoolId"
       AND method->>'evidenceSha256' = r."evidenceSha256"
   )
  GROUP BY c."id", r."studyKey"
  HAVING COUNT(DISTINCT r."schoolId") = 2
), candidate_studies AS (
  SELECT "id", MIN("studyKey") AS "studyKey"
  FROM candidate_study_matches
  GROUP BY "id"
  HAVING COUNT(DISTINCT "studyKey") = 1
)
UPDATE "QimenShadowCandidate" c
SET "studyKey" = candidate_studies."studyKey"
FROM candidate_studies
WHERE c."id" = candidate_studies."id"
  AND c."studyKey" IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "QimenShadowCandidate"
    WHERE "studyKey" IS NOT NULL
    GROUP BY "studyKey"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'QimenShadowCandidate contains duplicate studyKey rows';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "QimenShadowCandidate_studyKey_key"
  ON "QimenShadowCandidate"("studyKey");

-- A short database lease serializes automated course read/modify/write cycles.
-- RLS keeps the table service-role/server-only; it has no prediction or order fields.
CREATE TABLE IF NOT EXISTS "QimenLessonAutomationLease" (
  "id" TEXT NOT NULL,
  "owner" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QimenLessonAutomationLease_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "QimenLessonAutomationLease_expiresAt_idx"
  ON "QimenLessonAutomationLease"("expiresAt");

ALTER TABLE "QimenLessonAutomationLease" ENABLE ROW LEVEL SECURITY;
