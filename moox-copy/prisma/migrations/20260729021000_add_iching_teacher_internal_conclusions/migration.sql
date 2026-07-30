-- Non-destructive: add teacher/internal conclusion columns to IChingResearch.
ALTER TABLE "IChingResearch"
  ADD COLUMN IF NOT EXISTS "masterFinalConclusion" TEXT;
ALTER TABLE "IChingResearch"
  ADD COLUMN IF NOT EXISTS "masterConfidence" INTEGER;
ALTER TABLE "IChingResearch"
  ADD COLUMN IF NOT EXISTS "masterPathConclusion" TEXT;
ALTER TABLE "IChingResearch"
  ADD COLUMN IF NOT EXISTS "masterDirectionConclusion" TEXT;

ALTER TABLE "IChingResearch"
  ADD COLUMN IF NOT EXISTS "internalFinalConclusion" TEXT;
ALTER TABLE "IChingResearch"
  ADD COLUMN IF NOT EXISTS "internalConfidence" INTEGER;
ALTER TABLE "IChingResearch"
  ADD COLUMN IF NOT EXISTS "internalPathConclusion" TEXT;
ALTER TABLE "IChingResearch"
  ADD COLUMN IF NOT EXISTS "internalDirectionConclusion" TEXT;

