import type { Metadata } from "next";
import { PageHeaderIntl } from "@/components/layout";
import { TechnicalSignalCenter } from "@/components/research/TechnicalSignalCenter";
import { Section } from "@/components/ui";
import { aggregateTechnicalSignals, calculateTechnicalVerificationStats } from "@/lib/analysis/technical-signals";
import { listTechnicalSignals } from "@/lib/data/load-technical-signals";
import { getAccessLevel } from "@/lib/access/member-preview";

export const metadata: Metadata = {
  title: "Technical Signal Center",
  description: "MoonX manually curated technical signals, confirmation conditions, invalidation conditions, and verification records.",
};

export default async function TechnicalSignalPage() {
  const [allSignals, accessLevel] = await Promise.all([listTechnicalSignals(), getAccessLevel()]);
  const signals = accessLevel === "member" ? allSignals : allSignals.slice(0, 3);
  const assetIds = [...new Set(signals.map((signal) => signal.assetId))];
  const conflictCount = assetIds.filter((assetId) => aggregateTechnicalSignals(signals.filter((signal) => signal.assetId === assetId)).conflictLevel !== "none").length;

  return (
    <main>
      <Section spacing="lg">
        <PageHeaderIntl titleKey="technical.title" subtitleKey="technical.subtitle" badgeKey="nav.research" />
      </Section>
      <Section spacing="lg" className="border-t border-border/[0.06]">
        <TechnicalSignalCenter signals={signals} stats={calculateTechnicalVerificationStats(signals)} conflictCount={conflictCount} totalSignalCount={allSignals.length} isMember={accessLevel === "member"} />
      </Section>
    </main>
  );
}
