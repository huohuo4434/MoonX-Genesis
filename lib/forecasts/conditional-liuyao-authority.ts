import { normalizeOfficialDirection, type OfficialDirection } from "./formal-direction";

export const CONDITIONAL_LIUYAO_AUTHORITY_VERSION = "2026-08-25.v1" as const;

export type LiuyaoAuthoritySource = "TEACHER" | "USER";
export type LiuyaoAuthorityStage = "PRE_PUBLICATION" | "LOCKED";
export type ArbitrationDirection = "UP" | "DOWN" | "FLAT" | "UP_THEN_DOWN" | "DOWN_THEN_UP";

export type ArbitrationEvidence = {
  sourceId: string;
  assetKey: string;
  horizonKey: string;
  targetWindowKey: string;
  direction: string;
  /** Evidence passed source, asset, horizon and freshness validation. */
  eligible: boolean;
  /** Evidence was recorded before the target window and before outcome data. */
  forwardLocked: boolean;
};

export type LiuyaoCandidate = ArbitrationEvidence & {
  source: LiuyaoAuthoritySource;
  sourceKind: "BINGWU_TEACHER" | "WOLF_TEACHER" | "USER_TEACHER_METHOD";
};

export type ConditionalLiuyaoAuthorityInput = {
  stage: LiuyaoAuthorityStage;
  teacher: LiuyaoCandidate | null;
  user: LiuyaoCandidate | null;
  qimen: ArbitrationEvidence | null;
  chan: ArbitrationEvidence | null;
  analystViews: ArbitrationEvidence[];
  /** Required only after publication; prevents a later evidence bundle from rewriting history. */
  lockedSource?: LiuyaoAuthoritySource | null;
};

export type ConditionalLiuyaoAuthorityReason =
  | "LOCKED_RECORD_IMMUTABLE"
  | "ONLY_TEACHER_CANDIDATE"
  | "ONLY_USER_CANDIDATE"
  | "NO_ELIGIBLE_LIUYAO_CANDIDATE"
  | "CANDIDATES_NOT_COMPARABLE"
  | "LIUYAO_CANDIDATES_AGREE"
  | "USER_SELECTED_BY_STRICT_CROSS_METHOD_CONSENSUS"
  | "TEACHER_RETAINS_SOFT_PRIORITY";

export type ConditionalLiuyaoAuthorityResult = {
  selectedSource: LiuyaoAuthoritySource | null;
  selectedDirection: OfficialDirection | null;
  reason: ConditionalLiuyaoAuthorityReason;
  teacherDirection: OfficialDirection | null;
  userDirection: OfficialDirection | null;
  showBoth: boolean;
  confidenceAdjustment: number;
  analystEligibleCount: number;
  analystUserAlignedCount: number;
  strictConsensusPassed: boolean;
  externalLayersSetDirectionDirectly: false;
  requiresNewVersion: boolean;
};

export const CONDITIONAL_LIUYAO_AUTHORITY_POLICY = Object.freeze({
  defaultTeacherWeightPct: 55,
  defaultUserWeightPct: 45,
  minimumIndependentAnalysts: 3,
  strictAnalystMajority: "MORE_THAN_HALF",
  requiredUserAlignedLayers: ["QIMEN", "ANALYST_MAJORITY", "CHAN"] as const,
  externalLayersSetDirectionDirectly: false,
  lockedRecordsRemainImmutable: true,
  ruleZh:
    "丙午老师、狼叔同周期完整六爻默认以55:45略高于用户自起六爻；仅在发布锁定前，且奇门、至少3名独立已批准博主的严格多数、完整缠论结构全部与用户六爻同向时，改由用户六爻拥有正式方向。外部三层只是六爻来源裁决证据，不能自己定方向；老师分歧继续展示。",
});

function eligible(evidence: ArbitrationEvidence | null): evidence is ArbitrationEvidence {
  return Boolean(evidence?.eligible && evidence.forwardLocked);
}

function normalizedScope(value: string): string {
  return value.trim().toUpperCase();
}

