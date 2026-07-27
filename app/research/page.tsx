import type { Metadata } from "next";
import { ResearchIntelligenceClient } from "@/components/research/ResearchIntelligenceClient";
import { AltcoinRotationMonitorSection, VerificationSection } from "@/components/sections";
import { listAnalystFrameworks, listDailyIntelligenceReports } from "@/lib/data/research-intelligence";
import { getSnapshotMetadata } from "@/lib/data/intelligence-snapshot";
import { listTechnicalSignals } from "@/lib/data/load-technical-signals";
import { listResearchRecords } from "@/lib/data/research-records";

export const metadata: Metadata = {
  title: "研究情报",
  description: "MoonX 如何汇总外部市场信号，并通过内部分析框架调和为结构化综合观点。",
};

export default async function ResearchIntelligencePage() {
  const [frameworks, reports, snapshot, technicalSignals, records] = await Promise.all([
    listAnalystFrameworks(),
    listDailyIntelligenceReports(),
    getSnapshotMetadata(),
    listTechnicalSignals(),
    listResearchRecords(),
  ]);
  const stagedRecords = records.filter((record) => (record.verificationStages?.length ?? 0) > 0);

  return (
    <>
      <ResearchIntelligenceClient
        frameworks={frameworks}
        reports={reports}
        snapshot={snapshot}
        technicalSignalCount={technicalSignals.length}
      />
      <AltcoinRotationMonitorSection />
      <VerificationSection stagedRecords={stagedRecords} />
    </>
  );
}
