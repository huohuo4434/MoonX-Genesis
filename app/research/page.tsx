import type { Metadata } from "next";
import { ResearchIntelligenceClient } from "@/components/research/ResearchIntelligenceClient";
import { AltcoinRotationMonitorSection } from "@/components/sections";
import { listAnalystFrameworks, listDailyIntelligenceReports } from "@/lib/data/research-intelligence";
import { getSnapshotMetadata } from "@/lib/data/intelligence-snapshot";
import { listTechnicalSignals } from "@/lib/data/load-technical-signals";

export const metadata: Metadata = {
  title: "Research Intelligence",
  description:
    "How MoonX aggregates external market signal and reconciles it through internal analysis frameworks into a single, structured consensus.",
};

export default async function ResearchIntelligencePage() {
  const [frameworks, reports, snapshot, technicalSignals] = await Promise.all([
    listAnalystFrameworks(),
    listDailyIntelligenceReports(),
    getSnapshotMetadata(),
    listTechnicalSignals(),
  ]);
  return (
    <>
      <ResearchIntelligenceClient frameworks={frameworks} reports={reports} snapshot={snapshot} technicalSignalCount={technicalSignals.length} />
      <AltcoinRotationMonitorSection />
    </>
  );
}
