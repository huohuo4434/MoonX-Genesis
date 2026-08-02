export type VibeEvidenceAssetId =
  | "googl"
  | "msft"
  | "tencent"
  | "kingsoft-office"
  | "mu"
  | "cxmt";

export type VibeEvidenceSourceMode = "VIBE_API" | "SEEDED" | "MANUAL";

export type VibeEvidenceStance =
  | "强烈偏多"
  | "偏多"
  | "中性"
  | "偏空"
  | "强烈偏空";

export type VibeEvidenceDimensionKey =
  | "financialQuality"
  | "valuation"
  | "capitalPositioning"
  | "industryStrength"
  | "events";

export type VibeEvidenceDimension = {
  key: VibeEvidenceDimensionKey;
  labelZh: string;
  score: number;
  weight: number;
  available: boolean;
  summary: string;
};

export type VibeEvidenceSnapshot = {
  assetId: VibeEvidenceAssetId;
  symbol: string;
  nameZh: string;
  market: "A" | "HK" | "US";
  benchmarkSymbol: string;
  sourceMode: VibeEvidenceSourceMode;
  sourceLabel: string;
  rawScore: number;
  effectiveScore: number;
  stance: VibeEvidenceStance;
  completeness: number;
  freshness: number;
  dimensions: VibeEvidenceDimension[];
  supports: string[];
  risks: string[];
  dataGaps: string[];
  sourceEndpoints: string[];
  updatedAt: string;
  lastSuccessAt: string | null;
  lastError: string | null;
  version: number;
};

export type VibeEvidencePublicView = Pick<
  VibeEvidenceSnapshot,
  | "assetId"
  | "symbol"
  | "nameZh"
  | "sourceMode"
  | "sourceLabel"
  | "effectiveScore"
  | "stance"
  | "completeness"
  | "freshness"
  | "dimensions"
  | "supports"
  | "risks"
  | "dataGaps"
  | "updatedAt"
  | "lastSuccessAt"
> & {
  dailyWeight: number;
  weeklyWeight: number;
  monthlyWeight: number;
};

export type VibeConnectionStatus = {
  configured: boolean;
  baseUrl: string | null;
  apiKeyConfigured: boolean;
  healthy: boolean;
  service: string | null;
  version: string | null;
  checkedAt: string;
  error: string | null;
};
