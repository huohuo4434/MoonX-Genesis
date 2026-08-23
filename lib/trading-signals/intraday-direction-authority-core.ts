import type {
  ThreeHorizonDecisionStatus,
  ThreeHorizonDirection,
} from "@/types/three-horizon-strategy";

/**
 * Formal MOOX research owns the executable side. A pre-declared weekly tactical
 * segment may select its own side only through the dedicated focus gate; Bazi,
 * Chan and other auxiliary signals are intentionally absent from this API.
 */
export function resolveIntradayExecutionDirection(input: {
  officialDirection: ThreeHorizonDirection;
  focusCountertrend: boolean;
  focusTacticalDirection: ThreeHorizonDirection;
}): ThreeHorizonDirection {
  return input.focusCountertrend
    ? input.focusTacticalDirection
    : input.officialDirection;
}

export const AUXILIARY_DIRECTION_CONFLICT_REASON =
  "资产八字与正式方向冲突；辅助先验只能降级或阻止入场，不能反向覆盖正式方向。";

const ACTIVITY_PROMOTABLE_REJECTION_CODES = new Set(["CONFIDENCE_LOW"]);

/**
 * Daily activity targets may relax only a low-confidence threshold. Every
 * other rejection is fail-closed so newly introduced safety gates cannot be
 * promoted by default.
 */
export function isActivityPromotionEligible(input: {
  status: ThreeHorizonDecisionStatus;
  rejectionCode: string;
}): boolean {
  return input.status === "OBSERVING" && ACTIVITY_PROMOTABLE_REJECTION_CODES.has(input.rejectionCode);
}

/** Final fail-closed guard for new exposure; direction is preserved for audit. */
export function applyAuxiliaryDirectionConflictGuard<T extends {
  ready: boolean;
  executionTier: "FULL" | "PROBE" | "OBSERVE";
  riskScale: number;
  rejectionCode: string;
  rejectionReason: string;
  raw: Record<string, unknown>;
}>(evaluation: T, hasConflict: boolean): T {
  if (!hasConflict) return evaluation;
  return {
    ...evaluation,
    ready: false,
    executionTier: "OBSERVE",
    riskScale: 0,
    rejectionCode: "AUXILIARY_DIRECTION_CONFLICT",
    rejectionReason: AUXILIARY_DIRECTION_CONFLICT_REASON,
    raw: {
      ...evaluation.raw,
      executionTier: "OBSERVE",
      riskScale: 0,
      auxiliaryDirectionConflict: true,
    },
  };
}
