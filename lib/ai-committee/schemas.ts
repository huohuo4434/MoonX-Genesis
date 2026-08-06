import { z } from "zod";
import {
  COMMITTEE_BUILDER_ROLE_IDS,
  COMMITTEE_EVIDENCE_LABELS,
} from "@/lib/ai-committee/types";

export const committeeInputSchema = z.object({
  asset: z.string().trim().min(1).max(120),
  symbol: z.string().trim().max(40).optional().default(""),
  horizon: z.string().trim().min(1).max(80),
  asOf: z.string().trim().min(1).max(80),
  marketContext: z.string().trim().max(12000).default(""),
  technicalEvidence: z.string().trim().max(12000).default(""),
  liuyaoQimenEvidence: z.string().trim().max(12000).default(""),
  macroEvidence: z.string().trim().max(12000).default(""),
  existingView: z.string().trim().max(12000).default(""),
  riskConstraints: z.string().trim().max(6000).default(""),
  sourceNotes: z.string().trim().max(12000).default(""),
});

export const roleOpinionSchema = z.object({
  roleId: z.enum(COMMITTEE_BUILDER_ROLE_IDS),
  roleName: z.string().min(1).max(80),
  stance: z.enum(["BULLISH", "BEARISH", "NEUTRAL", "MIXED"]),
  confidence: z.number().min(0).max(100),
  thesis: z.string().min(1).max(2500),
  evidenceRefs: z.array(z.enum(COMMITTEE_EVIDENCE_LABELS)).min(1).max(7),
  supportingPoints: z.array(z.string().min(1).max(800)).min(1).max(8),
  risks: z.array(z.string().min(1).max(800)).min(1).max(8),
  invalidation: z.string().min(1).max(1600),
  proposedAction: z.string().min(1).max(1600),
  dataGaps: z.array(z.string().min(1).max(600)).max(8),
});

export const builderResponseSchema = z.object({
  opinions: z.array(roleOpinionSchema).length(COMMITTEE_BUILDER_ROLE_IDS.length),
});

export const reviewSchema = z.object({
  roleId: z.literal("REVIEWER"),
  verdict: z.enum(["BULLISH", "BEARISH", "NEUTRAL", "MIXED"]),
  confidence: z.number().min(0).max(100),
  consensus: z.string().min(1).max(2500),
  disagreements: z.array(z.string().min(1).max(1000)).min(1).max(10),
  finalView: z.string().min(1).max(3500),
  timeWindow: z.string().min(1).max(1400),
  invalidation: z.string().min(1).max(1800),
  riskPlan: z.string().min(1).max(2200),
  publishDecision: z.enum(["APPROVED", "NEEDS_REVIEW", "REJECTED"]),
  publishReason: z.string().min(1).max(1800),
  unsupportedClaims: z.array(z.string().min(1).max(1000)).max(10),
  nextChecks: z.array(z.string().min(1).max(1000)).min(1).max(10),
});

export const reviewerResponseSchema = z.object({ review: reviewSchema });

export const committeeRequestSchema = z.object({
  action: z.enum(["run", "preview"]).default("run"),
  input: committeeInputSchema,
});
