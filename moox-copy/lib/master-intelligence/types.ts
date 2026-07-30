/**
 * Master Intelligence Engine — shared types.
 * Teacher knowledge learning: Lesson → Transcript → Extract → Review → Publish.
 */

export type LessonSource = "MASTER" | "INTERNAL";

export type LessonStatus =
  | "UPLOADED"
  | "TRANSCRIBING"
  | "TRANSCRIBED"
  | "ANALYZING"
  | "REVIEWING"
  | "PUBLISHED"
  | "FAILED";

export type KnowledgeKind =
  | "RULE"
  | "CASE"
  | "CONCEPT"
  | "FORMULA"
  | "EXCEPTION"
  | "PREDICTION"
  | "QUOTE";

export type ReviewStatus = "DRAFT" | "APPROVED" | "REJECTED" | "PUBLISHED";

export type ConflictStatus = "OPEN" | "RESOLVED";

export type CaseHitStatus = "HIT" | "PARTIAL" | "MISS" | "PENDING";

export type VoiceSignal = "HIGH_CERTAINTY" | "NO_CONCLUSION" | "HIGH_WEIGHT" | "NEUTRAL";

export type KnowledgeWeightTier =
  | "TEACHER"
  | "TEACHER_CASE"
  | "INTERNAL"
  | "AI_SUMMARY"
  | "TECHNICAL"
  | "WEB";

export const KNOWLEDGE_WEIGHT_STARS: Record<KnowledgeWeightTier, number> = {
  TEACHER: 5,
  TEACHER_CASE: 5,
  INTERNAL: 4,
  AI_SUMMARY: 3,
  TECHNICAL: 2,
  WEB: 1,
};

export const LESSON_MEDIA_MIME_ALLOW = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/wav",
  "audio/x-wav",
  "audio/aac",
  "audio/flac",
  "audio/x-flac",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
] as const;

export const LESSON_MEDIA_EXT_ALLOW = [
  ".mp3",
  ".m4a",
  ".wav",
  ".aac",
  ".flac",
  ".mp4",
  ".mov",
  ".webm",
  ".mkv",
] as const;

export type ExtractedItem = {
  title: string;
  body: string;
  motif?: string;
  assetId?: string;
  forecastStartAt?: string;
  forecastEndAt?: string;
};

export type ExtractionBundle = {
  summary: string;
  rules: ExtractedItem[];
  cases: ExtractedItem[];
  concepts: ExtractedItem[];
  formulas: ExtractedItem[];
  exceptions: ExtractedItem[];
  predictions: ExtractedItem[];
  quotes: ExtractedItem[];
};

export type ReasoningCitation = {
  type: "RULE" | "CASE" | "GRAPH" | "VOICE";
  ref: string;
  title: string;
  weightStars: number;
  snippet?: string;
};

export type ReasoningResult = {
  analysis: string;
  citations: ReasoningCitation[];
  ruleCodes: string[];
  caseIds: string[];
  graphPath: string[];
  voiceSignals: VoiceSignal[];
};
