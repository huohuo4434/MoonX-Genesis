/**
 * Strategic Watchlist accessor — sourced from MoonX assets that have
 * `strategicWatchlistSettings.enabled === true` in content/moonx/latest.json.
 */
import "server-only";

import { loadMoonXResearchAsync } from "@/lib/moonx/load-research";
import { toWatchlistEntry } from "@/lib/moonx/adapters";
import type { WatchlistEntry } from "@/types/research";

export async function listWatchlistEntries(): Promise<WatchlistEntry[]> {
  const doc = await loadMoonXResearchAsync();
  return doc.assets
    .map((asset) => toWatchlistEntry(asset))
    .filter((entry): entry is WatchlistEntry => entry !== undefined);
}

export async function getWatchlistEntry(id: string): Promise<WatchlistEntry | undefined> {
  const entries = await listWatchlistEntries();
  return entries.find((entry) => entry.id === id);
}
