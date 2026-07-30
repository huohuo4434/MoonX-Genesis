"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { Badge, Button, Card, Heading, Text } from "@/components/ui";
import { pickLocalized } from "@/lib/i18n/config";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import { formatLocalizedDateRange } from "@/lib/utils";
import type { ResearchRecord } from "@/types/research";

function ScenarioCard({
  record,
  titleKey,
  viewLabel,
}: {
  record: ResearchRecord;
  titleKey: string;
  viewLabel: string;
}) {
  const { locale } = useLocale();
  const t = useTranslations();

  return (
    <Card padding="lg" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Text variant="body" weight="semibold" className="text-foreground">
          {t(titleKey)}
        </Text>
        <Badge variant="success">{viewLabel}</Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">{t("home.frameworkSixYao")}</Badge>
        <Badge variant="outline">{t("home.researchAttributeSymbolic")}</Badge>
        <Badge variant="outline">{t("home.verificationPending")}</Badge>
      </div>
      {record.researchScore != null && (
        <div className="flex flex-col gap-1 text-caption text-foreground-tertiary">
          <span>
            {t("home.researchScore")}：{record.researchScore}/100
          </span>
          {record.trendConsistency && (
            <span>
              {t("home.trendConsistency")}：{record.trendConsistency.score}/{record.trendConsistency.max}
            </span>
          )}
        </div>
      )}
      <Text variant="body-sm" color="secondary">
        {pickLocalized(record.summary, locale)}
      </Text>
      {record.turningWindows && record.turningWindows.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Text variant="caption" color="tertiary" className="uppercase tracking-wide">
            {t("home.keyWindows")}
          </Text>
          <ul className="flex flex-col gap-1">
            {record.turningWindows.slice(0, 4).map((window_) => (
              <li key={window_.id} className="flex items-baseline gap-2 text-caption text-foreground-secondary">
                <span className="font-mono text-foreground-tertiary">
                  {window_.date
                    ? formatLocalizedDateRange(window_.date, window_.date, locale)
                    : formatLocalizedDateRange(window_.start ?? "", window_.end ?? "", locale)}
                </span>
                {pickLocalized(window_.label, locale)}
              </li>
            ))}
          </ul>
        </div>
      )}
      <Text variant="caption" color="tertiary">
        {pickLocalized(
          record.disclaimer ?? {
            zhCN: "传统象数研究属于非科学验证框架，仅作为研究记录与后续复盘样本，不构成投资建议。",
            zhTW: "傳統象數研究屬於非科學驗證框架，僅作為研究記錄與後續復盤樣本，不構成投資建議。",
            en: "Traditional symbolic research is a non-scientific verification framework and does not constitute investment advice.",
          },
          locale
        )}
      </Text>
    </Card>
  );
}

export function ChinaEquityLongRangeClient({
  aShares,
  hstech,
}: {
  aShares: ResearchRecord;
  hstech: ResearchRecord;
}) {
  const t = useTranslations();
  const { locale } = useLocale();

  return (
    <>
      <div className="mb-8 flex flex-col gap-3">
        <Text variant="label" color="secondary" className="uppercase tracking-wide">
          {t("nav.research")}
        </Text>
        <Heading as="h2" size="h2" className="max-w-2xl">
          {t("home.longTermChinaTitle")}
        </Heading>
        <Text variant="body" color="secondary" className="max-w-2xl">
          {t("home.longTermChinaSubtitle")}
        </Text>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ScenarioCard
          record={aShares}
          titleKey="home.chinaShanghaiComposite"
          viewLabel={pickLocalized(aShares.ratingDisplay ?? { zhCN: "看涨", zhTW: "看漲", en: "Bullish" }, locale)}
        />
        <ScenarioCard
          record={hstech}
          titleKey="home.chinaHangSengTech"
          viewLabel={pickLocalized(
            hstech.ratingDisplay ?? { zhCN: "强势看涨", zhTW: "強勢看漲", en: "Strong bullish" },
            locale
          )}
        />
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
