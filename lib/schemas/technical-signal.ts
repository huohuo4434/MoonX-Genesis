import { z } from "zod";
import {
  TECHNICAL_HORIZONS,
  TECHNICAL_OUTCOMES,
  TECHNICAL_SIGNAL_STATUSES,
  TECHNICAL_SIGNAL_TYPES,
  TECHNICAL_TIMEFRAMES,
} from "@/types/technical-signal";

const localizedTextSchema = z.object({
  zhCN: z.string().min(1),
  zhTW: z.string().min(1),
  en: z.string().min(1),
});

const isoDateSchema = z.string().datetime({ offset: true });
const scoreSchema = z.number().finite().min(0).max(100);

export const TechnicalSignalStatusHistorySchema = z.object({
  status: z.enum(TECHNICAL_SIGNAL_STATUSES),
  changedAt: isoDateSchema,
  note: localizedTextSchema,
});

export const TechnicalSignalOutcomeSchema = z.object({
  verifiedAt: isoDateSchema.optional(),
  result: z.enum(TECHNICAL_OUTCOMES),
  maxFavorableMovePercent: z.number().finite().optional(),
  maxAdverseMovePercent: z.number().finite().optional(),
  daysToResult: z.number().int().nonnegative().optional(),
  notes: localizedTextSchema.optional(),
});

export const TechnicalSignalSchema = z
  .object({
    id: z.string().min(1),
    assetId: z.string().min(1),
    symbol: z.string().min(1),
    signalType: z.enum(TECHNICAL_SIGNAL_TYPES),
    direction: z.enum(["bullish", "bearish", "neutral"]),
    timeframe: z.enum(TECHNICAL_TIMEFRAMES),
    horizon: z.enum(TECHNICAL_HORIZONS),
    detectedAt: isoDateSchema,
    observationStart: isoDateSchema.optional(),
    confirmationDeadline: isoDateSchema.optional(),
    verificationDate: isoDateSchema.optional(),
    status: z.enum(TECHNICAL_SIGNAL_STATUSES),
    originalStatus: z.enum(TECHNICAL_SIGNAL_STATUSES),
    statusHistory: z.array(TechnicalSignalStatusHistorySchema).min(1),
    title: localizedTextSchema,
    summary: localizedTextSchema,
    evidence: z.array(localizedTextSchema).default([]),
    priceStructure: localizedTextSchema.optional(),
    indicatorStructure: localizedTextSchema.optional(),
    indicatorType: z.enum(["macd", "rsi", "unspecified"]).optional(),
    assetCategory: z.enum(["major", "high_volatility", "defi", "infrastructure", "layer_1_layer_2", "meme"]).optional(),
    supportLevels: z.array(z.number().finite()).optional(),
    resistanceLevels: z.array(z.number().finite()).optional(),
    targetLevels: z.array(z.number().finite()).optional(),
    confirmationConditions: z.array(localizedTextSchema).min(1),
    invalidationConditions: z.array(localizedTextSchema).min(1),
    riskNotes: z.array(localizedTextSchema).optional(),
    framework: z.literal("technical_structure"),
    sourceType: z.literal("manual_research"),
    sourceLabel: localizedTextSchema.optional(),
    sourceRecordIds: z.array(z.string().min(1)).optional(),
    evidenceScore: scoreSchema.optional(),
    strengthInput: z.object({
      clarity: z.number().finite().min(0).max(25),
      priceConfirmation: z.number().finite().min(0).max(20),
      indicatorConfluence: z.number().finite().min(0).max(15),
      timeframeConfluence: z.number().finite().min(0).max(10),
      riskCompleteness: z.number().finite().min(0).max(10),
      sameDirectionTimeframes: z.number().int().nonnegative().optional(),
    }).optional(),
    timeframeWeight: z.number().finite().min(0).max(2).optional(),
    signalStrength: scoreSchema.optional(),
    outcome: TechnicalSignalOutcomeSchema.optional(),
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
  })
  .superRefine((signal, ctx) => {
    if (new Date(signal.updatedAt).getTime() < new Date(signal.createdAt).getTime()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "updatedAt must not precede createdAt", path: ["updatedAt"] });
    }
    if (signal.outcome && !signal.verificationDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "outcome requires verificationDate", path: ["outcome"] });
    }
    if (signal.status.startsWith("verified_") && !signal.outcome) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "verified status requires outcome", path: ["status"] });
    }
  });

export const TechnicalVerificationRecordSchema = z.object({
  signalId: z.string().min(1),
  originalStatus: z.enum(TECHNICAL_SIGNAL_STATUSES),
  confirmationConditions: z.array(localizedTextSchema).min(1),
  invalidationConditions: z.array(localizedTextSchema).min(1),
  verificationDate: isoDateSchema,
  outcome: TechnicalSignalOutcomeSchema,
});

export const TechnicalSignalDocumentSchema = z.array(TechnicalSignalSchema);
export const TechnicalVerificationDocumentSchema = z.array(TechnicalVerificationRecordSchema);
