"use client";

import Link from "next/link";
import { Badge, Card, Text } from "@/components/ui";
import { pickLocalized } from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { CycleAlignment } from "@/types/research";

export function CycleAlignmentPanel({ alignment }: { alignment: CycleAlignment }) {
  const { locale } = useLocale();

  return (
    <Card padding="lg" className="flex min-w-0 flex-col gap-4 overflow-hidden border-primary/20 bg-primary/5">
      <div className="flex flex-wrap items-center gap-2">
        <Text variant="label" color="secondary">
          周期一致性分析
        </Text>
        <Badge variant="outline">{alignment.alignmentScore} 分</Badge>
      </div>

      <Text variant="caption" color="tertiary">
        {pickLocalized(alignment.scoreDisclaimer, locale)}
      </Text>

      <div className="grid min-w-0 gap-3 sm:grid-cols-3">
        {alignment.records.map((entry) => (
          <div
            key={entry.recordId}
            className="flex min-w-0 flex-col gap-2 rounded-md border border-border/[0.1] bg-background/60 p-3"
          >
            <Text variant="caption" color="tertiary">
              {pickLocalized(entry.period, locale)}
            </Text>
            <Badge variant="outline" className="w-fit">
              {pickLocalized(entry.direction, locale)}
            </Badge>
            <Text variant="caption" color="tertiary">
              编辑置信度 {entry.confidence}%
            </Text>
            <Link href={`/research/record/${entry.recordId}`} className="text-caption text-primary hover:underline">
              {entry.recordId}
            </Link>
          </div>
        ))}
      </div>

      <Text variant="body-sm" color="secondary" className="rounded-md border border-border/[0.08] bg-muted/30 p-3">
        {pickLocalized(alignment.conclusion, locale)}
      </Text>

      {alignment.conflictNotes && alignment.conflictNotes.length > 0 && (
        <ul className="flex flex-col gap-1 text-caption text-foreground-tertiary">
          {alignment.conflictNotes.map((note, i) => (
            <li key={i}>· {pickLocalized(note, locale)}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}
