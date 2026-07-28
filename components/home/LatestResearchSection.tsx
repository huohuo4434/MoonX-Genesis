import { LatestResearchClient } from "@/components/home/LatestResearchClient";
import { listPublicResearchRecordsFromStore } from "@/lib/data/public-research";

export async function LatestResearchSection() {
  const records = await listPublicResearchRecordsFromStore();
  const latest = [...records]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 3);

  return (
    <section id="latest-research" className="border-t border-border/[0.06] py-12 lg:py-16">
      <LatestResearchClient records={latest} />
    </section>
  );
}
