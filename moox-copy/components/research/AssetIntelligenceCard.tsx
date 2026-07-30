"use client";

import Link from "next/link";
import { ChevronDownIcon } from "@/components/icons";
import { TrendBadge } from "@/components/data";
import { Badge, Card, Progress, Text } from "@/components/ui";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import {
  getDominantDirection,
  type AssetIntelligenceSnapshot,
} from "@/lib/data/intelligence-snapshot-types";
import { routes } from "@/lib/navigation";
import { formatLocalizedDate } from "@/lib/utils";

export interface AssetIntelligenceCardProps {
  asset: AssetIntelligenceSnapshot;
  verificationStatusLabel: string;
  /** Hide member-level levels, paths, evidence when true. */
  publicTeaser?: boolean;
}

export function AssetIntelligenceCard({
  asset,
  verificationStatusLabel,
  publicTeaser = false,
}: AssetIntelligenceCardProps) {
  const { locale } = useLocale();
  const t = useTranslations();
  const direction = getDominantDirection(asset.scores);
  const hasObservationZones = asset.observationZones && asset.observationZones.length > 0;
  const isChinese = locale === "zh-CN" || locale === "zh-TW";
  const assetName = isChinese ? asset.assetZh ?? asset.asset : asset.asset;
  const currentView = isChinese ? asset.summaryZh ?? asset.currentView : asset.currentView;
  const trendPath = isChinese ? asset.trendPathZh ?? asset.trendPath : asset.trendPath;
  const primaryRisk = isChinese ? asset.primaryRiskZh ?? asset.primaryRisk : asset.primaryRisk;
  const verificationItems = isChinese ? asset.verificationItemsZh ?? asset.verificationItems : asset.verificationItems;

  return (
    <Card id={asset.id} padding="lg" className="flex scroll-mt-24 flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Text variant="body" weight="semibold" className="text-h3 text-foreground">
            {assetName}
          </Text>
          <Text variant="caption" color="tertiary">
            {asset.symbol}
          </Text>
        </div>
        <TrendBadge trend={direction} />
      </div>

      <div className="flex flex-col gap-1">
        <Text variant="body-sm" weight="medium" className="text-foreground">
          {currentView}
        </Text>
      </div>

      <div className="flex items-center justify-between border-y border-border/[0.08] py-3">
        <Text variant="caption" color="tertiary">
          {t("ui.forecastPeriod")}
        </Text>
        <Text variant="caption" className="font-mono text-foreground-secondary">
          {formatLocalizedDate(asset.forecastWindow.start, locale)} –{" "}
          {formatLocalizedDate(asset.forecastWindow.end, locale)}
        </Text>
      </div>

      <div className="flex flex-col gap-3">
        <Progress label={t("directions.bullish")} value={asset.scores.bullish} />
        <Progress label={t("directions.bearish")} value={asset.scores.bearish} />
        <Progress label={t("directions.neutral")} value={asset.scores.neutral} />
        {!publicTeaser && (
          <div className="grid grid-cols-2 gap-3">
            <Progress label={t("ui.agreementScore")} value={asset.scores.agreement} />
            <Progress label={t("ui.evidenceScore")} value={asset.scores.evidence} />
          </div>
        )}
      </div>

      {publicTeaser ? (
        <div className="flex flex-col gap-3">
          <Text variant="caption" color="tertiary" className="rounded-md border border-border/[0.08] bg-muted/30 p-3">
            完整目标价、支撑压力、时间路径与失效条件为会员权益。公开页仅展示综合方向与摘要。
          </Text>
          <Link href={routes.pricing} className="text-body-sm text-primary underline-offset-4 hover:underline">
            查看会员权益
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <Text variant="caption" color="tertiary">
              {t("ui.keyLevels")}
            </Text>
            <Text variant="body-sm" color="secondary">
              {isChinese ? asset.keyLevelsSummaryZh ?? asset.keyLevelsSummary : asset.keyLevelsSummary}
            </Text>
          </div>
          <div className="flex flex-col gap-1.5">
            <Text variant="caption" color="tertiary">
              {t("ui.trendPath")}
            </Text>
            <Text variant="body-sm" color="secondary">
              {trendPath[0]}
            </Text>
          </div>
          <div className="flex flex-col gap-1.5">
            <Text variant="caption" color="tertiary">
              {t("ui.primaryRisk")}
            </Text>
            <Text variant="body-sm" color="secondary">
              {primaryRisk}
            </Text>
          </div>
        </>
      )}

      <div className="flex items-center justify-between pt-1">
        <Badge variant="warning">{verificationStatusLabel}</Badge>
      </div>

      {!publicTeaser && (
        <details className="group border-t border-border/[0.08] pt-4 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-sm text-body-sm font-medium text-foreground-secondary transition-colors hover:text-foreground focus-ring">
            {t("common.viewDetails")}
            <ChevronDownIcon size={16} className="shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-5 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Text variant="label" color="secondary" className="uppercase tracking-wide">
                {t("ui.fullTrendPath")}
              </Text>
              <ul className="flex flex-col gap-2">
                {trendPath.map((step) => (
                  <li key={step} className="text-body-sm text-foreground-secondary">
                    • {step}
                  </li>
                ))}
              </ul>
            </div>
            {(asset.keySupport || asset.keyResistance) && (
              <div className="grid gap-4 sm:grid-cols-2">
                {asset.keySupport && (
                  <div className="flex flex-col gap-2">
                    <Text variant="label" color="secondary" className="uppercase tracking-wide">
                      {t("ui.keySupport")}
                    </Text>
                    <ul className="flex flex-col gap-1">
                      {asset.keySupport.map((level) => (
                        <li key={level} className="font-mono text-body-sm text-foreground-secondary">
                          {level}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {asset.keyResistance && (
                  <div className="flex flex-col gap-2">
                    <Text variant="label" color="secondary" className="uppercase tracking-wide">
                      {t("ui.keyResistance")}
                    </Text>
                    <ul className="flex flex-col gap-1">
                      {asset.keyResistance.map((level) => (
                        <li key={level} className="font-mono text-body-sm text-foreground-secondary">
                          {level}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {hasObservationZones && (
              <div className="flex flex-col gap-2">
                <Text variant="label" color="secondary" className="uppercase tracking-wide">
                  {t("ui.observationZones")}
                </Text>
                <ul className="flex flex-col gap-1.5">
                  {asset.observationZones!.map((zone) => (
                    <li key={zone.label} className="flex items-center justify-between gap-3 text-body-sm">
                      <span className="text-foreground-secondary">{zone.label}</span>
                      <span className="font-mono text-foreground-tertiary">{zone.range}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-col gap-3">
              <Text variant="label" color="secondary" className="uppercase tracking-wide">
                {t("ui.frameworkEvidence")}
              </Text>
              {asset.frameworkEvidence.map((entry, index) => (
                <div key={`${entry.framework}-${index}`} className="flex flex-col gap-1.5">
                  <Badge variant="outline" className="self-start">
                    {entry.framework}
                  </Badge>
                  <Text variant="body-sm" color="secondary">
                    {isChinese ? entry.commentaryZh ?? entry.commentary : entry.commentary}
                  </Text>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <Text variant="label" color="secondary" className="uppercase tracking-wide">
                {t("chart.verificationChecklist")}
              </Text>
              <ul className="flex flex-col gap-2">
                {verificationItems.map((item) => (
                  <li key={item} className="text-body-sm text-foreground-secondary">
                    • {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </details>
      )}
    </Card>
  );
}
