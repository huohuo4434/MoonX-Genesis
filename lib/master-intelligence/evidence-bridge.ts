/**
 * Optional helper for forecast pipelines: attach Teacher Intelligence citations.
 * Never includes lesson raw transcripts.
 */
import "server-only";

import { runTeacherReasoning } from "@/lib/master-intelligence/reasoning";
import type { ForecastEvidenceSource } from "@/lib/methodology/evidence";

export async function attachTeacherIntelligence(
  source: ForecastEvidenceSource,
  query?: string
): Promise<ForecastEvidenceSource> {
  const q =
    query ||
    [source.directionLabel, source.summary, source.headline, ...(source.expectedPath ?? [])]
      .filter(Boolean)
      .join(" ");
  if (!q.trim()) return source;
  try {
    const result = await runTeacherReasoning({
      query: q,
      assetId: source.symbol?.toLowerCase() ?? null,
    });
    return {
      ...source,
      teacherCitations: result.citations.map((c) => ({
        type: c.type,
        ref: c.ref,
        title: c.title,
        weightStars: c.weightStars,
      })),
      engineType: source.engineType ?? "MASTER_ICHING",
      adoptedSource: source.adoptedSource ?? "MASTER",
    };
  } catch {
    return source;
  }
}
