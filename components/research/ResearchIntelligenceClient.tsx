"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { DailyIntelligenceReport, FrameworkDatabaseTable } from "@/components/research";
import { Badge, Button, Card, Heading, Section, Text } from "@/components/ui";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import type { SnapshotMetadata } from "@/lib/data/intelligence-snapshot-types";
import type { AnalystFramework, DailyIntelligenceReport as DailyReport } from "@/lib/data/research-intelligence";
import { formatLocalizedDate } from "@/lib/utils";

export function ResearchIntelligenceClient({
  frameworks,
  reports,
  snapshot,
}: {
  frameworks: AnalystFramework[];
  reports: DailyReport[];
  snapshot: SnapshotMetadata;
}) {
  const t = useTranslations();
  const { locale } = useLocale();
  const featuredReport = reports[0];

  return (
    <main>
      <Section spacing="lg">
        <div className="flex flex-col gap-4">
          <Badge variant="neutral" className="self-start">{t("nav.research")}</Badge>
          <Heading as="h1" size="display" className="max-w-3xl text-h1 lg:text-display">{t("ui.researchHubTitle")}</Heading>
          <Text variant="body" color="secondary" className="max-w-2xl">{t("ui.researchHubDescription")}</Text>
          <Button asChild variant="outline" size="md" className="mt-2 self-start">
            <Link href="/research/pipeline">{t("ui.researchPipeline")}<ArrowRightIcon size={14} /></Link>
          </Button>
                 <Button asChild variant="ghost" size="md" className="self-start">
                   <Link href="/research/technical">{t("technical.title")}<ArrowRightIcon size={14} /></Link>
                 </Button>
        </div>
      </Section>
      <Section spacing="lg" className="border-t border-border/[0.06]">
        <Card padding="lg" className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="warning">{snapshot.statusLabel}</Badge>
              <Badge variant="outline">{t("common.curatedNotLive")}</Badge>
            </div>
                   <Text variant="body" weight="semibold" className="text-foreground">{t("ui.latestSnapshot")} — {formatLocalizedDate(snapshot.snapshotDate, locale)}</Text>
          </div>
          <Button asChild variant="primary" size="md" className="shrink-0">
            <Link href="/research/intelligence-snapshot">{t("ui.viewFullSnapshot")}<ArrowRightIcon size={14} /></Link>
          </Button>
        </Card>
      </Section>
      <Section spacing="lg" className="border-t border-border/[0.06]">
        <div className="mb-8 flex flex-col gap-3">
          <Text variant="label" color="secondary" className="tracking-wide">{t("ui.analystFrameworkDatabase")}</Text>
          <Heading as="h2" size="h2" className="max-w-2xl">{t("ui.frameworkDatabase")}</Heading>
        </div>
        <FrameworkDatabaseTable frameworks={frameworks} />
      </Section>
      {featuredReport && (
        <Section spacing="lg" className="border-t border-border/[0.06]">
          <div className="mb-8 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Text variant="label" color="secondary" className="tracking-wide">{t("ui.dailyReport")}</Text>
              <Badge variant="neutral">{t("ui.moonxResearch")}</Badge>
            </div>
            <Heading as="h2" size="h2" className="max-w-2xl">{t("ui.dailyIntelligence")}</Heading>
          </div>
          <DailyIntelligenceReport report={featuredReport} />
        </Section>
      )}
    </main>
  );
}