function sameScope(left: ArbitrationEvidence, right: ArbitrationEvidence): boolean {
  return (
    normalizedScope(left.assetKey) === normalizedScope(right.assetKey) &&
    normalizedScope(left.horizonKey) === normalizedScope(right.horizonKey) &&
    normalizedScope(left.targetWindowKey) === normalizedScope(right.targetWindowKey)
  );
}

function hasRecognizableDirection(raw: string): boolean {
  return /涨|跌|震荡|看多|看空|偏多|偏空|走强|转弱|上行|下行|回升|回落|承压|修复|盘整|横盘|整理|观望|等待确认|先抑后扬|先扬后抑/u.test(raw);
}

function eligibleWithDirection(
  evidence: ArbitrationEvidence | null,
): evidence is ArbitrationEvidence {
  return eligible(evidence) && hasRecognizableDirection(evidence.direction);
}

export function arbitrationDirection(raw: string | null | undefined): ArbitrationDirection {
  const normalized = normalizeOfficialDirection(raw);
  if (normalized === "先涨后跌") return "UP_THEN_DOWN";
  if (normalized === "先跌后涨") return "DOWN_THEN_UP";
  if (normalized === "上涨" || normalized === "震荡上涨") return "UP";
  if (normalized === "下跌" || normalized === "震荡下跌") return "DOWN";
  return "FLAT";
}

function selectedResult(input: {
  source: LiuyaoAuthoritySource | null;
  direction: OfficialDirection | null;
  reason: ConditionalLiuyaoAuthorityReason;
  teacherDirection: OfficialDirection | null;
  userDirection: OfficialDirection | null;
  showBoth: boolean;
  confidenceAdjustment: number;
  analystEligibleCount: number;
  analystUserAlignedCount: number;
  strictConsensusPassed: boolean;
  requiresNewVersion?: boolean;
}): ConditionalLiuyaoAuthorityResult {
  return {
    selectedSource: input.source,
    selectedDirection: input.direction,
    reason: input.reason,
    teacherDirection: input.teacherDirection,
    userDirection: input.userDirection,
    showBoth: input.showBoth,
    confidenceAdjustment: input.confidenceAdjustment,
    analystEligibleCount: input.analystEligibleCount,
    analystUserAlignedCount: input.analystUserAlignedCount,
    strictConsensusPassed: input.strictConsensusPassed,
    externalLayersSetDirectionDirectly: false,
    requiresNewVersion: input.requiresNewVersion ?? false,
  };
}

/**
 * Pre-publication source arbitration only. Qimen, approved analyst consensus
 * and Chan structure may choose between two complete Liuyao candidates, but
 * they never create an official direction of their own and never rewrite a
 * locked forecast.
 */
