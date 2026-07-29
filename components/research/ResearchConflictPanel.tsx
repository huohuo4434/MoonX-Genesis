"use client";

import Link from "next/link";
import { Badge, Card, Text } from "@/components/ui";
import { pickLocalized } from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatLocalizedDateRange } from "@/lib/utils";
import type { ResearchConflict } from "@/types/research";

export function ResearchConflictPanel({ conflict }: { conflict: ResearchConflict }) {
  const { locale } = useLocale();

  return (
    <Card padding="lg" className="flex flex-col gap-4 border-warning/25 bg-warning/5">
      <div className="flex flex-wrap items-center gap-2">
        <Text variant="label" color="secondary">
          观点分歧
        </Text>
        <Badge variant="warning">{conflict.status}</Badge>
      </div>

      <Text variant="body" weight="semibold">
        {pickLocalized(conflict.title, locale)}
      </Text>

      <Text variant="body-sm" color="secondary">
        框架之间存在分歧，不等同于数据错误。MoonX保留不同来源原始判断，并通过后续价格验证裁决。
      </Text>

      <Text variant="caption" color="tertiary">
        裁决窗口：
        {formatLocalizedDateRange(conflict.resolutionWindow.start, conflict.resolutionWindow.end, locale)}
      </Text>

      <div className="grid gap-3 sm:grid-cols-3">
        {conflict.records.map((entry) => (
          <div
            key={entry.recordId}
            className="flex flex-col gap-2 rounded-md border border-border/[0.1] bg-background/60 p-3"
          >
            <Text variant="caption" color="tertiary">
              {pickLocalized(entry.framework, locale)}
            </Text>
            <Badge variant="outline">{pickLocalized(entry.direction, locale)}</Badge>
            <Text variant="body-sm" color="secondary">
              {pickLocalized(entry.summary, locale)}
            </Text>
            <Link
              href={`/research/library#${entry.recordId}`}
              className="text-caption text-primary hover:underline"
            >
              {entry.recordId}
            </Link>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Text variant="label" color="tertiary" className="mb-2 block">
            上涨确认条件
          </Text>
          <ul className="space-y-1 text-body-sm text-foreground-secondary">
            {conflict.bullishConfirmation.map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-success">+</span>
                {pickLocalized(item, locale)}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <Text variant="label" color="tertiary" className="mb-2 block">
            下跌确认条件
          </Text>
          <ul className="space-y-1 text-body-sm text-foreground-secondary">
            {conflict.bearishConfirmation.map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-danger">−</span>
                {pickLocalized(item, locale)}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Text variant="body-sm" color="secondary" className="rounded-md border border-border/[0.08] bg-muted/30 p-3">
        <span className="font-medium text-foreground">MoonX 当前综合判断：</span>
        {pickLocalized(conflict.currentMoonXView, locale)}
      </Text>
    </Card>
  );
}
