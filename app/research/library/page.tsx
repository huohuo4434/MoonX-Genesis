import type { Metadata } from "next";
import { ResearchLibraryExplorer } from "@/components/research";
import { PageHeaderIntl } from "@/components/layout";
import { Section } from "@/components/ui";
import { listResearchRecords } from "@/lib/data/research-records";

export const metadata: Metadata = {
  title: "Research Library",
  description: "The complete curated MoonX research record set across internal frameworks, private research, and public analyst views.",
};

export default async function ResearchLibraryPage() {
  const records = await listResearchRecords();

  return (
    <main>
      <Section spacing="lg">
        <PageHeaderIntl titleKey="researchLibrary.title" subtitleKey="researchLibrary.subtitle" badgeKey="nav.researchLibrary" />
      </Section>

      <Section spacing="lg" className="border-t border-border/[0.06]">
        <ResearchLibraryExplorer records={records} />
      </Section>
    </main>
  );
}
