"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { Badge, Card, Heading, Text } from "@/components/ui";
import { pickLocalized } from "@/lib/i18n/config";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import type { MoonXProcessedMarketTheme } from "@/lib/moonx/types";

export function AltcoinRotationHomeClient({ theme }: { theme: MoonXProcessedMarketTheme }) {
  const { locale } = useLocale();
  const t = useTranslations();

  return (
    <Card padding="md" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="success">{t("directions.bullish")}</Badge>
          <Badge variant="warning">{t("altcoinRotation.partiallyConfirmed")}</Badge>
        </div>
        <Heading as="h3" size="h3" className="text-h3">
          {pickLocalized(theme.localizedTitle, locale)}
        </Heading>
        <Text variant="body-sm" color="secondary">
          {t("altcoinRotation.phaseEarlyLeaders")} · DOGE, SHIB · {t("altcoinRotation.weeklyCandidatesWaiting")}
        </Text>
      </div>
      <Link
        href="/research#altcoin-rotation"
        className="inline-flex shrink-0 items-center gap-1.5 text-body-sm text-foreground-secondary transition-colors hover:text-primary focus-ring"
      >
        {t("altcoinRotation.monitorTitle")}
        <ArrowRightIcon size={14} />
      </Link>
    </Card>
  );
}
