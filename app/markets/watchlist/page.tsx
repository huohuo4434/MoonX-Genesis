import type { Metadata } from "next";
import { WatchlistCard } from "@/components/research";
import { PageHeaderIntl } from "@/components/layout";
import { Section } from "@/components/ui";
import { listResearchRecords } from "@/lib/data/research-records";
import { listWatchlistEntries } from "@/lib/data/strategic-watchlist";

export const metadata: Metadata = {
  title: "Strategic Watchlist",
  description: "Key strategic assets MoonX continuously tracks — IPO watch, cycle windows, and structural themes.",
};

export default async function WatchlistPage() {
  const [entries, records] = await Promise.all([listWatchlistEntries(), listResearchRecords()]);

  return (
    <main>
      <Section spacing="lg">
        <PageHeaderIntl titleKey="watchlist.title" subtitleKey="watchlist.subtitle" badgeKey="nav.watchlist" />
      </Section>

      <Section spacing="lg" className="border-t border-border/[0.06]">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => {
            const researchCount = records.filter((record) => record.assetId === entry.researchAssetId).length;
            return <WatchlistCard key={entry.id} entry={entry} researchCount={researchCount} />;
          })}
        </div>
      </Section>
    </main>
  );
}
