import type { Metadata } from "next";
import { ResearchLibraryExplorer, ResearchLibraryGroups } from "@/components/research";
import { PageHeaderIntl } from "@/components/layout";
import { Section } from "@/components/ui";
import { redactResearchRecordsForPublic } from "@/lib/data/research-access";
import { listResearchCollections, listResearchRecords } from "@/lib/data/research-records";

export const metadata: Metadata = {
  title: "Research Library",
  description: "The complete curated MoonX research record set across internal frameworks, private research, and public analyst views.",
};

export default async function ResearchLibraryPage() {
  const [rawRecords, collections] = await Promise.all([listResearchRecords(), listResearchCollections()]);
  const records = redactResearchRecordsForPublic(rawRecords);

  return (
    <main>
      <Section spacing="lg">
        <PageHeaderIntl titleKey="researchLibrary.title" subtitleKey="researchLibrary.subtitle" badgeKey="nav.researchLibrary" />
      </Section>

      <Section spacing="lg" className="border-t border-border/[0.06]">
        <ResearchLibraryGroups collections={collections} records={records} />
        <div id="research-library-filters">
          <ResearchLibraryExplorer records={records} />
        </div>
      </Section>
    </main>
  );
}
