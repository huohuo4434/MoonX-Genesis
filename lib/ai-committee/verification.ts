import {
  COMMITTEE_BUILDER_ROLE_IDS,
  COMMITTEE_EVIDENCE_LABELS,
  type CommitteeInput,
  type CommitteeReview,
  type CommitteeRoleOpinion,
  type VerificationGateResult,
} from "@/lib/ai-committee/types";

function nonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

export function runInputGates(input: CommitteeInput): VerificationGateResult[] {
  const evidenceFields = [
    input.marketContext,
    input.technicalEvidence,
    input.liuyaoQimenEvidence,
    input.macroEvidence,
    input.existingView,
    input.sourceNotes,
  ].filter(nonEmpty).length;

  return [
    {
      id: "scope-contract",
      label: "范围合同",
      passed: nonEmpty(input.asset) && nonEmpty(input.horizon) && nonEmpty(input.asOf),
      severity: "BLOCKER",
      message: "必须明确资产、周期和资料时点。",
    },
    {
      id: "minimum-evidence",
      label: "最少证据",
      passed: evidenceFields >= 2,
      severity: "BLOCKER",
      message: "至少提供两类独立证据，避免单一观点自证。",
    },
    {
      id: "market-anchor",
      label: "市场锚点",
      passed: nonEmpty(input.marketContext) || nonEmpty(input.technicalEvidence),
      severity: "BLOCKER",
      message: "必须有市场背景或技术结构作为现实锚点。",
    },
    {
      id: "risk-boundary",
      label: "风险边界",
      passed: nonEmpty(input.riskConstraints),
      severity: "WARNING",
      message: "建议填写仓位、杠杆、止损或不可交易条件。",
    },
  ];
}

export function hasBlockingGate(gates: VerificationGateResult[]): boolean {
  return gates.some((gate) => gate.severity === "BLOCKER" && !gate.passed);
}

export function runOutputGates(
  opinions: CommitteeRoleOpinion[],
  review: CommitteeReview
): VerificationGateResult[] {
  const roleIds = new Set(opinions.map((item) => item.roleId));
  const allRolesPresent = COMMITTEE_BUILDER_ROLE_IDS.every((roleId) => roleIds.has(roleId));
  const legalRefs = opinions.every(
    (item) =>
      item.evidenceRefs.length > 0 &&
      item.evidenceRefs.every((ref) => COMMITTEE_EVIDENCE_LABELS.includes(ref))
  );
  const hasDataGaps = opinions.some((item) => item.dataGaps.length > 0);
  const confidenceRespectsGaps = !hasDataGaps || review.confidence <= 85;
  const unsupportedClaimsHandled =
    review.unsupportedClaims.length === 0 || review.publishDecision !== "APPROVED";

  return [
    {
      id: "role-completeness",
      label: "角色完整性",
      passed: opinions.length === COMMITTEE_BUILDER_ROLE_IDS.length && allRolesPresent,
      severity: "BLOCKER",
      message: "五个Builder角色必须全部出现且不得重复。",
    },
    {
      id: "evidence-traceability",
      label: "证据可追溯",
      passed: legalRefs,
      severity: "BLOCKER",
      message: "每个角色必须引用合法证据标签。",
    },
    {
      id: "builder-reviewer-separation",
      label: "生成与审稿分离",
      passed: review.roleId === "REVIEWER",
      severity: "BLOCKER",
      message: "最终结论必须由独立Reviewer审核。",
    },
    {
      id: "disagreement-preserved",
      label: "保留真实分歧",
      passed: review.disagreements.length > 0,
      severity: "BLOCKER",
      message: "不得把多方法分歧压缩成虚假一致。",
    },
    {
      id: "invalidation-present",
      label: "失效条件",
      passed: nonEmpty(review.invalidation),
      severity: "BLOCKER",
      message: "必须明确什么情况会推翻当前结论。",
    },
    {
      id: "uncertainty-calibration",
      label: "不确定性校准",
      passed: confidenceRespectsGaps,
      severity: "WARNING",
      message: "存在资料缺口时，最终信心不得虚高。",
    },
    {
      id: "unsupported-claims",
      label: "未支持论断",
      passed: unsupportedClaimsHandled,
      severity: "BLOCKER",
      message: "存在未支持论断时不得直接批准发布。",
    },
    {
      id: "research-only",
      label: "仅供研究",
      passed: true,
      severity: "INFO",
      message: "委员会结果不能直接触发实盘交易。",
    },
  ];
}
