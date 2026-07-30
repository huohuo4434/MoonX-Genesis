-- MoonX Teacher Knowledge (text paste) — replace TLC audio-oriented tables

-- Archive legacy TLC audio tables if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teacher_rules')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teacher_rules' AND column_name = 'code')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teacher_rules' AND column_name = 'ruleCode')
  THEN
    ALTER TABLE IF EXISTS "teacher_quotes" RENAME TO "teacher_quotes_tlc_legacy";
    ALTER TABLE IF EXISTS "teacher_concepts" RENAME TO "teacher_concepts_tlc_legacy";
    ALTER TABLE IF EXISTS "teacher_cases" RENAME TO "teacher_cases_tlc_legacy";
    ALTER TABLE IF EXISTS "teacher_rules" RENAME TO "teacher_rules_tlc_legacy";
    ALTER TABLE IF EXISTS "teacher_lessons" RENAME TO "teacher_lessons_tlc_legacy";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "teacher_lessons" (
  "id" TEXT PRIMARY KEY,
  "lessonCode" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL,
  "teacherName" TEXT NOT NULL DEFAULT '',
  "courseSeries" TEXT NOT NULL DEFAULT '',
  "lessonNumber" TEXT NOT NULL DEFAULT '',
  "lessonDate" TIMESTAMP(3),
  "originalFileName" TEXT,
  "sourceType" TEXT NOT NULL DEFAULT 'MANUAL_NOTE',
  "assets" JSONB,
  "timeframes" JSONB,
  "tags" JSONB,
  "rawTranscript" TEXT NOT NULL,
  "cleanedTranscript" TEXT NOT NULL DEFAULT '',
  "summary" TEXT NOT NULL DEFAULT '',
  "adminNotes" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "teacher_lessons_status_idx" ON "teacher_lessons"("status");
CREATE INDEX IF NOT EXISTS "teacher_lessons_teacherName_idx" ON "teacher_lessons"("teacherName");
CREATE INDEX IF NOT EXISTS "teacher_lessons_courseSeries_idx" ON "teacher_lessons"("courseSeries");
CREATE INDEX IF NOT EXISTS "teacher_lessons_createdAt_idx" ON "teacher_lessons"("createdAt");

CREATE TABLE IF NOT EXISTS "teacher_lesson_versions" (
  "id" TEXT PRIMARY KEY,
  "lessonId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "rawTranscript" TEXT NOT NULL,
  "cleanedTranscript" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "changeReason" TEXT,
  "changedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "teacher_lesson_versions_lessonId_version_key" ON "teacher_lesson_versions"("lessonId", "version");
CREATE INDEX IF NOT EXISTS "teacher_lesson_versions_lessonId_idx" ON "teacher_lesson_versions"("lessonId");

CREATE TABLE IF NOT EXISTS "teacher_rules" (
  "id" TEXT PRIMARY KEY,
  "ruleCode" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'OTHER',
  "conditions" JSONB,
  "analysisSteps" JSONB,
  "conclusion" TEXT NOT NULL,
  "exceptions" JSONB,
  "applicableAssets" JSONB,
  "applicableTimeframes" JSONB,
  "keywords" JSONB,
  "priority" INTEGER NOT NULL DEFAULT 50,
  "confidence" INTEGER NOT NULL DEFAULT 50,
  "sourceLessonId" TEXT,
  "sourceQuote" TEXT NOT NULL,
  "sourceTextStart" INTEGER,
  "sourceTextEnd" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "teacher_rules_status_idx" ON "teacher_rules"("status");
CREATE INDEX IF NOT EXISTS "teacher_rules_category_idx" ON "teacher_rules"("category");
CREATE INDEX IF NOT EXISTS "teacher_rules_sourceLessonId_idx" ON "teacher_rules"("sourceLessonId");
CREATE INDEX IF NOT EXISTS "teacher_rules_title_idx" ON "teacher_rules"("title");

CREATE TABLE IF NOT EXISTS "teacher_cases" (
  "id" TEXT PRIMARY KEY,
  "caseCode" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL,
  "asset" TEXT NOT NULL DEFAULT '',
  "question" TEXT NOT NULL DEFAULT '',
  "predictionStart" TEXT,
  "predictionEnd" TEXT,
  "mainHexagram" TEXT,
  "changedHexagram" TEXT,
  "movingLines" TEXT,
  "useGod" TEXT,
  "shiLine" TEXT,
  "yingLine" TEXT,
  "monthBranch" TEXT,
  "dayBranch" TEXT,
  "sixRelationsStructure" JSONB,
  "hiddenFlyingStructure" JSONB,
  "teacherConclusion" TEXT NOT NULL DEFAULT '',
  "predictedPath" TEXT NOT NULL DEFAULT '',
  "timingWindows" JSONB,
  "sourceLessonId" TEXT,
  "sourceQuote" TEXT NOT NULL DEFAULT '',
  "actualResult" TEXT,
  "validationStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "validationNotes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "needsAdminFill" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "teacher_cases_status_idx" ON "teacher_cases"("status");
CREATE INDEX IF NOT EXISTS "teacher_cases_asset_idx" ON "teacher_cases"("asset");
CREATE INDEX IF NOT EXISTS "teacher_cases_sourceLessonId_idx" ON "teacher_cases"("sourceLessonId");

CREATE TABLE IF NOT EXISTS "teacher_concepts" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "definition" TEXT NOT NULL,
  "conditions" JSONB,
  "sourceLessonId" TEXT,
  "sourceQuote" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "teacher_concepts_status_idx" ON "teacher_concepts"("status");
CREATE INDEX IF NOT EXISTS "teacher_concepts_name_idx" ON "teacher_concepts"("name");
CREATE INDEX IF NOT EXISTS "teacher_concepts_sourceLessonId_idx" ON "teacher_concepts"("sourceLessonId");

CREATE TABLE IF NOT EXISTS "teacher_quotes" (
  "id" TEXT PRIMARY KEY,
  "quote" TEXT NOT NULL,
  "meaning" TEXT NOT NULL DEFAULT '',
  "toneType" TEXT NOT NULL DEFAULT 'NORMAL',
  "sourceLessonId" TEXT,
  "textPosition" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "teacher_quotes_status_idx" ON "teacher_quotes"("status");
CREATE INDEX IF NOT EXISTS "teacher_quotes_sourceLessonId_idx" ON "teacher_quotes"("sourceLessonId");

CREATE TABLE IF NOT EXISTS "teacher_methods" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "steps" JSONB,
  "conditions" JSONB,
  "exceptions" JSONB,
  "sourceLessonId" TEXT,
  "sourceQuote" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "teacher_methods_status_idx" ON "teacher_methods"("status");
CREATE INDEX IF NOT EXISTS "teacher_methods_sourceLessonId_idx" ON "teacher_methods"("sourceLessonId");

CREATE TABLE IF NOT EXISTS "conflict_records" (
  "id" TEXT PRIMARY KEY,
  "ruleAId" TEXT NOT NULL,
  "ruleBId" TEXT NOT NULL,
  "conflictType" TEXT NOT NULL DEFAULT 'POSSIBLE',
  "possibleReason" TEXT NOT NULL,
  "resolution" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "conflict_records_ruleAId_idx" ON "conflict_records"("ruleAId");
CREATE INDEX IF NOT EXISTS "conflict_records_ruleBId_idx" ON "conflict_records"("ruleBId");
CREATE INDEX IF NOT EXISTS "conflict_records_status_idx" ON "conflict_records"("status");
