export type ConsultationKind = "LIUYAO" | "BAZI";
export type ConsultationPlan = "MONTHLY" | "QUARTERLY" | "YEARLY";
export type ConsultationStatus =
  | "RESERVED" | "SUBMITTED" | "AI_DRAFTING" | "DRAFT_READY" | "HUMAN_REVIEW"
  | "NEEDS_INFO" | "REJECTED" | "APPROVED" | "CANCELLED" | "SYSTEM_FAILED"
  | "INFO_EXPIRED" | "PURGE_PENDING" | "PURGED";

export type LiuyaoInput = {
  kind: "LIUYAO"; question: string; scope: string; horizon: string; castAt: string;
  timezone: string; location: string; castMethod: string; replyEmail: string;
  linesBottomUp: [6 | 7 | 8 | 9, 6 | 7 | 8 | 9, 6 | 7 | 8 | 9, 6 | 7 | 8 | 9, 6 | 7 | 8 | 9, 6 | 7 | 8 | 9];
  consent: true;
};
export type BaziInput = {
  kind: "BAZI"; calendarType: "GREGORIAN" | "LUNAR"; leapMonth: boolean;
  birthDate: string; birthTime: string | null; timePrecision: "EXACT" | "UNKNOWN";
  timezone: string; location: string; sourceConfidence: "HIGH" | "MEDIUM" | "LOW";
  gender?: "FEMALE" | "MALE" | "UNSPECIFIED"; trueSolarTimeConsent: boolean;
  topic: string; horizon: string; replyEmail?: string; consent: true;
};
export type ConsultationInput = LiuyaoInput | BaziInput;

export type ConsultationPublicRequest = {
  id: string; kind: ConsultationKind; status: ConsultationStatus; createdAt: string; updatedAt: string;
  missingFields: string[]; reviewerLabel: "等待易老师复核" | "易老师复核：已完成";
  finalAnswer: string | null; disclosure: string | null; quotaConsumed: boolean;
};

export const CONSULTATION_DISCLOSURE = "由MOOX研究系统辅助整理，并经易老师本人复核。";
export const CONSULTATION_REVIEWER_DISPLAY_NAME = "易老师";
