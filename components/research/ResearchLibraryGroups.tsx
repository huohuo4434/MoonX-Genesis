"use client";

import Link from "next/link";
import { Badge, Card, Heading, Text } from "@/components/ui";
import { pickLocalized } from "@/lib/i18n/config";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import type { ResearchCollection, ResearchRecord } from "@/types/research";

const PREFERRED_GROUP_IDS = [
  "precious-metals-research-2026-07",
  "crypto-long-range-research-2026",
  "crypto-market-risk-research-2026",
  "us-equity-annual-path-2026",
  "qimen-china-equity-h2-2026",
] as const;

export function ResearchLibraryGroups({
  collections,
  records,
}: {
  collections: ResearchCollection[];
  records: ResearchRecord[];
}) {
  const { locale } = useLocale();
  const t = useTranslations();

  const byCollection = new Map<string, ResearchRecord[]>();
  for (const record of records) {
    if (!record.collectionId) continue;
    const list = byCollection.get(record.collectionId) ?? [];
    list.push(record);
    byCollection.set(record.collectionId, list);
  }

  const ordered = PREFERRED_GROUP_IDS.map((id) => collections.find((item) => item.id === id)).filter(
    (item): item is ResearchCollection => Boolean(item)
  );

  if (ordered.length === 0) return null;

  return (
    <div className="mb-10 flex flex-col gap-8">
      {ordered.map((collection) => {
        const groupRecords = byCollection.get(collection.id) ?? [];
        if (groupRecords.length === 0) return null;
        return (
          <div key={collection.id} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Heading as="h2" size="h3">
                {pickLocalized(collection.title, locale)}
              </Heading>
              {collection.description && (
                <Text variant="body-sm" color="secondary">
                  {pickLocalized(collection.description, locale)}
                </Text>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {groupRecords.map((record) => (
                <Card key={record.id} padding="md" className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <Text variant="body-sm" weight="semibold">
                      {pickLocalized(record.title, locale)}
                    </Text>
                    <Badge variant="outline">
                      {record.ratingDisplay
                        ? pickLocalized(record.ratingDisplay, locale)
                        : t(`directions.${record.direction}`)}
                    </Badge>
                  </div>
                  <Text variant="caption" color="tertiary" className="font-mono">
                    {record.symbol ?? record.assetId}
                  </Text>
                  <Text variant="caption" color="secondary" className="line-clamp-3">
                    {pickLocalized(record.summary, locale)}
                  </Text>
                  {record.verificationResult && (
                    <div className="flex flex-col gap-0.5">
                      {record.verificationResult.actualChangePct != null && (
                        <Text variant="caption" color="secondary" className="block">
                          {t("researchLibrary.actualChange")}:{" "}
                          {record.verificationResult.actualChangePct > 0 ? "+" : ""}
                          {record.verificationResult.actualChangePct}%
                        </Text>
                      )}
                      {record.verificationResult.scoreEligible === false && (
                        <Text variant="caption" color="tertiary" className="block">
                          {t("researchLibrary.scoreNotEligible")}
                        </Text>
                      )}
                    </div>
                  )}
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                    <Badge variant="outline">{t("home.frameworkSixYao")}</Badge>
                    {record.researchAttribute && (
                      <Badge variant="outline">{pickLocalized(record.researchAttribute, locale)}</Badge>
                    )}
                    <Badge variant="outline">{t(`status.${record.status}`)}</Badge>
                  </div>
                </Card>
              ))}
            </div>
            <Text variant="caption" color="tertiary">
              {t("researchLibrary.groupHint")}
            </Text>
          </div>
        );
      })}
      <Link href="#research-library-filters" className="text-body-sm text-foreground-secondary hover:text-primary focus-ring">
        {t("researchLibrary.browseAll")}
      </Link>
    </div>
  );
}
