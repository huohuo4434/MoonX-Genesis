export type StrategyEnsembleSleeve = "LIUYAO" | "QIMEN" | "TECHNICAL" | "COMPOSITE";
export type StrategyEnsembleSide = "LONG" | "SHORT" | "WAIT";
export type StrategyEnsembleHorizon = "SHORT";

export interface StrategyEnsembleCandidate {
  id: string;
  generatedAt: string;
  forecastDate: string;
  sleeve: StrategyEnsembleSleeve;
  horizon: StrategyEnsembleHorizon;
  assetId: string;
  symbol: string;
  displayName: string;
  side: StrategyEnsembleSide;
  confidence: number;
  eligibleForApproval: boolean;
  reason: string;
  sourceDirection?: string | null;
  support?: string | null;
  resistance?: string | null;
  invalidation?: string | null;
  technicalScore?: number | null;
  technicalNote?: string | null;
  researchOnly?: boolean;
}

export interface StrategyEnsembleSnapshot {
  generatedAt: string;
  candidates: StrategyEnsembleCandidate[];
  actionable: StrategyEnsembleCandidate[];
  notes: string[];
}
