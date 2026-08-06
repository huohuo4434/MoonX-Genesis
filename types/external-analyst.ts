// MOOX_EXTERNAL_ANALYST_V1
import type {
  ThreeHorizonDirection,
  ThreeHorizonStrategyType,
} from "@/types/three-horizon-strategy";

export type ExternalAnalystSource = "HALILUYA" | "BTCTW0" | "BTCKIK";
export type ExternalAnalystRole = "PANIC_REVERSAL" | "GANN_SWING" | "ALTCOIN_ROTATION";

export type ExternalAnalystParsedPost = {
  source: ExternalAnalystSource;
  role: ExternalAnalystRole;
  username: string;
  postId: string;
  postUrl: string;
  postedAt: string;
  text: string;
  symbols: string[];
  direction: ThreeHorizonDirection;
  horizon: ThreeHorizonStrategyType;
  supportLevels: number[];
  resistanceLevels: number[];
  targetLevels: number[];
  invalidationLevels: number[];
  keyLevels: number[];
  timeWindows: string[];
  confidence: number;
  summary: string;
};

export type ExternalAnalystOverlay = {
  symbol: string;
  strategyType: ThreeHorizonStrategyType;
  direction: ThreeHorizonDirection;
  confidence: number;
  supportLevels: number[];
  resistanceLevels: number[];
  targetLevels: number[];
  invalidationLevels: number[];
  timeWindows: string[];
  sourceLabels: string[];
  sourceUrls: string[];
  summaries: string[];
  newestPostedAt: string;
};

export type ExternalAnalystRefreshReport = {
  enabled: boolean;
  configured: boolean;
  skipped: boolean;
  source: "X_API" | "JSON_FEED" | "NONE";
  fetchedPosts: number;
  storedPosts: number;
  parsedSignals: number;
  checkedAt: string;
  message: string;
  errors: string[];
};
