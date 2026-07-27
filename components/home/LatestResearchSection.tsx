import { LatestResearchClient } from "@/components/home/LatestResearchClient";
import { listResearchRecords } from "@/lib/data/research-records";

export async function LatestResearchSection() {
  const records = await listResearchRecords();
  const latest = [...records]
    .filter((record) => record.editorialConfidence > 0 || record.sourceType !== "public-analyst")
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 3);

  return (
    <section id="latest-research" className="border-t border-border/[0.06] py-12 lg:py-16">
      <LatestResearchClient records={latest} />
    </section>
  );
}
