export const TLC_MAX_BYTES = 500 * 1024 * 1024;
export const TLC_MAX_DURATION_SEC = 4 * 60 * 60;

/** m4a first — WeChat voice exports */
export const TLC_ALLOWED_EXTS = [
  ".m4a",
  ".mp3",
  ".wav",
  ".aac",
  ".flac",
  ".ogg",
  ".mp4",
  ".mov",
  ".webm",
  ".mkv",
] as const;

export const TLC_MIME_BY_EXT: Record<string, string> = {
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
  ".ogg": "audio/ogg",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".mkv": "video/x-matroska",
};

export type LessonStatus =
  | "UPLOADED"
  | "READING"
  | "TRANSCRIBING"
  | "TRANSCRIBED"
  | "AI_LEARNING"
  | "RULES_READY"
  | "CASES_READY"
  | "READY"
  | "PUBLISHED"
  | "FAILED";

export type ProgressStepId = "read" | "whisper" | "ai" | "store";

export type ProgressStep = {
  id: ProgressStepId;
  label: string;
  status: "pending" | "running" | "done" | "error";
  percent: number;
};

export type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
};

export type DraftRule = {
  title: string;
  content: string;
  sourceMinute: string;
  confidence: "Draft";
};

export type DraftCase = {
  assetName: string;
  question: string;
  teacherConclusion: string;
  sourceText: string;
};

export type DraftConcept = {
  kind: "CONCEPT" | "MNEMONIC" | "EXCEPTION" | "PREDICTION";
  title: string;
  content: string;
};

export type DraftQuote = {
  text: string;
  sourceMinute: string;
};

export type TeacherLessonRecord = {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  durationSec: number | null;
  mime: string | null;
  audioUrl: string;
  wavUrl: string | null;
  rawText: string;
  segments: TranscriptSegment[];
  courseSummary: string;
  coreViews: string;
  classicQuotes: string[];
  draftRules: DraftRule[];
  draftCases: DraftCase[];
  draftConcepts: DraftConcept[];
  draftQuotes: DraftQuote[];
  draftMnemonics: DraftConcept[];
  draftExceptions: DraftConcept[];
  draftPredictions: DraftConcept[];
  status: LessonStatus;
  progress: ProgressStep[];
  errorMessage: string | null;
  publishedAt: string | null;
  learningSeconds: number;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeGrowthStats = {
  lessonCount: number;
  learningHours: number;
  ruleCount: number;
  caseCount: number;
  quoteCount: number;
};

export function defaultProgress(): ProgressStep[] {
  return [
    { id: "read", label: "读取音频", status: "pending", percent: 0 },
    { id: "whisper", label: "Whisper识别", status: "pending", percent: 0 },
    { id: "ai", label: "AI学习", status: "pending", percent: 0 },
    { id: "store", label: "知识库存储", status: "pending", percent: 0 },
  ];
}

export function estimateDurationSec(fileSize: number, ext: string): number {
  // Heuristic bitrates (bits/sec)
  const bitrate: Record<string, number> = {
    ".m4a": 128_000,
    ".mp3": 128_000,
    ".aac": 128_000,
    ".ogg": 96_000,
    ".wav": 1_411_000,
    ".flac": 700_000,
    ".mp4": 500_000,
    ".mov": 500_000,
    ".webm": 400_000,
    ".mkv": 600_000,
  };
  const bps = bitrate[ext.toLowerCase()] ?? 128_000;
  return Math.max(1, Math.round((fileSize * 8) / bps));
}
