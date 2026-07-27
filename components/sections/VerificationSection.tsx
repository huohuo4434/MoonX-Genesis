"use client";

import { ChevronDownIcon } from "@/components/icons";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import { pickLocalized } from "@/lib/i18n/config";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import type { ResearchRecord } from "@/types/research";

const steps = ["published", "movement", "recorded", "updated"] as const;

const STAGE_STATUSES = [
  "待回填验证",
  "待验证",
  "阶段命中",
  "阶段部分命中",
  "阶段未命中",
  "已失效",
] as const;

/** Forecast verification flow + staged annual verification boards. */
export function VerificationSection({ stagedRecords = [] }: { stagedRecords?: ResearchRecord[] }) {
  const { locale } = useLocale();
  const t = useTranslations();

  return (
    <Section id="verification" spacing="lg" className="border-t border-border/[0.06]">
      <div className="mb-12 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Text variant="label" color="secondary" className="uppercase tracking-wide">
            {t("verification.eyebrow")}
          </Text>
          <Badge variant="neutral">{t("verification.demoFlow")}</Badge>
        </div>
        <Heading as="h2" size="h2" className="max-w-2xl">
          {t("verification.title")}
        </Heading>
        <Text variant="body" color="secondary" className="max-w-2xl">
          {t("verification.subtitle")}
        </Text>
      </div>

      <div className="mx-auto mb-12 flex max-w-lg flex-col items-stretch">
        {steps.map((step, index) => (
          <div key={step} className="flex flex-col items-center">
            <div className="flex w-full items-start gap-4 rounded-lg border border-border/[0.08] bg-card p-lg">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/30 font-mono text-caption text-primary">
                {index + 1}
              </span>
              <div className="flex flex-col gap-1">
                <Text variant="body" weight="semibold" className="text-foreground">
                  {t(`verification.${step}Label`)}
                </Text>
                <Text variant="body-sm" color="secondary">
                  {t(`verification.${step}Description`)}
                </Text>
              </div>
            </div>
            {index < steps.length - 1 && (
              <ChevronDownIcon size={18} className="my-2 shrink-0 text-foreground-tertiary" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>

      <div className="mb-6 flex flex-col gap-2">
        <Heading as="h3" size="h3">
          {t("verification.stageBoardTitle")}
        </Heading>
        <Text variant="body-sm" color="secondary" className="max-w-2xl">
          {t("verification.stageBoardSubtitle")}
        </Text>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {STAGE_STATUSES.map((status) => (
            <Badge key={status} variant="outline">
              {status}
            </Badge>
          ))}
        </div>
      </div>

      {stagedRecords.length === 0 ? (
        <Text variant="body-sm" color="tertiary">
          {t("verification.noStagedRecords")}
        </Text>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {stagedRecords.map((record) => (
            <Card key={record.id} padding="lg" className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Text variant="body" weight="semibold">
                  {pickLocalized(record.title, locale)}
                </Text>
                <Badge variant="outline">{t(`status.${record.status}`)}</Badge>
                {record.researchKind === "risk" && (
                  <Badge variant="outline">{t("researchLibrary.riskNotPrice")}</Badge>
                )}
              </div>
              <Text variant="caption" color="tertiary" className="font-mono">
                {record.id}
              </Text>
              <ul className="flex flex-col gap-2">
                {(record.verificationStages ?? []).map((stage, index) => (
                  <li key={`${record.id}-stage-${index}`} className="rounded-md border border-border/[0.08] bg-muted/40 p-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Text variant="caption" weight="medium" className="text-foreground">
                        {pickLocalized(stage.title, locale)}
                      </Text>
                      <Badge variant="outline">{stage.status}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </Section>
  );
}
