"use client";

import { Badge, Card, Text } from "@/components/ui";
import { pickLocalized, type LocalizedText } from "@/lib/i18n/config";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import type { ConsensusResult } from "@/lib/research/consensus-engine";
import { cn, formatDate } from "@/lib/utils";

export interface ConsensusCardProps {
  assetName: LocalizedText;
  symbol?: string;
  result: ConsensusResult;
  className?: string;
  compact?: boolean;
}

function scoreColor(score: number): string {
  if (score >= 65) return "text-success";
  if (score >= 55) return "text-success/80";
  if (score >= 45) return "text-foreground-secondary";
  if (score >= 35) return "text-danger/80";
  return "text-danger";
}

export function ConsensusCard({ assetName, symbol, result, className, compact = false }: ConsensusCardProps) {
  const { locale } = useLocale();
  const t = useTranslations();

  return (
    <Card padding={compact ? "sm" : "md"} hover className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <Text variant="body" weight="semibold" className="text-foreground">
            {pickLocalized(assetName, locale)}
            {symbol && <span className="ml-1.5 font-mono text-caption text-foreground-tertiary">{symbol}</span>}
          </Text>
          <Text variant="caption" color="tertiary" className="uppercase tracking-wide">
            {t("consensus.score")}
          </Text>
        </div>

        {result.insufficientEvidence ? (
          <Badge variant="outline">{t("consensus.insufficientEvidence")}</Badge>
        ) : (
          <div className="flex flex-col items-end">
            <span className={cn("font-mono text-h3 font-semibold tabular-figures", scoreColor(result.score ?? 0))}>{result.score}</span>
            <Badge variant="outline" className="mt-0.5">
              {t(`directions.${directionKeyForLabel(result.label)}`)}
            </Badge>
          </div>
        )}
      </div>

      {result.insufficientEvidence ? (
        <Text variant="body-sm" color="tertiary">
          {t("consensus.eligibleRecords", { count: result.eligibleCount })}
        </Text>
      ) : (
        <>
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-success" style={{ width: `${result.bullishWeightShare * 100}%` }} />
            <div className="h-full bg-foreground-tertiary/40" style={{ width: `${result.neutralWeightShare * 100}%` }} />
            <div className="h-full bg-danger" style={{ width: `${result.bearishWeightShare * 100}%` }} />
          </div>
          <div className="flex items-center justify-between text-caption text-foreground-tertiary">
            <span>{t("consensus.bullishWeight")} {Math.round(result.bullishWeightShare * 100)}%</span>
            <span>{t("consensus.bearishWeight")} {Math.round(result.bearishWeightShare * 100)}%</span>
          </div>

          {!compact && result.frameworkContributions.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Text variant="caption" color="tertiary" className="uppercase tracking-wide">
                {t("consensus.frameworkContribution")}
              </Text>
              <div className="flex flex-wrap gap-1.5">
                {result.frameworkContributions.slice(0, 4).map((contribution) => (
                  <Badge key={contribution.framework} variant="neutral">
                    {t(`framework.${contribution.framework}`)} · {Math.round(contribution.weightShare * 100)}%
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {!compact && result.nextTurningWindow && (
            <Text variant="caption" color="tertiary">
              {t("consensus.nextTurningWindow")}:{" "}
              {result.nextTurningWindow.date
                ? formatDate(result.nextTurningWindow.date)
                : `${formatDate(result.nextTurningWindow.start ?? "")} – ${formatDate(result.nextTurningWindow.end ?? "")}`}
            </Text>
          )}

          <Text variant="caption" color="tertiary">
            {t("consensus.eligibleRecords", { count: result.eligibleCount })}
          </Text>
        </>
      )}
    </Card>
  );
}

function directionKeyForLabel(label: ConsensusResult["label"]): string {
  return label ?? "neutral";
}
