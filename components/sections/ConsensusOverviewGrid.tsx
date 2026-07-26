"use client";

import { ConsensusCard } from "@/components/research";
import { Heading, Text } from "@/components/ui";
import type { LocalizedText } from "@/lib/i18n/config";
import { useTranslations } from "@/lib/i18n/LocaleProvider";
import type { ConsensusResult } from "@/lib/research/consensus-engine";

interface ConsensusItem {
  id: string;
  assetName: LocalizedText;
  symbol?: string;
  result: ConsensusResult;
}

export function ConsensusOverviewGrid({ items }: { items: ConsensusItem[] }) {
  const t = useTranslations();

  return (
    <>
      <div className="mb-8 flex flex-col gap-3">
        <Text variant="label" color="secondary" className="uppercase tracking-wide">
          {t("nav.research")}
        </Text>
        <Heading as="h2" size="h2" className="max-w-2xl">
          {t("home.consensusOverviewTitle")}
        </Heading>
        <Text variant="body" color="secondary" className="max-w-2xl">
          {t("home.consensusOverviewSubtitle")}
        </Text>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <ConsensusCard key={item.id} assetName={item.assetName} symbol={item.symbol} result={item.result} compact />
        ))}
      </div>

      <Text variant="caption" color="tertiary" className="mt-4 max-w-2xl normal-case tracking-normal">
        {t("consensus.disclaimer")}
      </Text>
    </>
  );
}
