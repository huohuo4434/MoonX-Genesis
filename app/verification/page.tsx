import type { Metadata } from "next";
import { PageHeaderIntl } from "@/components/layout/PageHeaderIntl";
import { ResearchConflictPanel } from "@/components/research/ResearchConflictPanel";
import { VerificationSection } from "@/components/sections";
import { getResearchConflictForAsset } from "@/lib/data/research-conflicts";
import { listResearchRecords } from "@/lib/data/research-records";
import { Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "预测验证 | MoonX",
  description: "MoonX 预测从发布到结果验证的完整追踪记录。",
};

export default async function VerificationPage() {
  const [records, sseConflict] = await Promise.all([
    listResearchRecords(),
    Promise.resolve(getResearchConflictForAsset("shanghai-composite")),
  ]);
  const stagedRecords = records.filter((record) => (record.verificationStages?.length ?? 0) > 0);

  return (
    <main>
      <PageHeaderIntl
        titleKey="verification.title"
        subtitleKey="verification.subtitle"
        badgeKey="nav.verification"
      />
      {sseConflict && (
        <Section spacing="md" className="border-b border-border/[0.06]">
          <ResearchConflictPanel conflict={sseConflict} />
        </Section>
      )}
      <VerificationSection stagedRecords={stagedRecords} />
    </main>
  );
}
