/**
 * Typed views of validated MoonX research content.
 * Runtime validation lives in `schema.ts`; this file is the TypeScript surface
 * consumed by loaders, adapters, and UI-facing data accessors.
 */
import type { z } from "zod";
import type {
  MoonXAssetSchema,
  MoonXDocumentSchema,
  MoonXFrameworkFactorSchema,
  MoonXLocalizedTextSchema,
  MoonXProcessedAssetSchema,
  MoonXProcessedDocumentSchema,
  MoonXScenarioWeightsSchema,
  MoonXTimelineEventSchema,
  MoonXWatchlistSettingsSchema,
  MoonXMarketThemeSchema,
  MoonXWeeklyDivergenceCandidateSchema,
  MoonXRotationPhaseSchema,
  MoonXSourceLevelSchema,
} from "./schema";

export type MoonXLocalizedText = z.infer<typeof MoonXLocalizedTextSchema>;
export type MoonXScenarioWeights = z.infer<typeof MoonXScenarioWeightsSchema>;
export type MoonXFrameworkFactor = z.infer<typeof MoonXFrameworkFactorSchema>;
export type MoonXWatchlistSettings = z.infer<typeof MoonXWatchlistSettingsSchema>;
export type MoonXSourceLevel = z.infer<typeof MoonXSourceLevelSchema>;
export type MoonXTimelineEvent = z.infer<typeof MoonXTimelineEventSchema>;
export type MoonXAsset = z.infer<typeof MoonXAssetSchema>;
export type MoonXDocument = z.infer<typeof MoonXDocumentSchema>;
export type MoonXMarketTheme = z.infer<typeof MoonXMarketThemeSchema>;
export type MoonXWeeklyDivergenceCandidate = z.infer<typeof MoonXWeeklyDivergenceCandidateSchema>;
export type MoonXRotationPhase = z.infer<typeof MoonXRotationPhaseSchema>;
export type MoonXProcessedAsset = z.infer<typeof MoonXProcessedAssetSchema>;
export type MoonXProcessedDocument = z.infer<typeof MoonXProcessedDocumentSchema>;
export type MoonXProcessedMarketTheme = MoonXProcessedDocument["marketThemes"][number];

export type MoonXDirection =
  | "strong-bullish"
  | "bullish"
  | "slightly-bullish"
  | "neutral"
  | "slightly-bearish"
  | "bearish"
  | "strong-bearish"
  | "watch";

export type MoonXRatingLabel =
  | "Strong Bullish"
  | "Bullish"
  | "Neutral"
  | "Bearish"
  | "Strong Bearish"
  | "Watch"
  | "New Listing Bullish Watch";

export type MoonXConfirmationStatus = "Waiting" | "Partially Confirmed" | "Confirmed" | "Failed";

export type MoonXListingStatus = "preIPO" | "listed" | "n/a";

export type MoonXVerificationStatus =
  | "pending"
  | "draft-pending-verification"
  | "partially-verified"
  | "verified"
  | "invalidated"
  | "archived";

export interface MoonXLoadError {
  code: "INVALID_JSON" | "VALIDATION_FAILED" | "READ_FAILED";
  message: string;
  issues?: string[];
}
