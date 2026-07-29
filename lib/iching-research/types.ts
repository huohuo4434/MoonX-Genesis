export type IChingSourceType = "MASTER" | "INTERNAL";

export type IChingPriority = "HIGHEST" | "HIGH" | "NORMAL";

export type IChingResearchStatus =
  | "DRAFT"
  | "RESEARCH"
  | "WAITING_MASTER"
  | "MASTER_CONFIRMED"
  | "ADOPTED"
  | "REJECTED"
  | "VERIFIED"
  | "ARCHIVED";

export type IChingSpecialType =
  | "NORMAL"
  | "STATIC"
  | "SIX_CONFLICT"
  | "SIX_HARMONY"
  | "WANDERING_SOUL"
  | "RETURNING_SOUL";

export type IChingEngineType = "MASTER_ICHING";

export type IChingLineData = {
  linePosition: number; // 1..6
  sixGod?: string;
  relation?: string;
  earthlyBranch?: string;
  fiveElement?: string;
  isWorld?: boolean;
  isResponse?: boolean;
  isMoving?: boolean;
  changedRelation?: string;
  changedBranch?: string;
  changedElement?: string;
  hiddenSpirit?: string;
  flyingSpirit?: string;
  isMonthBroken?: boolean;
  isDayBroken?: boolean;
  isEmpty?: boolean;
  isTomb?: boolean;
  isAdvance?: boolean;
  isRetreat?: boolean;
  isReturnGenerate?: boolean;
  isReturnOvercome?: boolean;
  notes?: string;
  // Keep extensible: future versions may add more flags.
  [k: string]: unknown;
};

