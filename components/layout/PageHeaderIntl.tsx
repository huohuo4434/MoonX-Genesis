"use client";

import { Badge, Heading, Text } from "@/components/ui";
import { useTranslations } from "@/lib/i18n/LocaleProvider";

export interface PageHeaderIntlProps {
  titleKey: string;
  subtitleKey: string;
  badgeKey?: string;
}

/** Translated page header used by the new V1.1 top-level pages (Research Library, Watchlist, Timeline). */
export function PageHeaderIntl({ titleKey, subtitleKey, badgeKey }: PageHeaderIntlProps) {
  const t = useTranslations();

  return (
    <div className="flex flex-col gap-4">
      {badgeKey && (
        <Badge variant="neutral" className="self-start">
          {t(badgeKey)}
        </Badge>
      )}
      <Heading as="h1" size="display" className="max-w-3xl text-h1 lg:text-display">
        {t(titleKey)}
      </Heading>
      <Text variant="body" color="secondary" className="max-w-2xl">
        {t(subtitleKey)}
      </Text>
    </div>
  );
}
