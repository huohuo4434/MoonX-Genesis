"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { SectionHeader } from "@/components/home/SectionHeader";
import { Badge, Card, Text } from "@/components/ui";
import { pickLocalized, type LocalizedText } from "@/lib/i18n/config";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import { formatLocalizedDateRange } from "@/lib/utils";

interface LongTermCard {
  id: string;
  titleKey: string;
  direction: string;
  horizon: LocalizedText;
  summary: LocalizedText;
  windows: { id: string; start?: string; end?: string; label: LocalizedText }[];
  risks: LocalizedText[];
}

export function LongTermOutlookClient({ cards }: { cards: LongTermCard[] }) {
  const { locale } = useLocale();
  const t = useTranslations();

  return (
    <div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow={t("home.longTermEyebrow")}
        title={t("home.longTermTitle")}
        subtitle={t("home.longTermSubtitle")}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <Card key={card.id} padding="lg" className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <Text variant="body" weight="semibold">
                {t(card.titleKey)}
              </Text>
              <Badge variant="outline">{pickLocalized(card.horizon, locale)}</Badge>
            </div>
            <Text variant="body-sm" color="secondary" className="line-clamp-3">
              {pickLocalized(card.summary, locale)}
            </Text>
            {card.windows[0] && (
              <Text variant="caption" color="tertiary">
                {t("horizon.keyWindow")}:{" "}
                {formatLocalizedDateRange(card.windows[0].start ?? "", card.windows[0].end, locale)}{" "}
                {pickLocalized(card.windows[0].label, locale)}
              </Text>
            )}
            {card.risks[0] && (
              <Text variant="caption" color="tertiary">
                {t("home.riskWindow")}: {pickLocalized(card.risks[0], locale)}
              </Text>
            )}
            <Link
              href="/timeline"
              className="mt-auto inline-flex items-center gap-1 text-caption text-foreground-tertiary hover:text-primary focus-ring"
            >
              {t("home.viewFullResearch")}
              <ArrowRightIcon size={12} />
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
