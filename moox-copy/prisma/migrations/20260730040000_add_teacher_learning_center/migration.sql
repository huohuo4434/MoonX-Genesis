-- Teacher Learning Center — independent tables

CREATE TABLE IF NOT EXISTS "teacher_lessons" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL DEFAULT '',
  "fileName" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "durationSec" INTEGER,
  "mime" TEXT,
  "audioUrl" TEXT NOT NULL,
  "wavUrl" TEXT,
  "rawText" TEXT NOT NULL DEFAULT '',
  "segments" JSONB,
  "courseSummary" TEXT NOT NULL DEFAULT '',
  "coreViews" TEXT NOT NULL DEFAULT '',
  "classicQuotes" JSONB,
  "draftRules" JSONB,
  "draftCases" JSONB,
  "draftConcepts" JSONB,
  "draftQuotes" JSONB,
  "draftMnemonics" JSONB,
  "draftExceptions" JSONB,
  "draftPredictions" JSONB,
  "status" TEXT NOT NULL DEFAULT 'UPLOADED',
  "progress" JSONB,
  "errorMessage" TEXT,
  "publishedAt" TIMESTAMP(3),
  "learningSeconds" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "teacher_lessons_createdAt_idx" ON "teacher_lessons"("createdAt");
CREATE INDEX IF NOT EXISTS "teacher_lessons_status_idx" ON "teacher_lessons"("status");
CREATE INDEX IF NOT EXISTS "teacher_lessons_title_idx" ON "teacher_lessons"("title");

CREATE TABLE IF NOT EXISTS "teacher_rules" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "lessonId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "sourceMinute" TEXT,
  "confidence" TEXT NOT NULL DEFAULT 'Draft',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "teacher_rules_lessonId_idx" ON "teacher_rules"("lessonId");
CREATE INDEX IF NOT EXISTS "teacher_rules_title_idx" ON "teacher_rules"("title");
CREATE INDEX IF NOT EXISTS "teacher_rules_status_idx" ON "teacher_rules"("status");

CREATE TABLE IF NOT EXISTS "teacher_cases" (
  "id" TEXT PRIMARY KEY,
  "lessonId" TEXT NOT NULL,
  "assetName" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "teacherConclusion" TEXT NOT NULL,
  "sourceText" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "teacher_cases_lessonId_idx" ON "teacher_cases"("lessonId");
CREATE INDEX IF NOT EXISTS "teacher_cases_assetName_idx" ON "teacher_cases"("assetName");
CREATE INDEX IF NOT EXISTS "teacher_cases_status_idx" ON "teacher_cases"("status");

CREATE TABLE IF NOT EXISTS "teacher_concepts" (
  "id" TEXT PRIMARY KEY,
  "lessonId" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'CONCEPT',
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "teacher_concepts_lessonId_idx" ON "teacher_concepts"("lessonId");
CREATE INDEX IF NOT EXISTS "teacher_concepts_kind_idx" ON "teacher_concepts"("kind");
CREATE INDEX IF NOT EXISTS "teacher_concepts_title_idx" ON "teacher_concepts"("title");
CREATE INDEX IF NOT EXISTS "teacher_concepts_status_idx" ON "teacher_concepts"("status");

CREATE TABLE IF NOT EXISTS "teacher_quotes" (
  "id" TEXT PRIMARY KEY,
  "lessonId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "sourceMinute" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "teacher_quotes_lessonId_idx" ON "teacher_quotes"("lessonId");
CREATE INDEX IF NOT EXISTS "teacher_quotes_status_idx" ON "teacher_quotes"("status");

CREATE TABLE IF NOT EXISTS "teacher_learning_logs" (
  "id" TEXT PRIMARY KEY,
  "day" TEXT NOT NULL,
  "lessonId" TEXT,
  "lessonTitle" TEXT NOT NULL DEFAULT '',
  "rulesAdded" INTEGER NOT NULL DEFAULT 0,
  "casesAdded" INTEGER NOT NULL DEFAULT 0,
  "rulesRevised" INTEGER NOT NULL DEFAULT 0,
  "pendingReview" INTEGER NOT NULL DEFAULT 0,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "teacher_learning_logs_day_idx" ON "teacher_learning_logs"("day");
CREATE INDEX IF NOT EXISTS "teacher_learning_logs_createdAt_idx" ON "teacher_learning_logs"("createdAt");
