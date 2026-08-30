export type QimenSchoolId = "OBJECT_YONGSHEN" | "DIRECTIONAL_PALACE";
export type QimenSchoolDirection = "UP" | "DOWN" | "SIDEWAYS";
export type QimenSchoolReadiness = "FORWARD_READY" | "RESEARCH_ONLY" | "UNAVAILABLE";

export type QimenSchoolDefinition = {
  id: QimenSchoolId;
  publicLabel: string;
  internalSourceFamily: "WU_TEACHER" | "GOLDEN_RABBIT";
  methodSummary: string;
  requiredInputs: readonly string[];
  operatorStemRole: "AUXILIARY_CONTEXT" | "OPERATOR_ACTION_CONTEXT";
  authority: "TIMING_AND_RISK_ONLY";
  maySetOfficialDirection: false;
  mayTriggerTrade: false;
};

export type ObjectYongshenInput = {
  asset: string;
  primaryStems: readonly string[];
  secondaryStems?: readonly string[];
  basis: "TEACHER_EXPLICIT" | "TEACHER_CASE" | "GENERIC_FALLBACK";
  sourceId: string;
};

export type DirectionalPalaceInput = {
  chartId: string;
  sourceId: string;
  question: string;
  upPalace: number | null;
  downPalace: number | null;
  sidewaysPalace: number | null;
  recordedBeforeOutcome: boolean;
};

export type QimenSchoolReadinessResult = {
  schoolId: QimenSchoolId;
  readiness: QimenSchoolReadiness;
  eligibleForForwardScore: boolean;
  reasons: string[];
  authority: "TIMING_AND_RISK_ONLY";
  maySetOfficialDirection: false;
  mayTriggerTrade: false;
};

export type QimenSchoolReading = {
  schoolId: QimenSchoolId;
  direction: QimenSchoolDirection;
  confidence: number;
  readiness: QimenSchoolReadiness;
  sourceId: string;
  chartId: string;
};

export type QimenSchoolCommitteeResult = {
  relation: "RESONANCE" | "DIVERGENCE" | "SINGLE_METHOD" | "UNAVAILABLE";
  timingBias: QimenSchoolDirection | null;
  confidence: number | null;
  contributingSchools: QimenSchoolId[];
  independence: "METHOD_DIVERSITY_ONLY_NOT_SOURCE_CONSENSUS";
  executionAdvice: "KEEP_FORMAL_DIRECTION" | "WAIT_OR_REDUCE" | "NO_QIMEN_ADVICE";
  maySetOfficialDirection: false;
  mayTriggerTrade: false;
  reasons: string[];
};

const SCHOOL_REGISTRY: Readonly<Record<QimenSchoolId, QimenSchoolDefinition>> = Object.freeze({
  OBJECT_YONGSHEN: Object.freeze({
    id: "OBJECT_YONGSHEN",
    publicLabel: "对象用神流派",
    internalSourceFamily: "WU_TEACHER",
    methodSummary: "先锁定产品对象用神，再看天盘、地盘、落宫旺衰、门星神与宫际生克。",
    requiredInputs: ["完整奇门盘", "明确资产", "有来源的产品用神"],
    operatorStemRole: "AUXILIARY_CONTEXT",
    authority: "TIMING_AND_RISK_ONLY",
    maySetOfficialDirection: false,
    mayTriggerTrade: false,
  }),
  DIRECTIONAL_PALACE: Object.freeze({
    id: "DIRECTIONAL_PALACE",
    publicLabel: "定向取宫流派",
    internalSourceFamily: "GOLDEN_RABBIT",
    methodSummary: "分别记录上涨、下跌、震荡结果宫并比较强弱；日干时干优先解释求测人与操作状态。",
    requiredInputs: ["完整奇门盘", "明确问题", "上涨宫", "下跌宫", "震荡宫", "结果前记录"],
    operatorStemRole: "OPERATOR_ACTION_CONTEXT",
    authority: "TIMING_AND_RISK_ONLY",
    maySetOfficialDirection: false,
    mayTriggerTrade: false,
  }),
});

function isPalace(value: number | null): value is number {
  return Number.isInteger(value) && value !== null && value >= 1 && value <= 9;
}

