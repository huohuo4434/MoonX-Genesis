import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangleIcon, ArrowRightIcon } from "@/components/icons";
import {
  AssetIntelligenceCard,
  CrossAssetConsensusSection,
  LongRangeTimeline,
  MoonXDataStatusPanel,
} from "@/components/research";
import { ScenarioForecastExplorer } from "@/components/charts";
import { ConsensusOverviewSection } from "@/components/sections";
import { Badge, Heading, Section, Text } from "@/components/ui";
import {
  getCrossAssetConsensus,
  getRiskDisclaimer,
  getSnapshotMetadata,
  listAssetIntelligenceSnapshots,
  listNasdaqLongRangeTimeline,
} from "@/lib/data/intelligence-snapshot";
import { listForecastChartScenarios } from "@/lib/data/forecast-chart-scenarios";
import { loadMoonXResearchAsync } from "@/lib/moonx/load-research";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Intelligence Snapshot",
  description:
    "MoonX's first curated Intelligence Snapshot — a structured synthesis of Oracle signals, market cycles, technical structure and risk evidence across five assets.",
};

export default async function IntelligenceSnapshotPage() {
  const [snapshot, assets, consensus, timeline, forecastScenarios, riskDisclaimer, moonx] = await Promise.all([
    getSnapshotMetadata(),
    listAssetIntelligenceSnapshots(),
    getCrossAssetConsensus(),
    listNasdaqLongRangeTimeline(),
    listForecastChartScenarios(),
    getRiskDisclaimer(),
    loadMoonXResearchAsync(),
  ]);

  return (
    <main>
      <Section spacing="lg">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="warning">{snapshot.statusLabel}</Badge>
            <Badge variant="outline">Curated data — not live</Badge>
            <Badge variant="neutral" className="font-mono">
              Snapshot: {formatDate(snapshot.snapshotDate)}
            </Badge>
          </div>

          {process.env.NODE_ENV !== "production" && (
            <MoonXDataStatusPanel
              version={moonx.version}
              lastUpdated={moonx.lastUpdated}
              assetCount={moonx.meta.assetCount}
              historySnapshotCount={moonx.meta.historySnapshotCount}
              validationStatus={moonx.meta.validationStatus}
              sourceFile={moonx.meta.sourceFile}
            />
          )}

          <Heading as="h1" size="display" className="max-w-3xl text-h1 lg:text-display">
            MoonX Intelligence Snapshot
          </Heading>

          <Text variant="body-sm" color="tertiary" className="max-w-2xl">
            {snapshot.dataType} — {snapshot.dataSourceDisclosure}
          </Text>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/research"
              className="inline-flex items-center gap-1.5 rounded-sm text-body-sm text-foreground-secondary transition-colors hover:text-primary focus-ring"
            >
              Framework Database
              <ArrowRightIcon size={14} />
            </Link>
            <Link
              href="/research/pipeline"
              className="inline-flex items-center gap-1.5 rounded-sm text-body-sm text-foreground-secondary transition-colors hover:text-primary focus-ring"
            >
              Research Pipeline
              <ArrowRightIcon size={14} />
            </Link>
          </div>

          <div className="mt-2 flex flex-col gap-2 rounded-lg border border-border/[0.08] bg-surface/60 p-lg">
            <Text variant="label" color="secondary" className="uppercase tracking-wide">
              Main MoonX Conclusion
            </Text>
            {snapshot.mainConclusion.map((paragraph) => (
              <Text key={paragraph} variant="body-sm" color="secondary">
                {paragraph}
              </Text>
            ))}
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-danger/20 bg-danger/5 p-lg">
            <AlertTriangleIcon size={18} className="mt-0.5 shrink-0 text-danger" />
            <Text variant="body-sm" color="secondary">
              {riskDisclaimer}
            </Text>
          </div>
        </div>
      </Section>

      <Section spacing="lg" className="border-t border-border/[0.06]">
        <div className="mb-10 flex flex-col gap-3">
          <Text variant="label" color="secondary" className="uppercase tracking-wide">
            Daily Intelligence Overview
          </Text>
          <Heading as="h2" size="h2" className="max-w-2xl">
            MoonX Daily Intelligence
          </Heading>
          <Text variant="body" color="secondary" className="max-w-2xl">
            A structured synthesis of Oracle signals, market cycles, technical structure and risk
            evidence.
          </Text>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset) => (
            <AssetIntelligenceCard key={asset.id} asset={asset} verificationStatusLabel={snapshot.statusLabel} />
          ))}
        </div>
      </Section>

      <Section id="moonx-scenario-charts" spacing="lg" className="border-t border-border/[0.06]">
        <div className="mb-8 flex flex-col gap-3">
          <Text variant="label" color="secondary" className="uppercase tracking-wide">
            Scenario Forecast System
          </Text>
          <Heading as="h2" size="h2" className="max-w-2xl">
            MoonX Scenario Charts
          </Heading>
          <Text variant="body" color="secondary" className="max-w-2xl">
            Visual scenario paths derived from the current intelligence snapshot.
          </Text>
        </div>
        <ScenarioForecastExplorer scenarios={forecastScenarios} verificationStatusLabel={snapshot.statusLabel} defaultAssetId="bitcoin" />
      </Section>

      <ConsensusOverviewSection />

      <Section spacing="lg" className="border-t border-border/[0.06]">
        <CrossAssetConsensusSection consensus={consensus} />
      </Section>

      <Section spacing="lg" className="border-t border-border/[0.06]">
        <LongRangeTimeline periods={timeline} />
      </Section>

      <Section spacing="md" className="border-t border-border/[0.06]">
        <Text variant="caption" color="tertiary" className="max-w-2xl">
          {riskDisclaimer}
        </Text>
      </Section>
    </main>
  );
}
