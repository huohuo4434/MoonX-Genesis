/**
 * Zod runtime schema for `content/moonx/latest.json` and history snapshots.
 * Keep this as the single shape contract — adapters and UI never invent fields.
 */
import { z } from "zod";

export const MoonXLocalizedTextSchema = z.object({
  zhCN: z.string().min(1),
  zhTW: z.string().min(1),
  en: z.string().min(1),
});

export const MoonXScenarioWeightsSchema = z.object({
  base: z.number().min(0).max(100),
  bull: z.number().min(0).max(100),
  bear: z.number().min(0).max(100),
});

export const MoonXPriceLevelSchema = z.object({
  id: z.string().min(1),
  price: z.number().finite(),
  kind: z.enum(["support", "major-support", "resistance", "major-resistance", "target", "invalidation"]),
  label: MoonXLocalizedTextSchema,
});

export const MoonXZoneSchema = z.object({
  id: z.string().min(1),
  from: z.number().finite(),
  to: z.number().finite(),
  kind: z.enum(["consolidation", "support", "resistance", "peak"]),
  label: MoonXLocalizedTextSchema,
});

export const MoonXTurningWindowSchema = z.object({
  id: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  label: MoonXLocalizedTextSchema,
  note: MoonXLocalizedTextSchema.optional(),
});

export const MoonXWaypointSchema = z.object({
  progress: z.number().min(0).max(1),
  price: z.number().finite(),
  majorTurningPoint: z.boolean().optional(),
  label: z.string().optional(),
});

export const MoonXScenarioPathSchema = z.object({
  summary: MoonXLocalizedTextSchema,
  logic: MoonXLocalizedTextSchema,
  volatility: z.number().positive(),
  waypoints: z.array(MoonXWaypointSchema).min(2),
});

export const MoonXChartScenarioSchema = z.object({
  chartTitle: MoonXLocalizedTextSchema,
  forecastWindow: z.object({ start: z.string().min(1), end: z.string().min(1) }),
  referencePrice: z.number().finite(),
  pricePrecision: z.number().int().min(0).max(8).optional(),
  historicalCandleCount: z.number().int().positive(),
  forecastCandleCount: z.number().int().positive(),
  seed: z.number().int(),
  historicalWaypoints: z.array(MoonXWaypointSchema).min(2),
  historicalVolatility: z.number().positive(),
  levels: z.array(MoonXPriceLevelSchema),
  zones: z.array(MoonXZoneSchema),
  turningWindows: z.array(MoonXTurningWindowSchema),
  scenarios: z.object({
    base: MoonXScenarioPathSchema,
    bull: MoonXScenarioPathSchema,
    bear: MoonXScenarioPathSchema,
  }),
});

export const MoonXFrameworkFactorSchema = z.object({
  id: z.string().min(1),
  framework: z.string().min(1),
  /** -100 … 100 */
  directionScore: z.number().min(-100).max(100),
  /** 0 … 100 */
  weight: z.number().min(0).max(100),
  /** 0 … 100 */
  confidence: z.number().min(0).max(100),
  explanation: MoonXLocalizedTextSchema,
  status: z.enum(["Waiting", "Partially Confirmed", "Confirmed", "Failed", "Active"]),
  confirmationConditions: z.array(MoonXLocalizedTextSchema).optional(),
});

export const MoonXWatchlistSettingsSchema = z.object({
  enabled: z.boolean(),
  rating: z.enum(["watch", "bullish", "neutral", "bearish", "strong-bullish", "strong-bearish"]),
  ratingLabel: MoonXLocalizedTextSchema.optional(),
  status: z.enum(["pre-ipo-watch", "ipo-strategic-watch", "active", "high-volatility-watch", "watch"]),
  horizon: MoonXLocalizedTextSchema,
  mainThemes: z.array(MoonXLocalizedTextSchema).default([]),
  thesis: MoonXLocalizedTextSchema,
  risks: z.array(MoonXLocalizedTextSchema).default([]),
  nextEvent: MoonXLocalizedTextSchema.optional(),
  nextEventDate: z.string().nullable().optional(),
  listingStatus: z.enum(["preIPO", "listed", "n/a"]).default("n/a"),
  listingDate: z.string().nullable().optional(),
  ipoPrice: z.number().nullable().optional(),
  priceCurrency: z.string().nullable().optional(),
  totalShares: z.number().nullable().optional(),
  impliedMarketCap: z.number().nullable().optional(),
  valuationStatus: z.string().nullable().optional(),
  valuationComment: MoonXLocalizedTextSchema.optional(),
  trackMetrics: z.array(z.string()).default([]),
  warning: MoonXLocalizedTextSchema.optional(),
  /** When listingStatus flips from preIPO → listed, default rating becomes bullish. */
  activateOnListing: z.boolean().optional(),
});

