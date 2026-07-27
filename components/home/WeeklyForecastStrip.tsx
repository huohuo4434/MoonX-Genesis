"use client";

import { SectionHeader } from "@/components/home/SectionHeader";
import { Card, Text } from "@/components/ui";
import { useTranslations } from "@/lib/i18n/LocaleProvider";

const WEEK_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "weekend"] as const;

/** Empty weekly strip until a formal weekly edition is curated. Never invents day paths. */
export function WeeklyForecastStrip() {
  const t = useTranslations();

  return (
    <section id="weekly-forecast" className="border-t border-border/[0.06] py-12 lg:py-16">
      <div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow={t("home.weeklyEyebrow")}
          title={t("home.weeklyTitle")}
          subtitle={t("home.weeklySubtitle")}
        />
        <Card padding="lg" className="mb-4">
          <Text variant="body" weight="semibold">
            {t("home.weeklyEmpty")}
          </Text>
          <Text variant="body-sm" color="secondary" className="mt-2">
            {t("home.weeklyEmptyHint")}
          </Text>
        </Card>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {WEEK_DAYS.map((day) => (
            <div key={day} className="rounded-lg border border-border/[0.06] bg-card/60 px-3 py-4">
              <Text variant="caption" color="tertiary">
                {t(`home.week.${day}`)}
              </Text>
              <Text variant="body-sm" color="secondary" className="mt-2">
                {t("horizon.awaitingUpdate")}
              </Text>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
