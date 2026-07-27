"use client";

import { AltcoinObservationCard, RotationPhaseIndicator } from "@/components/research";
import { Card, Progress, Text } from "@/components/ui";
import { pickLocalized } from "@/lib/i18n/config";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import type { MoonXProcessedAsset, MoonXProcessedMarketTheme } from "@/lib/moonx/types";

export function AltcoinRotationMonitorClient({
  theme,
  doge,
  shib,
  disclaimer,
}: {
  theme: MoonXProcessedMarketTheme;
  doge?: MoonXProcessedAsset;
  shib?: MoonXProcessedAsset;
  disclaimer: string;
}) {
  const { locale } = useLocale();
  const t = useTranslations();
  const weights = theme.normalizedScenarioWeights;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="mb-2 flex flex-col gap-3 lg:col-span-3">
        <Text variant="label" color="secondary" className="uppercase tracking-wide">
          {pickLocalized(theme.category, locale)}
        </Text>
        <h2 className="max-w-2xl text-h2 font-semibold tracking-tight text-foreground">
          {t("altcoinRotation.monitorTitle")}
        </h2>
      </div>
      <Card padding="lg" className="flex flex-col gap-5 lg:col-span-1">
        <RotationPhaseIndicator currentPhase={theme.currentPhase} />
        <div className="flex flex-col gap-3 border-t border-border/[0.08] pt-4">
          <Text variant="label" color="tertiary" className="uppercase tracking-wide">
            {t("altcoinRotation.scenarioWeight")}
          </Text>
          <Progress label={t("altcoinRotation.baseCase")} value={weights.base} />
          <Progress label={t("altcoinRotation.bullCase")} value={weights.bull} />
          <Progress label={t("altcoinRotation.bearCase")} value={weights.bear} />
          <Text variant="caption" color="tertiary">
            {t("altcoinRotation.weightedScoreLabel")}: {theme.calculatedScore.toFixed(1)} · {theme.ratingLabel}
          </Text>
        </div>
        <div className="flex flex-col gap-2 border-t border-border/[0.08] pt-4">
          <Text variant="label" color="tertiary" className="uppercase tracking-wide">
            {t("altcoinRotation.moonxInterpretation")}
          </Text>
          {theme.interpretation.slice(0, 3).map((paragraph) => (
            <Text key={pickLocalized(paragraph, locale)} variant="body-sm" color="secondary">
              {pickLocalized(paragraph, locale)}
            </Text>
          ))}
        </div>
        {theme.riskConditions.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-border/[0.08] pt-4">
            <Text variant="label" color="tertiary" className="uppercase tracking-wide">
              {t("altcoinRotation.mainRisks")}
            </Text>
            {theme.riskConditions.map((risk) => (
              <Text key={pickLocalized(risk, locale)} variant="body-sm" color="secondary">
                • {pickLocalized(risk, locale)}
              </Text>
            ))}
          </div>
        )}
      </Card>

      <div className="flex flex-col gap-6 lg:col-span-2">
        <div className="grid gap-4 sm:grid-cols-2">
          {doge && <AltcoinObservationCard asset={doge} />}
          {shib && <AltcoinObservationCard asset={shib} />}
        </div>

        <Card padding="lg" className="flex flex-col gap-4">
          <Text variant="label" color="tertiary" className="uppercase tracking-wide">
            {t("altcoinRotation.weeklyCandidatesTitle")}
          </Text>
          <div className="grid gap-3 sm:grid-cols-2">
            {theme.weeklyDivergenceCandidates.map((candidate) => (
              <div key={candidate.assetId} className="rounded-md border border-border/[0.08] bg-muted/30 p-3">
                <Text variant="body-sm" weight="semibold">
                  {pickLocalized(candidate.localizedName, locale)} ({candidate.symbol})
                </Text>
                <Text variant="caption" color="secondary" className="mt-1">
                  {pickLocalized(candidate.weeklyDivergenceStatus, locale)}
                </Text>
              </div>
            ))}
          </div>
          <Text variant="caption" color="tertiary" className="italic">
            {t("altcoinRotation.weeklyCandidatesEmpty")}
          </Text>
        </Card>

        <Card padding="lg" className="flex flex-col gap-3">
          <Text variant="label" color="tertiary" className="uppercase tracking-wide">
            {t("altcoinRotation.verificationChecklist")}
          </Text>
          <ul className="flex flex-col gap-2">
            {theme.verificationChecklist.map((item) => (
              <li key={pickLocalized(item, locale)} className="flex gap-2 text-body-sm text-foreground-secondary">
                <span className="mt-1.5 h-3 w-3 shrink-0 rounded-sm border border-border/30" aria-hidden="true" />
                {pickLocalized(item, locale)}
              </li>
            ))}
          </ul>
        </Card>

        <Card padding="md" className="border-dashed border-border/[0.12] bg-muted/20">
          <Text variant="caption" color="tertiary">
            {disclaimer}
          </Text>
        </Card>
      </div>
    </div>
  );
}
