import "server-only";

import type { CommitteeInput } from "@/lib/ai-committee/types";
import { getXIntelligenceSnapshot } from "@/lib/trading-signals/x-intelligence-summary";
import {
  buildXIntelligenceAutoWeight,
  findXIntelligenceSummaryForMarket,
  xIntelligenceCommitteeMemo,
} from "@/lib/trading-signals/x-intelligence-overlay";

export async function enrichCommitteeInputWithXIntelligence(input: CommitteeInput): Promise<CommitteeInput> {
  const symbol = (input.symbol || input.asset).trim();
  if (!symbol) return input;
  const snapshot = await getXIntelligenceSnapshot().catch(() => null);
  const summary = findXIntelligenceSummaryForMarket(snapshot?.aggregate.summaries ?? [], symbol);
  const memo = xIntelligenceCommitteeMemo(buildXIntelligenceAutoWeight(summary));
  if (!memo) return input;
  const sourceNotes = [input.sourceNotes, memo].filter(Boolean).join("\n").slice(0, 12000);
  return { ...input, sourceNotes };
}