export function resolveConditionalLiuyaoAuthority(
  input: ConditionalLiuyaoAuthorityInput,
): ConditionalLiuyaoAuthorityResult {
  if (input.stage === "LOCKED") {
    const locked = input.lockedSource === "USER" ? input.user : input.teacher;
    return selectedResult({
      source: locked?.source ?? input.lockedSource ?? null,
      direction: locked ? normalizeOfficialDirection(locked.direction) : null,
      reason: "LOCKED_RECORD_IMMUTABLE",
      teacherDirection: input.teacher ? normalizeOfficialDirection(input.teacher.direction) : null,
      userDirection: input.user ? normalizeOfficialDirection(input.user.direction) : null,
      showBoth: Boolean(
        input.teacher &&
        input.user &&
        normalizeOfficialDirection(input.teacher.direction) !== normalizeOfficialDirection(input.user.direction)
      ),
      confidenceAdjustment: 0,
      analystEligibleCount: 0,
      analystUserAlignedCount: 0,
      strictConsensusPassed: false,
      requiresNewVersion: true,
    });
  }

  const teacher = eligibleWithDirection(input.teacher) ? input.teacher : null;
  const user = eligibleWithDirection(input.user) ? input.user : null;
  const teacherDirection = teacher ? normalizeOfficialDirection(teacher.direction) : null;
  const userDirection = user ? normalizeOfficialDirection(user.direction) : null;

  if (!teacher && !user) {
    return selectedResult({
      source: null,
      direction: null,
      reason: "NO_ELIGIBLE_LIUYAO_CANDIDATE",
      teacherDirection,
      userDirection,
      showBoth: false,
      confidenceAdjustment: -15,
      analystEligibleCount: 0,
      analystUserAlignedCount: 0,
      strictConsensusPassed: false,
    });
  }
  if (teacher && !user) {
    return selectedResult({
      source: "TEACHER", direction: teacherDirection, reason: "ONLY_TEACHER_CANDIDATE",
      teacherDirection, userDirection, showBoth: false, confidenceAdjustment: 0,
      analystEligibleCount: 0, analystUserAlignedCount: 0, strictConsensusPassed: false,
    });
  }
  if (!teacher && user) {
    return selectedResult({
      source: "USER", direction: userDirection, reason: "ONLY_USER_CANDIDATE",
      teacherDirection, userDirection, showBoth: false, confidenceAdjustment: 0,
      analystEligibleCount: 0, analystUserAlignedCount: 0, strictConsensusPassed: false,
    });
  }

  if (!sameScope(teacher!, user!)) {
    return selectedResult({
      source: "TEACHER", direction: teacherDirection, reason: "CANDIDATES_NOT_COMPARABLE",
      teacherDirection, userDirection, showBoth: true, confidenceAdjustment: -8,
      analystEligibleCount: 0, analystUserAlignedCount: 0, strictConsensusPassed: false,
    });
  }
  if (teacherDirection === userDirection) {
    return selectedResult({
      source: "TEACHER", direction: teacherDirection, reason: "LIUYAO_CANDIDATES_AGREE",
      teacherDirection, userDirection, showBoth: false, confidenceAdjustment: 5,
      analystEligibleCount: 0, analystUserAlignedCount: 0, strictConsensusPassed: false,
    });
  }

  const userSignature = arbitrationDirection(user!.direction);
  const qimenAligned =
    eligibleWithDirection(input.qimen) &&
    sameScope(input.qimen, user!) &&
    arbitrationDirection(input.qimen.direction) === userSignature;
  const chanAligned =
    eligibleWithDirection(input.chan) &&
    sameScope(input.chan, user!) &&
    arbitrationDirection(input.chan.direction) === userSignature;
  const analystGroups = new Map<string, ArbitrationEvidence[]>();
  for (const view of input.analystViews) {
    if (!eligibleWithDirection(view) || !sameScope(view, user!)) continue;
    const sourceKey = normalizedScope(view.sourceId);
    analystGroups.set(sourceKey, [...(analystGroups.get(sourceKey) ?? []), view]);
  }
  const independentAnalysts = [...analystGroups.values()].flatMap((views) => {
    const distinctDirections = new Set(views.map((view) => arbitrationDirection(view.direction)));
    // One analyst publishing conflicting same-window calls is not an independent vote.
    return distinctDirections.size === 1 ? [views[0]!] : [];
  });
  const analystUserAlignedCount = independentAnalysts.filter(
    (view) => arbitrationDirection(view.direction) === userSignature,
  ).length;
  const analystMajority =
    independentAnalysts.length >= CONDITIONAL_LIUYAO_AUTHORITY_POLICY.minimumIndependentAnalysts &&
    analystUserAlignedCount > independentAnalysts.length / 2;
  const strictConsensusPassed = qimenAligned && chanAligned && analystMajority;

  if (strictConsensusPassed) {
    return selectedResult({
      source: "USER",
      direction: userDirection,
      reason: "USER_SELECTED_BY_STRICT_CROSS_METHOD_CONSENSUS",
      teacherDirection,
      userDirection,
      showBoth: true,
      confidenceAdjustment: 5,
      analystEligibleCount: independentAnalysts.length,
      analystUserAlignedCount,
      strictConsensusPassed: true,
    });
  }

  return selectedResult({
    source: "TEACHER",
    direction: teacherDirection,
    reason: "TEACHER_RETAINS_SOFT_PRIORITY",
    teacherDirection,
    userDirection,
    showBoth: true,
    confidenceAdjustment: -10,
    analystEligibleCount: independentAnalysts.length,
    analystUserAlignedCount,
    strictConsensusPassed: false,
  });
}
