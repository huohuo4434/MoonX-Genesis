"use client";

import { CheckIcon } from "@/components/icons";
import { Button, Heading, Section, Text } from "@/components/ui";
import { HeroDataOrbit } from "./HeroDataOrbit";
import { useTranslations } from "@/lib/i18n/LocaleProvider";

const credibilityKeys = ["hero.badgeFrameworks", "hero.badgeVerification", "hero.badgeTracking"];

export function HeroSection() {
  const t = useTranslations();

  return (
    <Section id="hero" spacing="lg" className="relative overflow-hidden">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col items-start gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-label uppercase tracking-[0.2em] text-primary">MoonX</span>
            <span className="text-caption text-foreground-tertiary">{t("hero.eyebrow")}</span>
          </div>

          <Heading as="h1" size="display" className="max-w-2xl text-h1 lg:text-display">
            {t("hero.title")}
          </Heading>

          <Text variant="body" color="secondary" className="max-w-xl">
            {t("hero.subtitle")}
          </Text>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" variant="primary">
              <a href="#markets">{t("hero.ctaExplore")}</a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="/timeline">{t("hero.ctaTimeline")}</a>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1">
            {credibilityKeys.map((key) => (
              <span key={key} className="flex items-center gap-1.5 text-caption text-foreground-tertiary">
                <CheckIcon size={13} className="shrink-0 text-success" />
                {t(key)}
              </span>
            ))}
          </div>

          <Text variant="caption" color="tertiary" className="max-w-md">
            {t("hero.disclaimer")}
          </Text>
        </div>

        <div className="flex justify-center lg:justify-end">
          <HeroDataOrbit />
        </div>
      </div>
    </Section>
  );
}
