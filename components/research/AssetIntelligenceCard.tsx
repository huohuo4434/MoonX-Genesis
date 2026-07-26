import { ChevronDownIcon } from "@/components/icons";
import { TrendBadge } from "@/components/data";
import { Badge, Card, Progress, Text } from "@/components/ui";
import {
  getDominantDirection,
  type AssetIntelligenceSnapshot,
} from "@/lib/data/intelligence-snapshot-types";
import { formatDate } from "@/lib/utils";

export interface AssetIntelligenceCardProps {
  asset: AssetIntelligenceSnapshot;
  /** e.g. "Draft — Pending Verification" */
  verificationStatusLabel: string;
}

/**
 * Compact overview + expandable full-detail card for one asset in the
 * MoonX Intelligence Snapshot. The "View Details" disclosure uses a native
 * `<details>` element — no client-side JavaScript required.
 */
export function AssetIntelligenceCard({ asset, verificationStatusLabel }: AssetIntelligenceCardProps) {
  const direction = getDominantDirection(asset.scores);
  const hasObservationZones = asset.observationZones && asset.observationZones.length > 0;

  return (
    <Card id={asset.id} padding="lg" className="flex scroll-mt-24 flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Text variant="body" weight="semibold" className="text-h3 text-foreground">
            {asset.asset}
          </Text>
          <Text variant="caption" color="tertiary">
            {asset.symbol}
          </Text>
        </div>
        <TrendBadge trend={direction} />
      </div>

      <div className="flex flex-col gap-1">
        <Text variant="body-sm" weight="medium" className="text-foreground">
          {asset.currentView}
        </Text>
        {asset.summaryZh && (
          <Text variant="caption" color="tertiary">
            {asset.summaryZh}
          </Text>
        )}
      </div>

      <div className="flex items-center justify-between border-y border-border/[0.08] py-3">
        <Text variant="caption" color="tertiary">
          Forecast Window
        </Text>
        <Text variant="caption" className="font-mono text-foreground-secondary">
          {formatDate(asset.forecastWindow.start)} – {formatDate(asset.forecastWindow.end)}
        </Text>
      </div>

      <div className="flex flex-col gap-3">
        <Progress label="Bullish" value={asset.scores.bullish} />
        <Progress label="Bearish" value={asset.scores.bearish} />
        <Progress label="Neutral" value={asset.scores.neutral} />
        <div className="grid grid-cols-2 gap-3">
          <Progress label="Agreement" value={asset.scores.agreement} />
          <Progress label="Evidence" value={asset.scores.evidence} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Text variant="caption" color="tertiary">
          Key Levels
        </Text>
        <Text variant="body-sm" color="secondary">
          {asset.keyLevelsSummary}
        </Text>
      </div>

      <div className="flex flex-col gap-1.5">
        <Text variant="caption" color="tertiary">
          Trend Path
        </Text>
        <Text variant="body-sm" color="secondary">
          {asset.trendPath[0]}
        </Text>
      </div>

      <div className="flex flex-col gap-1.5">
        <Text variant="caption" color="tertiary">
          Primary Risk
        </Text>
        <Text variant="body-sm" color="secondary">
          {asset.primaryRisk}
        </Text>
      </div>

      <div className="flex items-center justify-between pt-1">
        <Badge variant="warning">{verificationStatusLabel}</Badge>
      </div>

      <details className="group border-t border-border/[0.08] pt-4 [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-sm text-body-sm font-medium text-foreground-secondary transition-colors hover:text-foreground focus-ring">
          View Details
          <ChevronDownIcon size={16} className="shrink-0 transition-transform group-open:rotate-180" />
        </summary>

        <div className="mt-5 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Text variant="label" color="secondary" className="uppercase tracking-wide">
              Full Trend Path
            </Text>
            <ul className="flex flex-col gap-2">
              {asset.trendPath.map((step) => (
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
                    Key Support
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
                    Key Resistance
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
                Observation Zones
              </Text>
              <ul className="flex flex-col gap-1.5">
                {asset.observationZones!.map((zone) => (
                  <li key={zone.label} className="flex items-center justify-between gap-3 text-body-sm">
                    <span className="text-foreground-secondary">{zone.label}</span>
                    <span className="font-mono text-foreground-tertiary">{zone.range}</span>
                  </li>
                ))}
              </ul>
              {asset.observationZonesNote && (
                <Text variant="caption" color="tertiary">
                  {asset.observationZonesNote}
                </Text>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Text variant="label" color="secondary" className="uppercase tracking-wide">
              Framework Evidence
            </Text>
            <div className="flex flex-col gap-3">
              {asset.frameworkEvidence.map((entry, index) => (
                <div key={`${entry.framework}-${index}`} className="flex flex-col gap-1.5">
                  <Badge variant="outline" className="self-start">
                    {entry.framework}
                  </Badge>
                  <Text variant="body-sm" color="secondary">
                    {entry.commentary}
                  </Text>
                </div>
              ))}
            </div>
          </div>

          {asset.conflictingView && (
            <div className="flex flex-col gap-2 rounded-md border border-warning/20 bg-warning/5 p-lg">
              <Text variant="label" color="secondary" className="uppercase tracking-wide">
                Conflicting View
              </Text>
              <Text variant="body-sm" color="secondary">
                {asset.conflictingView}
              </Text>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Text variant="label" color="secondary" className="uppercase tracking-wide">
              Verification Checklist
            </Text>
            <ul className="flex flex-col gap-2">
              {asset.verificationItems.map((item) => (
                <li key={item} className="flex items-start gap-2 text-body-sm text-foreground-secondary">
                  <span
                    aria-hidden="true"
                    className="mt-1 h-3.5 w-3.5 shrink-0 rounded-sm border border-border/30"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <Text variant="caption" color="tertiary">
            Confidence: {asset.scores.confidence}/100 — reflects agreement across frameworks, not a
            guarantee of outcome.
          </Text>
        </div>
      </details>
    </Card>
  );
}
