export const RULE_CATEGORIES = [
  "USE_GOD",
  "SHI_YING",
  "PROSPERITY_DECLINE",
  "MONTH_BRANCH",
  "DAY_BRANCH",
  "MOVING_LINE",
  "HIDDEN_SPIRIT",
  "FLYING_SPIRIT",
  "SIX_RELATIONS",
  "CLASH_COMBINATION",
  "TRANSFORMATION",
  "TIMING",
  "MARKET_APPLICATION",
  "EXCEPTION",
  "OTHER",
] as const;

export type RuleCategory = (typeof RULE_CATEGORIES)[number];

export type LessonSourceType =
  | "AUDIO_TRANSCRIPT"
  | "VIDEO_TRANSCRIPT"
  | "MANUAL_NOTE"
  | "IMAGE_TRANSCRIPT"
  | "OTHER";

export type LessonStatus = "DRAFT" | "ANALYZED" | "REVIEWING" | "APPROVED" | "ARCHIVED";

export type KnowledgeStatus = "DRAFT" | "APPROVED" | "REJECTED" | "ARCHIVED" | "UNCERTAIN";

export type TeacherLessonRecord = {
  id: string;
  lessonCode: string;
  title: string;
  teacherName: string;
  courseSeries: string;
  lessonNumber: string;
  lessonDate: string | null;
  originalFileName: string | null;
  sourceType: LessonSourceType;
  assets: string[];
  timeframes: string[];
  tags: string[];
  rawTranscript: string;
  cleanedTranscript: string;
  summary: string;
  adminNotes: string;
  qimenShadowExtraction: unknown | null;
  qimenShadowAttemptMeta: {
    count: number;
    lastAttemptAt: string;
    lastOutcomeSha256: string | null;
    lastModelStatus: string;
  } | null;
  automationAttemptCount?: number;
  automationNextRetryAt?: string | null;
  automationLastError?: string | null;
  status: LessonStatus;
  version: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TeacherRuleRecord = {
  id: string;
  ruleCode: string;
  title: string;
  category: RuleCategory | string;
  conditions: string[];
  analysisSteps: string[];
  conclusion: string;
  exceptions: string[];
  applicableAssets: string[];
  applicableTimeframes: string[];
  keywords: string[];
  priority: number;
  confidence: number;
  sourceLessonId: string | null;
  sourceQuote: string;
  sourceTextStart: number | null;
  sourceTextEnd: number | null;
  status: KnowledgeStatus;
  createdAt: string;
  updatedAt: string;
};

export type TeacherCaseRecord = {
  id: string;
  caseCode: string;
  title: string;
  asset: string;
  question: string;
  predictionStart: string | null;
  predictionEnd: string | null;
  mainHexagram: string | null;
  changedHexagram: string | null;
  movingLines: string | null;
  useGod: string | null;
  shiLine: string | null;
  yingLine: string | null;
  monthBranch: string | null;
  dayBranch: string | null;
  sixRelationsStructure: Record<string, unknown> | null;
  hiddenFlyingStructure: Record<string, unknown> | null;
  teacherConclusion: string;
  predictedPath: string;
  timingWindows: string[];
  sourceLessonId: string | null;
  sourceQuote: string;
  actualResult: string | null;
  validationStatus: string;
  validationNotes: string | null;
  status: KnowledgeStatus;
  needsAdminFill: string[];
  createdAt: string;
  updatedAt: string;
};

export type TeacherConceptRecord = {
  id: string;
  name: string;
  definition: string;
  conditions: string[];
  sourceLessonId: string | null;
  sourceQuote: string;
  status: KnowledgeStatus;
  createdAt: string;
  updatedAt: string;
};

export type TeacherQuoteRecord = {
  id: string;
  quote: string;
  meaning: string;
  toneType: string;
  sourceLessonId: string | null;
  textPosition: number | null;
  status: KnowledgeStatus;
  createdAt: string;
  updatedAt: string;
};

export type TeacherMethodRecord = {
  id: string;
  title: string;
  steps: string[];
  conditions: string[];
  exceptions: string[];
  sourceLessonId: string | null;
  sourceQuote: string;
  status: KnowledgeStatus;
  createdAt: string;
  updatedAt: string;
};

export type ConflictRecordRow = {
  id: string;
  ruleAId: string;
  ruleBId: string;
  conflictType: string;
  possibleReason: string;
  resolution: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type AiExtractResult = {
  summary: string;
  cleanedTranscript: string;
  rules: Array<Partial<TeacherRuleRecord> & { title: string; conclusion: string; sourceQuote: string }>;
  cases: Array<Partial<TeacherCaseRecord> & { title: string; teacherConclusion: string; sourceQuote: string }>;
  concepts: Array<Partial<TeacherConceptRecord> & { name: string; definition: string; sourceQuote: string }>;
  quotes: Array<Partial<TeacherQuoteRecord> & { quote: string }>;
  methods: Array<Partial<TeacherMethodRecord> & { title: string; steps: string[] }>;
  exceptions: string[];
  uncertain: string[];
  possibleConflicts: Array<{ againstHint: string; reason: string; sourceQuote: string }>;
};

export type PredictionKnowledgeHit = {
  matchedRules: TeacherRuleRecord[];
  matchedCases: TeacherCaseRecord[];
  matchedMethods: TeacherMethodRecord[];
  matchedQuotes: TeacherQuoteRecord[];
  conflicts: ConflictRecordRow[];
  missingInformation: string[];
  citations: Array<{ type: "RULE" | "CASE" | "LESSON" | "METHOD" | "QUOTE"; code: string; label: string }>;
};
