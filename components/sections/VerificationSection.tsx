"use client";

import { ChevronDownIcon } from "@/components/icons";
import { Badge, Heading, Section, Text } from "@/components/ui";
import { useTranslations } from "@/lib/i18n/LocaleProvider";

const steps = ["published", "movement", "recorded", "updated"] as const;

/** "Forecast Verification" flow — presents the tracking pipeline from publication to outcome. */
export function VerificationSection() {
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

      <div className="mx-auto flex max-w-lg flex-col items-stretch">
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
    </Section>
  );
}
