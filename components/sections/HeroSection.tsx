"use client";

import { CheckIcon } from "@/components/icons";
import { Button, Heading, Section, Text } from "@/components/ui";
import { useTranslations } from "@/lib/i18n/LocaleProvider";

const FEATURES = [
  "明确方向与概率",
  "收盘后公开验证",
  "提供具体路径与失效价格",
] as const;

export function HeroSection() {
  const t = useTranslations();

  return (
    <Section id="hero" spacing="sm" className="relative overflow-hidden py-8 lg:py-12">
      <div className="flex flex-col items-start gap-4">
        <span className="text-label uppercase tracking-[0.2em] text-primary" aria-label="MOOX">
          MOOX
        </span>
        <Heading as="h1" size="h2" className="max-w-3xl text-h2 lg:text-h1">
          {t("hero.title")}
        </Heading>
        <Text variant="body" color="secondary" className="max-w-2xl">
          {t("hero.subtitle")}
        </Text>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" variant="primary">
            <a href="#moonx-view">{t("hero.ctaExplore")}</a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="/member/tomorrow">{t("hero.ctaTomorrow")}</a>
          </Button>
        </div>
        <ul className="flex w-full max-w-2xl flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
          {FEATURES.map((label) => (
            <li key={label} className="flex items-center gap-1.5 text-caption text-foreground-tertiary">
              <CheckIcon size={13} className="shrink-0 text-success" aria-hidden />
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
