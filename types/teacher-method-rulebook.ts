export type TeacherMethodRuleStatus =
  | "TEACHER_CONFIRMED_RULE"
  | "CASE_DERIVED_RULE"
  | "MOOX_INTERPRETATION"
  | "MISSING_RULE";

export type TeacherMethod = "WOLF_LIUYAO" | "GAOSHAN_CHAN" | "QIMEN_TIMING" | "NANA_FUNDAMENTALS" | "MOOX_POLICY";

export type TeacherMethodRule = {
  id: string;
  method: TeacherMethod;
  status: TeacherMethodRuleStatus;
  title: string;
  summary: string;
  sourceArtifactId: string;
  sourcePublishedAt: string | null;
  executionAuthority: "RESEARCH_ONLY";
};

export type TeacherMethodArtifact = {
  id: string;
  teacher: string;
  relativePath: string;
  sourcePublishedAt: string | null;
  transcriptionStatus: "TEXT_SOURCE" | "DOCX_REFERENCE_ONLY";
};

export type TeacherMethodRulebook = {
  version: "2026-08-15.v1" | "2026-08-23.v2" | "2026-08-24.v3";
  executionAuthority: "RESEARCH_ONLY";
  tradingEligible: false;
  artifacts: TeacherMethodArtifact[];
  rules: TeacherMethodRule[];
};

export type TeacherResearchDirection = "BULL" | "BEAR" | "NEUTRAL";

export type TeacherResearchEvaluationInput = {
  authoritativeDirection: TeacherResearchDirection;
  liuyao: {
    originalHexagram: string | null;
    mutualHexagram: string | null;
    changedHexagram: string | null;
    movingLine: number | null;
    direction: TeacherResearchDirection;
  };
  qimen: { chartAvailable: boolean; timingWindow: string | null };
  chan: { available: boolean; complete: boolean; direction: TeacherResearchDirection };
  fundamentals: { available: boolean; direction: TeacherResearchDirection };
};

export type TeacherResearchEvaluation = {
  action: "RESEARCH_CANDIDATE" | "WAIT";
  direction: TeacherResearchDirection;
  hardWaitReasons: string[];
  evidenceCoverage: { liuyao: boolean; qimen: boolean; chan: boolean; fundamentals: boolean };
  executionAuthority: "RESEARCH_ONLY";
  tradingEligible: false;
};
