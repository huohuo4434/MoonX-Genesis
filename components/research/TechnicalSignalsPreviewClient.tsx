"use client";

import { Badge, Card, Text } from "@/components/ui";
import { pickLocalized } from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function TechnicalSignalsPreviewClient({
  signals,
}: {
  signals: Array<{
    id: string;
    symbol: string;
    title: { zhCN: string; zhTW: string; en: string };
    summary: { zhCN: string; zhTW: string; en: string };
    status: string;
    timeframe: string;
    detectedAt: string;
  }>;
}) {
  const { locale } = useLocale();

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {signals.map((signal) => (
        <Card key={signal.id} padding="lg" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <Text variant="body" weight="semibold">
                {pickLocalized(signal.title, locale)}
              </Text>
              <Text variant="caption" color="tertiary">
                {signal.symbol} · {signal.timeframe}
              </Text>
            </div>
            <Badge variant="outline">{signal.status}</Badge>
          </div>
          <Text variant="body-sm" color="secondary">
            {pickLocalized(signal.summary, locale)}
          </Text>
          <Text variant="caption" color="tertiary">
            Detected: {signal.detectedAt}
          </Text>
        </Card>
      ))}
    </div>
  );
}