function boundedConfidence(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getQimenSchoolRegistry(): typeof SCHOOL_REGISTRY {
  return SCHOOL_REGISTRY;
}

export function assessObjectYongshenReadiness(input: {
  chartComplete: boolean;
  objectInput: ObjectYongshenInput | null;
}): QimenSchoolReadinessResult {
  const reasons: string[] = [];
  if (!input.chartComplete) reasons.push("缺少完整奇门盘。");
  if (!input.objectInput?.asset.trim()) reasons.push("缺少明确资产。");
  if (!input.objectInput?.sourceId.trim()) reasons.push("产品用神缺少可追溯来源。");
  if (!input.objectInput?.primaryStems.length) reasons.push("缺少产品主用神。");
  if (reasons.length) {
    return {
      schoolId: "OBJECT_YONGSHEN",
      readiness: "UNAVAILABLE",
      eligibleForForwardScore: false,
      reasons,
      authority: "TIMING_AND_RISK_ONLY",
      maySetOfficialDirection: false,
      mayTriggerTrade: false,
    };
  }

  const provisional = input.objectInput?.basis === "GENERIC_FALLBACK";
  return {
    schoolId: "OBJECT_YONGSHEN",
    readiness: provisional ? "RESEARCH_ONLY" : "FORWARD_READY",
    eligibleForForwardScore: !provisional,
    reasons: provisional
      ? ["当前仅有通用时干/日干回退，不能冒充老师明确的产品用神。"]
      : ["产品用神、资产和来源齐全，可独立进入前瞻验证。"],
    authority: "TIMING_AND_RISK_ONLY",
    maySetOfficialDirection: false,
    mayTriggerTrade: false,
  };
}

export function assessDirectionalPalaceReadiness(input: {
  chartComplete: boolean;
  directionalInput: DirectionalPalaceInput | null;
}): QimenSchoolReadinessResult {
  const reasons: string[] = [];
  const value = input.directionalInput;
  if (!input.chartComplete) reasons.push("缺少完整奇门盘。");
  if (!value?.chartId.trim()) reasons.push("缺少盘面标识。");
  if (!value?.sourceId.trim()) reasons.push("缺少可追溯来源。");
  if (!value?.question.trim()) reasons.push("缺少明确问题。");
  const palaces = value ? [value.upPalace, value.downPalace, value.sidewaysPalace] : [];
  if (palaces.length !== 3 || !palaces.every(isPalace)) reasons.push("上涨、下跌、震荡三宫没有完整记录。");
  if (palaces.length === 3 && palaces.every(isPalace) && new Set(palaces).size !== 3) {
    reasons.push("上涨、下跌、震荡结果宫存在重复，无法独立比较。");
  }
  if (!value?.recordedBeforeOutcome) reasons.push("结果宫不是在结果发生前锁定，不计前瞻样本。");
  if (reasons.length) {
    return {
      schoolId: "DIRECTIONAL_PALACE",
      readiness: "UNAVAILABLE",
      eligibleForForwardScore: false,
      reasons,
      authority: "TIMING_AND_RISK_ONLY",
      maySetOfficialDirection: false,
      mayTriggerTrade: false,
    };
  }
  return {
    schoolId: "DIRECTIONAL_PALACE",
    readiness: "RESEARCH_ONLY",
    eligibleForForwardScore: true,
    reasons: ["三类结果宫已在结果前完整记录；当前仍按新方法独立积累前瞻样本。"],
    authority: "TIMING_AND_RISK_ONLY",
    maySetOfficialDirection: false,
    mayTriggerTrade: false,
  };
}

/**
 * Method agreement is not a direction vote. It can only describe timing/risk
 * resonance and is never converted into official authority or an order permit.
 */
export function combineIndependentQimenReadings(
  readings: readonly QimenSchoolReading[],
): QimenSchoolCommitteeResult {
  const eligible = readings.filter((item) => item.readiness !== "UNAVAILABLE");
  const duplicateSchool = new Set(eligible.map((item) => item.schoolId)).size !== eligible.length;
  if (!eligible.length || duplicateSchool) {
    return {
      relation: "UNAVAILABLE",
      timingBias: null,
      confidence: null,
      contributingSchools: [],
      independence: "METHOD_DIVERSITY_ONLY_NOT_SOURCE_CONSENSUS",
      executionAdvice: "NO_QIMEN_ADVICE",
      maySetOfficialDirection: false,
      mayTriggerTrade: false,
      reasons: [duplicateSchool ? "同一流派存在重复读数，禁止重复计票。" : "没有可用的独立流派读数。"],
    };
  }

  const normalized = eligible.map((item) => ({ ...item, confidence: boundedConfidence(item.confidence) }));
  if (normalized.length === 1) {
    const only = normalized[0]!;
    return {
      relation: "SINGLE_METHOD",
      timingBias: only.direction,
      confidence: only.confidence,
      contributingSchools: [only.schoolId],
      independence: "METHOD_DIVERSITY_ONLY_NOT_SOURCE_CONSENSUS",
      executionAdvice: "KEEP_FORMAL_DIRECTION",
      maySetOfficialDirection: false,
      mayTriggerTrade: false,
      reasons: ["仅有一个流派可用，只作独立择时观察，不形成方法共振。"],
    };
  }

  const directions = new Set(normalized.map((item) => item.direction));
  const confidence = Math.min(...normalized.map((item) => item.confidence));
  if (directions.size === 1) {
    return {
      relation: "RESONANCE",
      timingBias: normalized[0]!.direction,
      confidence,
      contributingSchools: normalized.map((item) => item.schoolId),
      independence: "METHOD_DIVERSITY_ONLY_NOT_SOURCE_CONSENSUS",
      executionAdvice: "KEEP_FORMAL_DIRECTION",
      maySetOfficialDirection: false,
      mayTriggerTrade: false,
      reasons: ["两种方法同向，只提高择时解释力；不等同于两位独立来源投票。"],
    };
  }

  return {
    relation: "DIVERGENCE",
    timingBias: null,
    confidence: null,
    contributingSchools: normalized.map((item) => item.schoolId),
    independence: "METHOD_DIVERSITY_ONLY_NOT_SOURCE_CONSENSUS",
    executionAdvice: "WAIT_OR_REDUCE",
    maySetOfficialDirection: false,
    mayTriggerTrade: false,
    reasons: ["流派结论分歧，保持正式方向但择时层等待或降低风险。"],
  };
}
