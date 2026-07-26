"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { Badge, Button, Card, Heading, Text } from "@/components/ui";
import { pickLocalized } from "@/lib/i18n/config";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import { formatDate } from "@/lib/utils";
import type { ResearchRecord } from "@/types/research";

function ScenarioCard({ record, titleKey, viewKey }: { record: ResearchRecord; titleKey: string; viewKey: string }) {
  const { locale } = useLocale();
  const t = useTranslations();

  return (
    <Card padding="lg" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Text variant="body" weight="semibold" className="text-foreground">
          {t(titleKey)}
        </Text>
        <Badge variant="success">{t(viewKey)}</Badge>
      </div>
      <Text variant="body-sm" color="secondary">
        {pickLocalized(record.summary, locale)}
      </Text>
      {record.turningWindows && record.turningWindows.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Text variant="caption" color="tertiary" className="uppercase tracking-wide">
            {t("home.keyWindows")}
          </Text>
          <ul className="flex flex-col gap-1">
            {record.turningWindows.slice(0, 3).map((window_) => (
              <li key={window_.id} className="flex items-baseline gap-2 text-caption text-foreground-secondary">
                <span className="font-mono text-foreground-tertiary">
                  {window_.date ? formatDate(window_.date) : `${formatDate(window_.start ?? "")}–${formatDate(window_.end ?? "")}`}
                </span>
                {pickLocalized(window_.label, locale)}
              </li>
            ))}
          </ul>
        </div>
      )}
      {record.targets && record.targets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {record.targets.map((target) => (
            <Badge key={target} variant="outline" className="font-mono">
              {target.toLocaleString("en-US")}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}

export function ChinaEquityLongRangeClient({ aShares, hongKong }: { aShares: ResearchRecord; hongKong: ResearchRecord }) {
  const t = useTranslations();

  return (
    <>
      <div className="mb-8 flex flex-col gap-3">
        <Text variant="label" color="secondary" className="uppercase tracking-wide">
          {t("nav.research")}
        </Text>
        <Heading as="h2" size="h2" className="max-w-2xl">
          {t("home.chinaEquityTitle")}
        </Heading>
        <Text variant="body" color="secondary" className="max-w-2xl">
          {t("home.chinaEquitySubtitle")}
        </Text>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ScenarioCard record={aShares} titleKey="home.chinaAShares" viewKey="home.chinaAggregateView" />
        <ScenarioCard record={hongKong} titleKey="home.chinaHongKong" viewKey="home.chinaHongKongView" />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Text variant="caption" color="tertiary" className="normal-case tracking-normal">
          {t("home.scenarioTargets")}
        </Text>
        <Button asChild variant="outline" size="sm">
          <Link href="/timeline">
            {t("home.viewFullTimeline")}
            <ArrowRightIcon size={13} />
          </Link>
        </Button>
      </div>
    </>
  );
}
