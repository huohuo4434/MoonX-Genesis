"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { Badge, Card, Text } from "@/components/ui";
import { pickLocalized } from "@/lib/i18n/config";
import { technicalSignalMessageKeys } from "@/lib/formatters/technical-signal";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import type { TechnicalSignal } from "@/types/technical-signal";

export function TechnicalSignalsHomeClient({ signals }: { signals: TechnicalSignal[] }) {
  const { locale } = useLocale();
  const t = useTranslations();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text variant="label" color="secondary">{t("technical.currentWarnings")}</Text>
        <Link href="/research/technical" className="inline-flex items-center gap-1 text-body-sm text-foreground-secondary hover:text-primary focus-ring">
          {t("technical.viewAll")}<ArrowRightIcon size={14} />
        </Link>
      </div>
      {signals.length === 0 ? (
        <Text variant="body-sm" color="secondary">{t("technical.noSignals")}</Text>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {signals.map((signal) => (
            <Card key={signal.id} padding="md" className="flex items-center justify-between gap-3">
              <div>
                <Text variant="body-sm" weight="semibold">{signal.symbol} · {pickLocalized(signal.title, locale)}</Text>
                <Text variant="caption" color="tertiary">{t(technicalSignalMessageKeys.timeframe(signal.timeframe))}</Text>
              </div>
              <Badge variant="outline">{signal.signalStrength ?? "—"}</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
