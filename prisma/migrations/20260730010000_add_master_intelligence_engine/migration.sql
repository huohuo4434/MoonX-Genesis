-- Master Intelligence Engine — additive only. No deletes of prediction/membership tables.

ALTER TABLE "MasterRule" ADD COLUMN IF NOT EXISTS "lessonId" TEXT;
ALTER TABLE "MasterRule" ADD COLUMN IF NOT EXISTS "candidateId" TEXT;
ALTER TABLE "MasterRule" ADD COLUMN IF NOT EXISTS "voiceHints" JSONB;
CREATE INDEX IF NOT EXISTS "MasterRule_lessonId_idx" ON "MasterRule"("lessonId");
CREATE INDEX IF NOT EXISTS "MasterRule_status_idx" ON "MasterRule"("status");

ALTER TABLE "MasterCase" ALTER COLUMN "researchId" DROP NOT NULL;
ALTER TABLE "MasterCase" ADD COLUMN IF NOT EXISTS "lessonId" TEXT;
ALTER TABLE "MasterCase" ADD COLUMN IF NOT EXISTS "candidateId" TEXT;
ALTER TABLE "MasterCase" ADD COLUMN IF NOT EXISTS "question" TEXT;
ALTER TABLE "MasterCase" ADD COLUMN IF NOT EXISTS "hitStatus" TEXT;
CREATE INDEX IF NOT EXISTS "MasterCase_lessonId_idx" ON "MasterCase"("lessonId");

CREATE TABLE IF NOT EXISTS "Lesson" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "teacher" TEXT NOT NULL DEFAULT '老师',
  "course" TEXT,
  "lessonNumber" INTEGER,
  "uploadTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "durationSec" INTEGER,
  "source" TEXT NOT NULL DEFAULT 'MASTER',
  "status" TEXT NOT NULL DEFAULT 'UPLOADED',
  "mediaPath" TEXT,
  "mediaMime" TEXT,
  "mediaSize" INTEGER,
  "mediaFileName" TEXT,
  "errorMessage" TEXT,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Lesson_status_idx" ON "Lesson"("status");
CREATE INDEX IF NOT EXISTS "Lesson_uploadTime_idx" ON "Lesson"("uploadTime");

CREATE TABLE IF NOT EXISTS "LessonTranscript" (
  "id" TEXT PRIMARY KEY,
  "lessonId" TEXT NOT NULL UNIQUE,
  "rawText" TEXT NOT NULL DEFAULT '',
  "cleanText" TEXT NOT NULL DEFAULT '',
  "language" TEXT DEFAULT 'zh-CN',
  "rawLocked" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LessonTranscript_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "LessonExtraction" (
  "id" TEXT PRIMARY KEY,
  "lessonId" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "summary" TEXT,
  "rulesJson" JSONB,
  "casesJson" JSONB,
  "conceptsJson" JSONB,
  "formulasJson" JSONB,
  "exceptionsJson" JSONB,
  "predictionsJson" JSONB,
  "quotesJson" JSONB,
  "lessonOutputJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LessonExtraction_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "MasterKnowledgeCandidate" (
  "id" TEXT PRIMARY KEY,
  "lessonId" TEXT,
  "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "payload" JSONB,
  "weightStars" INTEGER NOT NULL DEFAULT 5,
  "reviewStatus" TEXT NOT NULL DEFAULT 'DRAFT',
  "publishedRef" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MasterKnowledgeCandidate_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "MasterKnowledgeCandidate_kind_reviewStatus_idx" ON "MasterKnowledgeCandidate"("kind", "reviewStatus");
CREATE INDEX IF NOT EXISTS "MasterKnowledgeCandidate_lessonId_idx" ON "MasterKnowledgeCandidate"("lessonId");

CREATE TABLE IF NOT EXISTS "RuleTreeNode" (
  "id" TEXT PRIMARY KEY,
  "ruleCode" TEXT,
  "parentId" TEXT,
  "label" TEXT NOT NULL,
  "condition" TEXT,
  "yesChildId" TEXT,
  "noChildId" TEXT,
  "outcomeText" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "RuleTreeNode_parentId_idx" ON "RuleTreeNode"("parentId");
CREATE INDEX IF NOT EXISTS "RuleTreeNode_ruleCode_idx" ON "RuleTreeNode"("ruleCode");

CREATE TABLE IF NOT EXISTS "KnowledgeNode" (
  "id" TEXT PRIMARY KEY,
  "key" TEXT NOT NULL UNIQUE,
  "label" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'CONCEPT',
  "weightStars" INTEGER NOT NULL DEFAULT 5,
  "sourceLessonId" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "KnowledgeEdge" (
  "id" TEXT PRIMARY KEY,
  "fromKey" TEXT NOT NULL,
  "toKey" TEXT NOT NULL,
  "relation" TEXT NOT NULL DEFAULT 'IMPLIES',
  "weightStars" INTEGER NOT NULL DEFAULT 4,
  "sourceLessonId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "KnowledgeEdge_fromKey_toKey_relation_key" ON "KnowledgeEdge"("fromKey", "toKey", "relation");
CREATE INDEX IF NOT EXISTS "KnowledgeEdge_fromKey_idx" ON "KnowledgeEdge"("fromKey");
CREATE INDEX IF NOT EXISTS "KnowledgeEdge_toKey_idx" ON "KnowledgeEdge"("toKey");

CREATE TABLE IF NOT EXISTS "KnowledgeConflict" (
  "id" TEXT PRIMARY KEY,
  "ruleCodeOrMotif" TEXT NOT NULL,
  "leftCandidateId" TEXT,
  "rightCandidateId" TEXT,
  "leftText" TEXT NOT NULL,
  "rightText" TEXT NOT NULL,
  "hypothesizedCause" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "resolvedNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "KnowledgeConflict_status_idx" ON "KnowledgeConflict"("status");
CREATE INDEX IF NOT EXISTS "KnowledgeConflict_ruleCodeOrMotif_idx" ON "KnowledgeConflict"("ruleCodeOrMotif");

CREATE TABLE IF NOT EXISTS "MarketRuleWeight" (
  "id" TEXT PRIMARY KEY,
  "ruleCode" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "weightStars" INTEGER NOT NULL DEFAULT 4,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "MarketRuleWeight_ruleCode_assetId_key" ON "MarketRuleWeight"("ruleCode", "assetId");

CREATE TABLE IF NOT EXISTS "TeacherVoicePattern" (
  "id" TEXT PRIMARY KEY,
  "phrase" TEXT NOT NULL UNIQUE,
  "signal" TEXT NOT NULL,
  "weightDelta" INTEGER NOT NULL DEFAULT 0,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CaseValidationRun" (
  "id" TEXT PRIMARY KEY,
  "caseId" TEXT NOT NULL,
  "result" TEXT NOT NULL,
  "score" INTEGER,
  "note" TEXT,
  "verifiedBy" TEXT,
  "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "CaseValidationRun_caseId_idx" ON "CaseValidationRun"("caseId");

CREATE TABLE IF NOT EXISTS "TeacherIntelligenceRun" (
  "id" TEXT PRIMARY KEY,
  "query" TEXT NOT NULL,
  "assetId" TEXT,
  "citations" JSONB NOT NULL,
  "analysis" TEXT NOT NULL,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
