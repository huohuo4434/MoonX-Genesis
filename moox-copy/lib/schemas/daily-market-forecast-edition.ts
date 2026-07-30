import { z } from "zod";

const localizedTextSchema = z.object({
  zhCN: z.string().min(1),
  zhTW: z.string().min(1),
  en: z.string().min(1),
});

const assetIds = ["bitcoin", "sp500", "nasdaq100", "gold"] as const;
const directions = ["上涨", "下跌", "震荡"] as const;
const paths = [
  "单边上涨",
  "单边下跌",
  "震荡",
  "震荡上涨",
  "震荡下跌",
  "先涨后跌",
  "先跌后涨",
  "冲高回落",
  "探底回升",
] as const;
const verificationResults = ["hit", "partial", "miss", "invalidated", "pending"] as const;

export const DailyMarketFrameworkContributionSchema = z.object({
  id: z.string().min(1),
  label: localizedTextSchema,
  weight: z.number().finite().min(0).max(100),
  note: localizedTextSchema.optional(),
});

export const DailyMarketVerificationDimensionSchema = z.object({
  result: z.enum(verificationResults),
  note: localizedTextSchema.optional(),
});

export const DailyMarketForecastVerificationSchema = z.object({
  direction: DailyMarketVerificationDimensionSchema,
  intradayPath: DailyMarketVerificationDimensionSchema,
  levels: DailyMarketVerificationDimensionSchema,
  invalidation: DailyMarketVerificationDimensionSchema,
  timeWindow: DailyMarketVerificationDimensionSchema,
  updates: z
    .array(
      z.object({
        recordedAt: z.string().datetime(),
        note: localizedTextSchema,
        direction: DailyMarketVerificationDimensionSchema.optional(),
        intradayPath: DailyMarketVerificationDimensionSchema.optional(),
        levels: DailyMarketVerificationDimensionSchema.optional(),
        invalidation: DailyMarketVerificationDimensionSchema.optional(),
        timeWindow: DailyMarketVerificationDimensionSchema.optional(),
      })
    )
    .optional(),
});

export const DailyMarketForecastEntrySchema = z.object({
  assetId: z.enum(assetIds),
  symbol: z.string().min(1),
  assetName: localizedTextSchema,
  marketLabel: localizedTextSchema,
  mainDirection: z.enum(directions),
  intradayPath: z.enum(paths),
  initialMainDirection: z.enum(directions),
  initialIntradayPath: z.enum(paths),
  summary: localizedTextSchema,
  frameworkDisclaimer: localizedTextSchema,
  memberEvidenceNote: localizedTextSchema.optional(),
  confidence: z.number().int().min(0).max(100),
  supportLevels: z.array(z.string().min(1)).default([]),
  resistanceLevels: z.array(z.string().min(1)).default([]),
  confirmation: localizedTextSchema.optional(),
  invalidation: localizedTextSchema.optional(),
  conditions: z.array(localizedTextSchema).default([]),
  linkedSignalIds: z.array(z.string().min(1)).default([]),
  evidenceRecordIds: z.array(z.string().min(1)).default([]),
  frameworkContributions: z.array(DailyMarketFrameworkContributionSchema).default([]),
  verification: DailyMarketForecastVerificationSchema,
});

export const DailyMarketForecastEditionSchema = z
  .object({
    id: z.string().min(1),
    forecastDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    memberAvailableAt: z.string().datetime(),
    publicAvailableAt: z.string().datetime(),
    publishedAt: z.string().datetime(),
    version: z.number().int().min(1),
    overallSummary: localizedTextSchema,
    status: z.literal("published"),
    entries: z.array(DailyMarketForecastEntrySchema).length(4),
  })
  .superRefine((edition, ctx) => {
    const ids = edition.entries.map((entry) => entry.assetId);
    for (const id of assetIds) {
      if (!ids.includes(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `entries must contain assetId ${id}`,
          path: ["entries"],
        });
      }
    }
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "entries must contain unique assetIds",
        path: ["entries"],
      });
    }
    if (new Date(edition.memberAvailableAt).getTime() > new Date(edition.publicAvailableAt).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "memberAvailableAt must be earlier than or equal to publicAvailableAt",
        path: ["memberAvailableAt"],
      });
    }
    for (const [index, entry] of edition.entries.entries()) {
      if (entry.mainDirection !== entry.initialMainDirection) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "mainDirection must preserve initialMainDirection in the base edition payload",
          path: ["entries", index, "mainDirection"],
        });
      }
      if (entry.intradayPath !== entry.initialIntradayPath) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "intradayPath must preserve initialIntradayPath in the base edition payload",
          path: ["entries", index, "intradayPath"],
        });
      }
    }
  });

export const DailyMarketForecastEditionDocumentSchema = z.array(DailyMarketForecastEditionSchema);

export type DailyMarketForecastEditionInput = z.infer<typeof DailyMarketForecastEditionSchema>;
