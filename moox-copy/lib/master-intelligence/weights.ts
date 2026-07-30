import type { KnowledgeWeightTier } from "@/lib/master-intelligence/types";
import { KNOWLEDGE_WEIGHT_STARS } from "@/lib/master-intelligence/types";

/** Stars display helper for admin / evidence. */
export function starsLabel(n: number): string {
  const filled = Math.max(0, Math.min(5, Math.round(n)));
  return `${"★".repeat(filled)}${"☆".repeat(5 - filled)}`;
}

export function weightStarsForTier(tier: KnowledgeWeightTier): number {
  return KNOWLEDGE_WEIGHT_STARS[tier];
}

/** Sort key: higher teacher weight first. */
export function compareByKnowledgeWeight(aStars: number, bStars: number): number {
  return bStars - aStars;
}

/** Evidence module ordering preference for Teacher Intelligence. */
export const TEACHER_INTELLIGENCE_ORDER = [
  "teacher_rule",
  "teacher_case",
  "knowledge_graph",
  "ai_quant",
  "wave",
  "technical",
  "macro",
] as const;
