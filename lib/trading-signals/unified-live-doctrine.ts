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

  if (!qimen) {
    return {
      allowed: false,
      side: null,
      resonance,
      riskMultiplier: 0,
      reasons: ["QIMEN_FORMAL_DIRECTION_MISSING"],
      formalDirectionSource: "NONE",
      technicalCanOverrideDirection: false,
    };
  }

  if (technical === "WAIT") reasons.push("TECHNICAL_ENTRY_NOT_CONFIRMED");
  if (technical !== "WAIT" && technical !== qimen) reasons.push("TECHNICAL_CONTRADICTS_FORMAL_DIRECTION");

  let riskMultiplier = 0;
  if (input.assetPolicy === "FOCUS") {
    if (resonance !== "RESONANT") reasons.push("FOCUS_ASSET_REQUIRES_QIMEN_LIUYAO_RESONANCE");
    riskMultiplier = resonance === "RESONANT" ? 1 : 0;
  } else {
    if (resonance === "RESONANT") riskMultiplier = 1;
    else if (resonance === "DIVERGENT") {
      riskMultiplier = input.horizon === "SHORT" ? 0.35 : input.horizon === "MEDIUM" ? 0.2 : 0;
      reasons.push("CORE_MARKET_QIMEN_LIUYAO_DIVERGENCE_REDUCES_RISK");
    } else {
      riskMultiplier = input.horizon === "LONG" ? 0 : 0.5;
      reasons.push("LIUYAO_AUXILIARY_SIGNAL_MISSING");
    }
  }

  const technicalAligned = technical === qimen;
  const allowed = riskMultiplier > 0 && technicalAligned;
  if (!allowed && technical !== "WAIT" && technical !== qimen) {
    reasons.push("TECHNICAL_ANALYSIS_CANNOT_REVERSE_FORMAL_DIRECTION");
  }
  return {
    allowed,
    side: qimen,
    resonance,
    riskMultiplier: allowed ? riskMultiplier : 0,
    reasons,
    formalDirectionSource: resonance === "RESONANT" ? "QIMEN_LIUYAO_RESONANCE" : "QIMEN",
    technicalCanOverrideDirection: false,
  };
}
