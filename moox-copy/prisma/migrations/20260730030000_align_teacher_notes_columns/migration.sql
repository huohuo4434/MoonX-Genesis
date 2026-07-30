-- Align teacher_notes columns to:
-- id, audio_url, raw_text, summary, rules, cases, keywords, created_at
-- (+ operational: knowledge, status, progress, error_message, updated_at)

CREATE TABLE IF NOT EXISTS "teacher_notes" (
  "id" TEXT PRIMARY KEY,
  "audio_url" TEXT NOT NULL DEFAULT '',
  "raw_text" TEXT NOT NULL DEFAULT '',
  "summary" TEXT NOT NULL DEFAULT '',
  "rules" JSONB,
  "cases" JSONB,
  "keywords" JSONB,
  "knowledge" JSONB,
  "status" TEXT NOT NULL DEFAULT 'UPLOADED',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "error_message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  -- Rename legacy camelCase columns if present
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teacher_notes' AND column_name = 'sourceAudio'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teacher_notes' AND column_name = 'audio_url'
  ) THEN
    ALTER TABLE "teacher_notes" RENAME COLUMN "sourceAudio" TO "audio_url";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teacher_notes' AND column_name = 'rawText'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teacher_notes' AND column_name = 'raw_text'
  ) THEN
    ALTER TABLE "teacher_notes" RENAME COLUMN "rawText" TO "raw_text";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teacher_notes' AND column_name = 'createdTime'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teacher_notes' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "teacher_notes" RENAME COLUMN "createdTime" TO "created_at";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teacher_notes' AND column_name = 'updatedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teacher_notes' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE "teacher_notes" RENAME COLUMN "updatedAt" TO "updated_at";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teacher_notes' AND column_name = 'errorMessage'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teacher_notes' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE "teacher_notes" RENAME COLUMN "errorMessage" TO "error_message";
  END IF;

  -- Ensure required columns exist on older installs
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teacher_notes' AND column_name = 'audio_url'
  ) THEN
    ALTER TABLE "teacher_notes" ADD COLUMN "audio_url" TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teacher_notes' AND column_name = 'raw_text'
  ) THEN
    ALTER TABLE "teacher_notes" ADD COLUMN "raw_text" TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teacher_notes' AND column_name = 'summary'
  ) THEN
    ALTER TABLE "teacher_notes" ADD COLUMN "summary" TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teacher_notes' AND column_name = 'rules'
  ) THEN
    ALTER TABLE "teacher_notes" ADD COLUMN "rules" JSONB;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teacher_notes' AND column_name = 'cases'
  ) THEN
    ALTER TABLE "teacher_notes" ADD COLUMN "cases" JSONB;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teacher_notes' AND column_name = 'keywords'
  ) THEN
    ALTER TABLE "teacher_notes" ADD COLUMN "keywords" JSONB;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teacher_notes' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "teacher_notes" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "teacher_notes_created_at_idx" ON "teacher_notes"("created_at");
CREATE INDEX IF NOT EXISTS "teacher_notes_status_idx" ON "teacher_notes"("status");
