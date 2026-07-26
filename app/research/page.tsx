import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { DailyIntelligenceReport, FrameworkDatabaseTable } from "@/components/research";
import { Badge, Button, Card, Heading, Section, Text } from "@/components/ui";
import { listAnalystFrameworks, listDailyIntelligenceReports } from "@/lib/data/research-intelligence";
import { getSnapshotMetadata } from "@/lib/data/intelligence-snapshot";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Research Intelligence",
  description:
    "How MoonX aggregates external market signal and reconciles it through internal analysis frameworks into a single, structured consensus.",
};

export default async function ResearchIntelligencePage() {
  const [frameworks, reports, snapshot] = await Promise.all([
    listAnalystFrameworks(),
    listDailyIntelligenceReports(),
    getSnapshotMetadata(),
  ]);
  const featuredReport = reports[0];

  return (
    <main>
      <Section spacing="lg">
        <div className="flex flex-col gap-4">
          <Badge variant="neutral" className="self-start">
            Research Intelligence
          </Badge>
          <Heading as="h1" size="display" className="max-w-3xl text-h1 lg:text-display">
            How MoonX turns external signal into structured research
          </Heading>
          <Text variant="body" color="secondary" className="max-w-2xl">
            MoonX aggregates a broad range of external market commentary and price signal,
            classifies it, and reconciles it through internal analysis frameworks — never a single
            source or named individual.
          </Text>
          <Button asChild variant="outline" size="md" className="mt-2 self-start">
            <Link href="/research/pipeline">
              View the research pipeline
              <ArrowRightIcon size={14} />
            </Link>
          </Button>
        </div>
      </Section>

      <Section spacing="lg" className="border-t border-border/[0.06]">
        <Card padding="lg" className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="warning">{snapshot.statusLabel}</Badge>
              <Badge variant="outline">Curated data — not live</Badge>
            </div>
            <Text variant="body" weight="semibold" className="text-foreground">
              MoonX Intelligence Snapshot — {formatDate(snapshot.snapshotDate)}
            </Text>
            <Text variant="body-sm" color="secondary" className="max-w-xl">
              The first curated snapshot: five assets, seven internal frameworks, and a cross-asset
              consensus view.
            </Text>
          </div>
          <Button asChild variant="primary" size="md" className="shrink-0">
            <Link href="/research/intelligence-snapshot">
              View Full Snapshot
              <ArrowRightIcon size={14} />
            </Link>
          </Button>
        </Card>
      </Section>

      <Section spacing="lg" className="border-t border-border/[0.06]">
        <div className="mb-8 flex flex-col gap-3">
          <Text variant="label" color="secondary" className="uppercase tracking-wide">
            Analyst Framework Database
          </Text>
          <Heading as="h2" size="h2" className="max-w-2xl">
            Every framework MoonX weighs into a forecast
          </Heading>
          <Text variant="body" color="secondary" className="max-w-2xl">
            Reliability and weight are recalculated as MoonX&rsquo;s internal track record grows.
            All frameworks are internal to MoonX — external analysts are never named.
          </Text>
        </div>
        <FrameworkDatabaseTable frameworks={frameworks} />
      </Section>

      {featuredReport && (
        <Section spacing="lg" className="border-t border-border/[0.06]">
          <div className="mb-8 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Text variant="label" color="secondary" className="uppercase tracking-wide">
                Daily Intelligence Report
              </Text>
              <Badge variant="neutral">Demo Report</Badge>
            </div>
            <Heading as="h2" size="h2" className="max-w-2xl">
              A structured daily snapshot, once frameworks reach consensus
            </Heading>
          </div>
          <DailyIntelligenceReport report={featuredReport} />
        </Section>
      )}
    </main>
  );
}
