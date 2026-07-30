import { Section } from "@/components/ui";
import { listResearchRecords } from "@/lib/data/research-records";
import { listWatchlistEntries } from "@/lib/data/strategic-watchlist";
import { StrategicWatchlistClient } from "./StrategicWatchlistClient";

/** Homepage "Strategic Watchlist" preview — full detail lives at `/markets/watchlist`. */
export async function StrategicWatchlistSection() {
  const [entries, records] = await Promise.all([listWatchlistEntries(), listResearchRecords()]);
  const items = entries.map((entry) => ({
    entry,
    researchCount: records.filter((record) => record.assetId === entry.researchAssetId).length,
  }));

  return (
    <Section id="watchlist" spacing="lg" className="border-t border-border/[0.06]">
      <StrategicWatchlistClient items={items} />
    </Section>
  );
}
