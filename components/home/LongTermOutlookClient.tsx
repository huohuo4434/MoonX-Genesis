"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { SectionHeader } from "@/components/home/SectionHeader";
import { Badge, Card, Text } from "@/components/ui";
import { pickLocalized, type LocalizedText } from "@/lib/i18n/config";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";

export interface ChinaEquityCardModel {
  id: string;
  titleKey: string;
  rating: LocalizedText;
  score: number;
  consistencyScore: number;
  consistencyMax: number;
  consistencyNote: LocalizedText;
  summary: LocalizedText;
  frameworkLabel: LocalizedText;
  researchAttribute: LocalizedText;
  verificationLabel: LocalizedText;
  disclaimer: LocalizedText;
}

export function LongTermOutlookClient({ cards }: { cards: ChinaEquityCardModel[] }) {
  const { locale } = useLocale();
  const t = useTranslations();

  return (
    <div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow={t("home.chinaEquityEyebrow")}
        title={t("home.chinaEquityMarketTitle")}
        subtitle={t("home.chinaEquityMarketSubtitle")}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <Card key={card.id} padding="lg" className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <Text variant="body" weight="semibold">
                {t(card.titleKey)}
              </Text>
              <Badge variant="outline">{pickLocalized(card.rating, locale)}</Badge>
            </div>
            <div className="flex flex-col gap-1 text-caption text-foreground-tertiary">
              <span>
                {t("home.researchScore")}：{card.score}/100
              </span>
              <span>
                {t("home.trendConsistency")}：{card.consistencyScore}/{card.consistencyMax}
              </span>
            </div>
            <Text variant="caption" color="tertiary">
              {pickLocalized(card.consistencyNote, locale)}
            </Text>
            <Text variant="body-sm" color="secondary" className="line-clamp-4">
              {pickLocalized(card.summary, locale)}
            </Text>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{pickLocalized(card.frameworkLabel, locale)}</Badge>
              <Badge variant="outline">{pickLocalized(card.researchAttribute, locale)}</Badge>
              <Badge variant="outline">{pickLocalized(card.verificationLabel, locale)}</Badge>
            </div>
            <Text variant="caption" color="tertiary" className="line-clamp-3">
              {pickLocalized(card.disclaimer, locale)}
            </Text>
          </Card>
        ))}
      </div>
      <Link
        href="/timeline"
        className="mt-6 inline-flex items-center gap-1 text-body-sm text-foreground-secondary hover:text-primary focus-ring"
      >
        {t("home.viewFullChinaEquity")}
        <ArrowRightIcon size={14} />
      </Link>
    </div>
  );
}
