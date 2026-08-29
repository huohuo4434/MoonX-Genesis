import { findExternalAnalystSource, type ExternalAnalystRole } from "./external-analyst-role-registry";

export type ExternalViewpointCard = {
  id: string;
  sourceId: string;
  sourcePublishedAt: string;
  ingestedAt: string;
  asset: string;
  symbol: string;
  horizon: "WEEK" | "MONTH" | "EVENT";
  applicableStart: string;
  applicableEnd: string;
  role: ExternalAnalystRole;
  bias: "BULLISH" | "BEARISH" | "NEUTRAL" | "TIMING_ONLY";
  thesis: string;
  path: string;
  supports: number[];
  resistances: number[];
  targets: number[];
  confirmation: string;
  invalidation: string;
  evidenceType: "SOURCE_STATEMENT" | "SYSTEM_INFERENCE";
  sourceTimeVerified: boolean;
  status: "FORWARD_LOCKED" | "NOTE_ONLY" | "RETROSPECTIVE" | "EXPIRED";
  internalSourceRef: string;
  consensusEligible: false;
  tradingEligible: false;
};

export type ExternalViewpointAssessment = {
  accepted: boolean;
  forwardScoreEligible: boolean;
  reasons: string[];
  dedupeKey: string;
  authority: "RESEARCH_ONLY";
  tradingEligible: false;
};

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function validInstant(value: string) {
  return Boolean(value) && Number.isFinite(Date.parse(value));
}

function validDateKey(value: string) {
  if (!DATE_KEY.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function externalViewpointDedupeKey(card: ExternalViewpointCard) {
  return [card.sourceId, card.symbol, card.horizon, card.applicableStart, card.applicableEnd].join(":");
}

export function assessExternalViewpointCard(card: ExternalViewpointCard): ExternalViewpointAssessment {
  const reasons: string[] = [];
  const source = findExternalAnalystSource(card.sourceId);
  if (!source) reasons.push("SOURCE_NOT_REGISTERED");
  else if (source.role !== card.role) reasons.push("SOURCE_ROLE_MISMATCH");
  if (!validInstant(card.sourcePublishedAt) || !validInstant(card.ingestedAt)) reasons.push("TIMESTAMP_INVALID");
  if (!validDateKey(card.applicableStart) || !validDateKey(card.applicableEnd)) reasons.push("PERIOD_INVALID");
  else if (card.applicableStart > card.applicableEnd) reasons.push("PERIOD_REVERSED");
  if (!card.asset.trim() || !card.symbol.trim()) reasons.push("ASSET_REQUIRED");
  if (!card.thesis.trim() || !card.path.trim()) reasons.push("THESIS_OR_PATH_REQUIRED");
  if (card.role === "TECHNICAL_LEVELS" && (!card.confirmation.trim() || !card.invalidation.trim())) {
    reasons.push("TECHNICAL_CONDITIONS_REQUIRED");
  }
  const startAt = Date.parse(`${card.applicableStart}T00:00:00.000Z`);
  if (validInstant(card.sourcePublishedAt) && Date.parse(card.sourcePublishedAt) >= startAt) reasons.push("SOURCE_NOT_BEFORE_PERIOD");
  if (validInstant(card.ingestedAt) && Date.parse(card.ingestedAt) >= startAt) reasons.push("INGEST_NOT_BEFORE_PERIOD");
  if (card.status === "FORWARD_LOCKED" && !card.sourceTimeVerified) reasons.push("SOURCE_TIME_UNVERIFIED");
  if (card.consensusEligible !== false || card.tradingEligible !== false) reasons.push("AUTHORITY_ESCALATION_FORBIDDEN");

  const uniqueReasons = Array.from(new Set(reasons));
  return {
    accepted: uniqueReasons.length === 0,
    forwardScoreEligible: uniqueReasons.length === 0 && card.status === "FORWARD_LOCKED",
    reasons: uniqueReasons,
    dedupeKey: externalViewpointDedupeKey(card),
    authority: "RESEARCH_ONLY",
    tradingEligible: false,
  };
}

export function findDuplicateExternalViewpoints(cards: ExternalViewpointCard[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const card of cards) {
    const key = externalViewpointDedupeKey(card);
    if (seen.has(key)) duplicates.add(key);
    seen.add(key);
  }
  return Array.from(duplicates);
}
