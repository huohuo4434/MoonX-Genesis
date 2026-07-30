/**
 * Unified Timeline accessor — events come from content/moonx/latest.json.
 */
import "server-only";

import { loadMoonXResearchAsync } from "@/lib/moonx/load-research";
import { toTimelineEvents } from "@/lib/moonx/adapters";
import type { TimelineEvent } from "@/types/research";

export async function listTimelineEvents(): Promise<TimelineEvent[]> {
  const doc = await loadMoonXResearchAsync();
  return toTimelineEvents(doc);
}