export const MoonXAssetObjectSchema = z.object({
  id: z.string().min(1),
  symbol: z.string().min(1),
  category: z.enum([
    "crypto",
    "us-equity",
    "china-equity",
    "hong-kong-equity",
    "commodity",
    "index",
    "semiconductor",
  ]),
  localizedName: MoonXLocalizedTextSchema,
  localizedSummary: MoonXLocalizedTextSchema,
  shortView: MoonXLocalizedTextSchema,
  status: z.string().min(1),
  researchDate: z.string().min(1),
  lastUpdated: z.string().min(1),
  forecastHorizon: MoonXLocalizedTextSchema,
  direction: z.enum(["strong-bullish", "bullish", "neutral", "bearish", "strong-bearish", "watch"]),
  /** Optional editorial raw score before engine override (-100…100). */
  rawScore: z.number().min(-100).max(100).optional(),
  confidence: z.number().min(0).max(100),
  scenarioWeights: MoonXScenarioWeightsSchema,
  supportLevels: z.array(z.number().finite()).default([]),
  resistanceLevels: z.array(z.number().finite()).default([]),
  targetLevels: z.array(z.number().finite()).default([]),
  invalidationLevels: z.array(z.number().finite()).default([]),
  consolidationZones: z
    .array(z.object({ from: z.number().finite(), to: z.number().finite(), label: MoonXLocalizedTextSchema.optional() }))
    .default([]),
  turningWindows: z.array(MoonXTurningWindowSchema).default([]),
  frameworkFactors: z.array(MoonXFrameworkFactorSchema).default([]),
  confirmationConditions: z.array(MoonXLocalizedTextSchema).default([]),
  riskConditions: z.array(MoonXLocalizedTextSchema).default([]),
  sourceReferences: z.array(z.string()).default([]),
  verificationStatus: z.enum([
    "pending",
    "draft-pending-verification",
    "partially-verified",
    "verified",
    "invalidated",
    "archived",
  ]),
  verificationChecklist: z.array(MoonXLocalizedTextSchema).default([]),
  trendPath: z.array(MoonXLocalizedTextSchema).default([]),
  themes: z.array(MoonXLocalizedTextSchema).default([]),
  relevantFrameworks: z.array(z.string()).default([]),
  mainSupportLabel: MoonXLocalizedTextSchema.optional(),
  mainResistanceLabel: MoonXLocalizedTextSchema.optional(),
  invalidationLabel: MoonXLocalizedTextSchema.optional(),
  nextTurningWindowLabel: MoonXLocalizedTextSchema.optional(),
  chart: MoonXChartScenarioSchema.optional(),
  strategicWatchlistSettings: MoonXWatchlistSettingsSchema.optional(),
  isLongRange: z.boolean().optional(),
  tags: z.array(z.string()).default([]),
});

export const MoonXAssetSchema = MoonXAssetObjectSchema.superRefine((asset, ctx) => {
  const total = asset.scenarioWeights.base + asset.scenarioWeights.bull + asset.scenarioWeights.bear;
  if (Math.abs(total - 100) > 0.01) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `scenarioWeights for "${asset.id}" must total 100 (got ${total})`,
      path: ["scenarioWeights"],
    });
  }
  if (asset.chart) {
    const { start, end } = asset.chart.forecastWindow;
    if (new Date(end).getTime() < new Date(start).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `chart.forecastWindow end before start for "${asset.id}"`,
        path: ["chart", "forecastWindow"],
      });
    }
  }
});

export const MoonXTimelineEventSchema = z.object({
  id: z.string().min(1),
  date: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  title: MoonXLocalizedTextSchema,
  description: MoonXLocalizedTextSchema.optional(),
  categories: z.array(
    z.enum([
      "crypto",
      "us-equity",
      "china-equity",
      "hong-kong-equity",
      "semiconductor",
      "commodity",
      "oracle",
      "qimen",
      "cycle",
    ])
  ),
  verification: z.enum(["verified", "pending"]),
  isLongRange: z.boolean().optional(),
});

export const MoonXDocumentSchema = z
  .object({
    version: z.string().min(1),
    snapshotId: z.string().min(1),
    researchDate: z.string().min(1),
    lastUpdated: z.string().min(1),
    status: z.enum(["draft-pending-verification", "verified", "archived"]),
    statusLabel: MoonXLocalizedTextSchema,
    dataType: MoonXLocalizedTextSchema,
    dataSourceDisclosure: MoonXLocalizedTextSchema,
    mainConclusion: z.array(MoonXLocalizedTextSchema).min(1),
    riskDisclaimer: MoonXLocalizedTextSchema,
    assets: z.array(MoonXAssetSchema).min(1),
    timeline: z.array(MoonXTimelineEventSchema).default([]),
  })
  .superRefine((doc, ctx) => {
    const ids = new Set<string>();
    for (const asset of doc.assets) {
      if (ids.has(asset.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate asset id: ${asset.id}`,
          path: ["assets"],
        });
      }
      ids.add(asset.id);
    }
    const timelineIds = new Set<string>();
    for (const event of doc.timeline) {
      if (timelineIds.has(event.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate timeline event id: ${event.id}`,
          path: ["timeline"],
        });
      }
      timelineIds.add(event.id);
    }
  });

export const MoonXProcessedAssetSchema = MoonXAssetObjectSchema.extend({
  calculatedScore: z.number().min(-100).max(100),
  ratingLabel: z.string(),
  normalizedScenarioWeights: MoonXScenarioWeightsSchema,
  activeWatchlistRating: z.string().optional(),
  activeWatchlistRatingLabel: MoonXLocalizedTextSchema.optional(),
});

export const MoonXProcessedDocumentSchema = z.object({
  version: z.string(),
  snapshotId: z.string(),
  researchDate: z.string(),
  lastUpdated: z.string(),
  status: z.enum(["draft-pending-verification", "verified", "archived"]),
  statusLabel: MoonXLocalizedTextSchema,
  dataType: MoonXLocalizedTextSchema,
  dataSourceDisclosure: MoonXLocalizedTextSchema,
  mainConclusion: z.array(MoonXLocalizedTextSchema),
  riskDisclaimer: MoonXLocalizedTextSchema,
  assets: z.array(MoonXProcessedAssetSchema),
  timeline: z.array(MoonXTimelineEventSchema),
  meta: z.object({
    assetCount: z.number().int(),
    historySnapshotCount: z.number().int(),
    sourceFile: z.string(),
    validationStatus: z.enum(["valid", "invalid"]),
  }),
});
