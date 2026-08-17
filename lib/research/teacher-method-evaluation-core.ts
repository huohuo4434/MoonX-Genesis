import type { TeacherResearchEvaluation, TeacherResearchEvaluationInput } from "../../types/teacher-method-rulebook";

function conflicts(authority: "BULL" | "BEAR" | "NEUTRAL", signal: "BULL" | "BEAR" | "NEUTRAL"): boolean {
  return authority !== "NEUTRAL" && signal !== "NEUTRAL" && authority !== signal;
}

export function evaluateTeacherResearch(input: TeacherResearchEvaluationInput): TeacherResearchEvaluation {
  const liuyaoComplete = Boolean(
    input.liuyao.originalHexagram && input.liuyao.mutualHexagram && input.liuyao.changedHexagram &&
    Number.isInteger(input.liuyao.movingLine) && (input.liuyao.movingLine ?? 0) >= 1 && (input.liuyao.movingLine ?? 0) <= 6,
  );
  const coverage = {
    liuyao: liuyaoComplete,
    qimen: input.qimen.chartAvailable && Boolean(input.qimen.timingWindow),
    chan: input.chan.available && input.chan.complete,
    fundamentals: input.fundamentals.available,
  };
  const reasons: string[] = [];
  if (input.authoritativeDirection === "NEUTRAL") reasons.push("AUTHORITATIVE_DIRECTION_MISSING");
  if (!coverage.liuyao) reasons.push("LIUYAO_INPUT_INCOMPLETE");
  // Qimen, Chan and fundamentals are timing/execution/context evidence. Their absence
  // or disagreement may require waiting for execution, but cannot rewrite the formal direction.
  if (conflicts(input.authoritativeDirection, input.liuyao.direction)) reasons.push("LIUYAO_DIRECTION_CONFLICT");
  return {
    action: reasons.length ? "WAIT" : "RESEARCH_CANDIDATE",
    direction: input.authoritativeDirection,
    hardWaitReasons: reasons,
    evidenceCoverage: coverage,
    executionAuthority: "RESEARCH_ONLY",
    tradingEligible: false,
  };
}
