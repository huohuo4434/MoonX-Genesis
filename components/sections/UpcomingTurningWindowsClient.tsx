"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { Badge, Button, Card, Heading, Text } from "@/components/ui";
import { pickLocalized } from "@/lib/i18n/config";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import { formatDate } from "@/lib/utils";
import type { TimelineEvent } from "@/types/research";

export function UpcomingTurningWindowsClient({ events }: { events: TimelineEvent[] }) {
  const { locale } = useLocale();
  const t = useTranslations();

  return (
    <>
      <div className="mb-8 flex flex-col gap-3">
        <Text variant="label" color="secondary" className="uppercase tracking-wide">
          {t("nav.timeline")}
        </Text>
        <Heading as="h2" size="h2" className="max-w-2xl">
          {t("home.turningWindowsTitle")}
        </Heading>
        <Text variant="body" color="secondary" className="max-w-2xl">
          {t("home.turningWindowsSubtitle")}
        </Text>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <Card key={event.id} padding="md" className="flex flex-col gap-1.5">
            <Badge variant="outline" className="w-fit font-mono">
              {event.date ? formatDate(event.date) : `${formatDate(event.start ?? "")} – ${formatDate(event.end ?? "")}`}
            </Badge>
            <Text variant="body-sm" weight="medium" className="text-foreground">
              {pickLocalized(event.title, locale)}
            </Text>
          </Card>
        ))}
      </div>

      <Button asChild variant="outline" size="md" className="mt-6">
        <Link href="/timeline">
          {t("home.viewFullTimeline")}
          <ArrowRightIcon size={14} />
        </Link>
      </Button>
    </>
  );
}
