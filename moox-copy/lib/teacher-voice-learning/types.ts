export type TeacherNoteStatus =
  | "UPLOADED"
  | "TRANSCRIBING"
  | "TRANSCRIBED"
  | "LEARNING"
  | "READY"
  | "FAILED";

/** Stored in teacher_notes.rules — fixed learning template sections. */
export type CoreTheoryRules = {
  老师核心规则?: string;
  六亲判断?: string;
  世应判断?: string;
  财爻判断?: string;
  旺衰判断?: string;
  错误复盘?: string;
  /** Granular keys kept for search / compatibility */
  世爻?: string;
  应爻?: string;
  财爻?: string;
  官鬼?: string;
  父母?: string;
  兄弟?: string;
  子孙?: string;
  旺衰?: string;
  月建?: string;
  日辰?: string;
  伏神?: string;
  飞神?: string;
  化进化退?: string;
  [k: string]: string | undefined;
};

export const ORGANIZE_SECTION_KEYS = [
  "老师核心规则",
  "六亲判断",
  "世应判断",
  "财爻判断",
  "旺衰判断",
  "错误复盘",
] as const;

export type TeacherCaseItem = {
  question: string;
  hexagram: string;
  teacherJudgment: string;
  actualResult: string;
};

export type CallableKnowledgeItem = {
  category: string;
  topic: string;
  rule: string;
  example: string;
  keywords: string[];
};

export type TeacherNoteRecord = {
  id: string;
  /** Maps to DB column audio_url */
  sourceAudio: string;
  rawText: string;
  summary: string;
  rules: CoreTheoryRules | null;
  cases: TeacherCaseItem[];
  knowledge: CallableKnowledgeItem[];
  keywords: string[];
  status: TeacherNoteStatus;
  progress: number;
  errorMessage: string | null;
  /** Maps to DB column created_at */
  createdTime: string;
  updatedAt: string;
};

export type TeacherLearningFeedbackRecord = {
  id: string;
  teacherNoteId: string | null;
  assetId: string | null;
  query: string | null;
  prediction: string;
  actual: string;
  correct: boolean;
  reviewNote: string | null;
  createdAt: string;
};

export const VOICE_LEARNING_EXTS = [".mp3", ".m4a", ".wav", ".mp4"] as const;
