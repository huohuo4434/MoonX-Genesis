import type {
  UnifiedLiveMethodDecision,
  UnifiedLiveMethodInput,
  UnifiedLiveResonance,
  UnifiedLiveSide,
} from "@/types/unified-live-trading";

function normalizeDirection(value?: string | null): UnifiedLiveSide | null {
  const text = String(value ?? "").trim().toUpperCase();
  if (["UP", "LONG", "BULL", "BULLISH", "上涨", "看涨", "震荡上涨", "探底回升", "先跌后涨"].includes(text)) {
    return "LONG";
  }
  if (["DOWN", "SHORT", "BEAR", "BEARISH", "下跌", "看跌", "震荡下跌", "冲高回落", "先涨后跌"].includes(text)) {
    return "SHORT";
  }
  return null;
}

export function decideUnifiedLiveMethod(input: UnifiedLiveMethodInput): UnifiedLiveMethodDecision {
  const qimen = normalizeDirection(input.qimenDirection);
  const liuyao = normalizeDirection(input.liuyaoDirection);
  const technical = input.technicalDirection ?? "WAIT";
  const reasons: string[] = [];
  let resonance: UnifiedLiveResonance = "UNKNOWN";
  if (qimen && liuyao) resonance = qimen === liuyao ? "RESONANT" : "DIVERGENT";

  if (!liuyao) {
    return {
      allowed: false,
      side: null,
      resonance,
      riskMultiplier: 0,
      reasons: ["LIUYAO_FORMAL_DIRECTION_MISSING"],
      formalDirectionSource: "NONE",
      technicalCanOverrideDirection: false,
    };
  }

  if (technical === "WAIT") reasons.push("TECHNICAL_ENTRY_NOT_CONFIRMED");
  if (technical !== "WAIT" && technical !== liuyao) reasons.push("TECHNICAL_CONTRADICTS_FORMAL_DIRECTION");

  let riskMultiplier = 0;
  if (resonance === "RESONANT") riskMultiplier = 1;
  else if (resonance === "DIVERGENT") {
    riskMultiplier = input.horizon === "SHORT" ? 0.5 : input.horizon === "MEDIUM" ? 0.35 : 0.2;
    reasons.push("QIMEN_TIMING_DIVERGENCE_REDUCES_RISK");
  } else {
    riskMultiplier = input.assetPolicy === "FOCUS" ? 0.7 : 0.85;
    reasons.push("QIMEN_TIMING_SIGNAL_MISSING");
  }

  const technicalAligned = technical === liuyao;
  const allowed = riskMultiplier > 0 && technicalAligned;
  if (!allowed && technical !== "WAIT" && technical !== liuyao) {
    reasons.push("TECHNICAL_ANALYSIS_CANNOT_REVERSE_FORMAL_DIRECTION");
  }
  return {
    allowed,
    side: liuyao,
    resonance,
    riskMultiplier: allowed ? riskMultiplier : 0,
    reasons,
    formalDirectionSource: resonance === "RESONANT" ? "LIUYAO_QIMEN_RESONANCE" : "LIUYAO",
    technicalCanOverrideDirection: false,
  };
}
