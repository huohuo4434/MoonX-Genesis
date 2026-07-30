"use client";

import { Badge, Card, Text } from "@/components/ui";
import { pickLocalized } from "@/lib/i18n/config";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import type { MoonXProcessedAsset } from "@/lib/moonx/types";

export function AltcoinObservationCard({ asset }: { asset: MoonXProcessedAsset }) {
  const { locale } = useLocale();
  const t = useTranslations();
  const settings = asset.strategicWatchlistSettings;
  const sourceLevel = settings?.sourceLevel;
  const levelsPending = settings?.levelsPendingLabel;

  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Text variant="body" weight="semibold" className="text-foreground">
            {pickLocalized(asset.localizedName, locale)}
          </Text>
          <Text variant="caption" color="tertiary" className="font-mono">
            {asset.symbol}
          </Text>
        </div>
        <Badge variant="outline">
          {pickLocalized(settings?.currentRole ?? asset.shortView, locale)}
        </Badge>
      </div>

      {sourceLevel && (
        <div className="rounded-md border border-warning/20 bg-warning/5 p-3">
          <Text variant="caption" color="tertiary" className="uppercase tracking-wide">
            {t("altcoinRotation.analystStatedLevel")}
          </Text>
          <Text variant="body" weight="semibold" className="mt-1 font-mono text-foreground">
            {sourceLevel.value} {sourceLevel.currency}
          </Text>
          <Text variant="caption" color="secondary" className="mt-1">
            {pickLocalized(sourceLevel.levelType, locale)} — {t("altcoinRotation.pendingMarketVerification")}
          </Text>
        </div>
      )}

      {levelsPending && (
        <div className="rounded-md border border-border/[0.08] bg-muted/40 p-3">
          <Text variant="body-sm" color="secondary">
            {pickLocalized(levelsPending, locale)}
          </Text>
        </div>
      )}

      <Text variant="body-sm" color="secondary">
        {pickLocalized(settings?.thesis ?? asset.localizedSummary, locale)}
      </Text>

      {asset.confirmationConditions.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Text variant="label" color="tertiary" className="uppercase tracking-wide">
            {t("altcoinRotation.rotationConfirmation")}
          </Text>
          <ul className="flex flex-col gap-1">
            {asset.confirmationConditions.slice(0, 4).map((item) => (
              <li key={pickLocalized(item, locale)} className="text-body-sm text-foreground-secondary">
                • {pickLocalized(item, locale)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {asset.riskConditions.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Text variant="label" color="tertiary" className="uppercase tracking-wide">
            {t("altcoinRotation.rotationFailure")}
          </Text>
          <ul className="flex flex-col gap-1">
            {asset.riskConditions.slice(0, 3).map((item) => (
              <li key={pickLocalized(item, locale)} className="text-body-sm text-foreground-secondary">
                • {pickLocalized(item, locale)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
