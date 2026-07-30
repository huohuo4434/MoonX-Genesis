"use client";

import { AlertTriangleIcon, CheckIcon } from "@/components/icons";
import { Card, Heading, Text } from "@/components/ui";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import type { CrossAssetConsensus } from "@/lib/data/intelligence-snapshot-types";

export interface CrossAssetConsensusSectionProps {
  consensus: CrossAssetConsensus;
}

/** "Cross-Asset Consensus" — synthesizes agreement and conflict across the snapshot's assets. */
export function CrossAssetConsensusSection({ consensus }: CrossAssetConsensusSectionProps) {
  const t = useTranslations();
  const { locale } = useLocale();
  const zh = locale === "zh-CN";
  const mainConclusion = zh ? consensus.mainConclusionZh ?? consensus.mainConclusion : consensus.mainConclusion;
  const beforeWindow = zh ? consensus.beforeWindowZh ?? consensus.beforeWindow : consensus.beforeWindow;
  const afterWindow = zh ? consensus.afterWindowZh ?? consensus.afterWindow : consensus.afterWindow;
  const caveat = zh ? consensus.caveatZh ?? consensus.caveat : consensus.caveat;
  const strongestEvidence = zh ? consensus.strongestEvidenceZh ?? consensus.strongestEvidence : consensus.strongestEvidence;
  const mainConflicts = zh ? consensus.mainConflictsZh ?? consensus.mainConflicts : consensus.mainConflicts;
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Heading as="h2" size="h2" className="max-w-2xl">
          {t("consensus.overviewTitle")}
        </Heading>
        <Text variant="body" color="secondary" className="max-w-2xl">
          {mainConclusion}
        </Text>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card padding="lg" className="flex flex-col gap-3">
          <Text variant="label" color="secondary" className="uppercase tracking-wide">
            {t("consensus.beforeWindow")}
          </Text>
          <ul className="flex flex-col gap-2">
            {beforeWindow.map((item) => (
              <li key={item} className="text-body-sm text-foreground-secondary">
                • {item}
              </li>
            ))}
          </ul>
        </Card>

        <Card padding="lg" className="flex flex-col gap-3">
          <Text variant="label" color="secondary" className="uppercase tracking-wide">
            {t("consensus.afterWindow")}
          </Text>
          <ul className="flex flex-col gap-2">
            {afterWindow.map((item) => (
              <li key={item} className="text-body-sm text-foreground-secondary">
                • {item}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="rounded-md border border-warning/20 bg-warning/5 p-lg">
        <Text variant="body-sm" weight="medium" className="text-foreground">
          {caveat}
        </Text>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <Text variant="label" color="secondary" className="uppercase tracking-wide">
            {t("consensus.strongestEvidence")}
          </Text>
          <ul className="flex flex-col gap-2.5">
            {strongestEvidence.map((item) => (
              <li key={item} className="flex items-start gap-2 text-body-sm text-foreground-secondary">
                <CheckIcon size={14} className="mt-0.5 shrink-0 text-success" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <Text variant="label" color="secondary" className="uppercase tracking-wide">
            {t("consensus.mainConflicts")}
          </Text>
          <ul className="flex flex-col gap-2.5">
            {mainConflicts.map((item) => (
              <li key={item} className="flex items-start gap-2 text-body-sm text-foreground-secondary">
                <AlertTriangleIcon size={14} className="mt-0.5 shrink-0 text-warning" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
