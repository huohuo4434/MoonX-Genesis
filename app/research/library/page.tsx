import type { Metadata } from "next";
import { ResearchConflictPanel, ResearchLibraryExplorer, ResearchLibraryGroups } from "@/components/research";
import { PageHeaderIntl } from "@/components/layout";
import { Section } from "@/components/ui";
import { getResearchConflictForAsset } from "@/lib/data/research-conflicts";
import { redactResearchRecordsForPublic } from "@/lib/data/research-access";
import { listResearchCollections, listResearchRecords } from "@/lib/data/research-records";

export const metadata: Metadata = {
  title: "研究库 | MoonX",
  description: "MoonX 完整研究记录库，涵盖内部框架、私人研究与公开分析师观点。",
};

export default async function ResearchLibraryPage() {
  const [rawRecords, collections, sseConflict] = await Promise.all([
    listResearchRecords(),
    listResearchCollections(),
    Promise.resolve(getResearchConflictForAsset("shanghai-composite")),
  ]);
  const records = redactResearchRecordsForPublic(rawRecords);

  return (
    <main>
      <Section spacing="lg">
        <PageHeaderIntl titleKey="researchLibrary.title" subtitleKey="researchLibrary.subtitle" badgeKey="nav.researchLibrary" />
        {sseConflict && (
          <div className="mt-6">
            <ResearchConflictPanel conflict={sseConflict} />
          </div>
        )}
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
