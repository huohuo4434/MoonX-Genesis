-- 六爻老师语音学习：teacher_notes + learning feedback

CREATE TABLE IF NOT EXISTS "teacher_notes" (
  "id" TEXT PRIMARY KEY,
  "sourceAudio" TEXT NOT NULL,
  "rawText" TEXT NOT NULL DEFAULT '',
  "summary" TEXT NOT NULL DEFAULT '',
  "rules" JSONB,
  "cases" JSONB,
  "knowledge" JSONB,
  "keywords" JSONB,
  "status" TEXT NOT NULL DEFAULT 'UPLOADED',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "createdTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "teacher_notes_createdTime_idx" ON "teacher_notes"("createdTime");
CREATE INDEX IF NOT EXISTS "teacher_notes_status_idx" ON "teacher_notes"("status");

CREATE TABLE IF NOT EXISTS "teacher_learning_feedback" (
  "id" TEXT PRIMARY KEY,
  "teacherNoteId" TEXT,
  "assetId" TEXT,
  "query" TEXT,
  "prediction" TEXT NOT NULL,
  "actual" TEXT NOT NULL,
  "correct" BOOLEAN NOT NULL,
  "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "teacher_learning_feedback_assetId_idx" ON "teacher_learning_feedback"("assetId");
CREATE INDEX IF NOT EXISTS "teacher_learning_feedback_createdAt_idx" ON "teacher_learning_feedback"("createdAt");
