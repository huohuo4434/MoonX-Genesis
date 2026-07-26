"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { WatchlistCard } from "@/components/research";
import { Button, Heading, Text } from "@/components/ui";
import { useTranslations } from "@/lib/i18n/LocaleProvider";
import type { WatchlistEntry } from "@/types/research";

export function StrategicWatchlistClient({ items }: { items: { entry: WatchlistEntry; researchCount: number }[] }) {
  const t = useTranslations();

  return (
    <>
      <div className="mb-8 flex flex-col gap-3">
        <Text variant="label" color="secondary" className="uppercase tracking-wide">
          {t("nav.watchlist")}
        </Text>
        <Heading as="h2" size="h2" className="max-w-2xl">
          {t("home.watchlistTitle")}
        </Heading>
        <Text variant="body" color="secondary" className="max-w-2xl">
          {t("home.watchlistSubtitle")}
        </Text>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.slice(0, 3).map(({ entry, researchCount }) => (
          <WatchlistCard key={entry.id} entry={entry} researchCount={researchCount} />
        ))}
      </div>

      <Button asChild variant="outline" size="md" className="mt-6">
        <Link href="/markets/watchlist">
          {t("home.viewFullWatchlist")}
          <ArrowRightIcon size={14} />
        </Link>
      </Button>
    </>
  );
}
