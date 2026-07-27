"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { Button, Text } from "@/components/ui";
import { useTranslations } from "@/lib/i18n/LocaleProvider";

export function MethodologyEntry() {
  const t = useTranslations();

  return (
    <section id="methodology" className="border-t border-border/[0.06] py-12 lg:py-16">
      <div className="mx-auto flex w-full max-w-container flex-col gap-4 px-4 sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <Text variant="body" weight="semibold">
            {t("home.methodologyTitle")}
          </Text>
          <Text variant="body-sm" color="secondary" className="mt-2">
            {t("home.methodologySubtitle")}
          </Text>
        </div>
        <Button asChild variant="outline" size="md">
          <Link href="/research/pipeline">
            {t("home.methodologyCta")}
            <ArrowRightIcon size={14} />
          </Link>
        </Button>
      </div>
    </section>
  );
}
