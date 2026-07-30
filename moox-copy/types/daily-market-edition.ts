import type { LocalizedText } from "@/lib/i18n/config";

export type DailyCoreAssetId = "bitcoin" | "sp500" | "nasdaq100" | "gold";

export type DailyCoreDirection = "上涨" | "下跌" | "震荡";

export type DailyCorePath =
  | "单边上涨"
  | "单边下跌"
  | "震荡"
  | "震荡上涨"
  | "震荡下跌"
  | "先涨后跌"
  | "先跌后涨"
  | "冲高回落"
  | "探底回升";

export type DailyCoreVerificationResult = "hit" | "partial" | "miss" | "invalidated" | "pending";

export type DailyMarketForecastFrameworkContribution = {
  id: string;
  label: LocalizedText;
  weight: number;
  note?: LocalizedText;
};

export type DailyMarketForecastVerificationDimension = {
  result: DailyCoreVerificationResult;
  note?: LocalizedText;
};

export type DailyMarketForecastVerification = {
  direction: DailyMarketForecastVerificationDimension;
  intradayPath: DailyMarketForecastVerificationDimension;
  levels: DailyMarketForecastVerificationDimension;
  invalidation: DailyMarketForecastVerificationDimension;
  timeWindow: DailyMarketForecastVerificationDimension;
  updates?: Array<{
    recordedAt: string;
    note: LocalizedText;
    direction?: DailyMarketForecastVerificationDimension;
    intradayPath?: DailyMarketForecastVerificationDimension;
    levels?: DailyMarketForecastVerificationDimension;
    invalidation?: DailyMarketForecastVerificationDimension;
    timeWindow?: DailyMarketForecastVerificationDimension;
  }>;
};

export type DailyMarketForecastEntry = {
  assetId: DailyCoreAssetId;
  symbol: string;
  assetName: LocalizedText;
  marketLabel: LocalizedText;
  mainDirection: DailyCoreDirection;
  intradayPath: DailyCorePath;
  initialMainDirection: DailyCoreDirection;
  initialIntradayPath: DailyCorePath;
  summary: LocalizedText;
  frameworkDisclaimer: LocalizedText;
  memberEvidenceNote?: LocalizedText;
  confidence: number;
  supportLevels: string[];
  resistanceLevels: string[];
  confirmation?: LocalizedText;
  invalidation?: LocalizedText;
  conditions?: LocalizedText[];
  linkedSignalIds: string[];
  evidenceRecordIds: string[];
  frameworkContributions: DailyMarketForecastFrameworkContribution[];
  verification: DailyMarketForecastVerification;
};

export type DailyMarketForecastEdition = {
  id: string;
  forecastDate: string;
  memberAvailableAt: string;
  publicAvailableAt: string;
  publishedAt: string;
  version: number;
  overallSummary: LocalizedText;
  status: "published";
  entries: DailyMarketForecastEntry[];
};

export type DailyMarketForecastEditionTeaser = {
  id: string;
  forecastDate: string;
  memberAvailableAt: string;
  publicAvailableAt: string;
  publishedAt: string;
  version: number;
  assetIds: DailyCoreAssetId[];
  assetNames: LocalizedText[];
  status: "published";
};

export type DailyMarketForecastEditionAccessMode =
  | "public_locked"
  | "public_open"
  | "member_early"
  | "admin";

export type DailyMarketForecastEditionPayload =
  | {
      state: "empty";
      mode: "public_locked" | "member_early" | "admin" | "public_open";
      nextMemberAvailabilityLabel: string;
      nextPublicAvailabilityLabel: string;
      edition: null;
      teaser: null;
    }
  | {
      state: "ready";
      mode: DailyMarketForecastEditionAccessMode;
      nextMemberAvailabilityLabel: string;
      nextPublicAvailabilityLabel: string;
      edition: DailyMarketForecastEdition | null;
      teaser: DailyMarketForecastEditionTeaser;
    };
