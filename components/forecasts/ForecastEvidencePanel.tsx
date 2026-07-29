"use client";

import Link from "next/link";
import { useState } from "react";
import { Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { ForecastModuleEvidence } from "@/lib/methodology/types";

/**
 * Collapsible per-forecast evidence — only modules with real signals.
 */
export function ForecastEvidencePanel({
  items,
  emptyHint,
}: {
  items: ForecastModuleEvidence[];
  emptyHint?: string;
}) {
  const { locale } = useLocale();
  const zh = locale.startsWith("zh");
  const [open, setOpen] = useState(false);

  if (!items.length) {
    return (
      <div className="mt-2 space-y-1">
        {emptyHint ? (
          <p className="text-caption text-foreground-tertiary">{emptyHint}</p>
        ) : null}
        <Link
          href="/methodology"
          className="inline-block text-caption text-primary underline-offset-2 hover:underline"
        >
          {zh ? "查看MOOX预测方法" : "View MOOX methodology"}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-border/[0.08] bg-muted/20">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2.5 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <Text variant="caption" color="tertiary">
          {zh ? "预测依据" : "Forecast basis"}
        </Text>
        <span className="text-caption text-foreground-tertiary">
          {open ? (zh ? "收起" : "Hide") : zh ? "展开" : "Show"}
        </span>
      </button>
      {open ? (
        <div className="space-y-2 border-t border-border/[0.06] px-3 py-2.5">
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.moduleId} className="text-caption text-foreground-secondary">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-foreground">
                    {zh ? item.nameZh : item.nameEn}
                  </span>
                  <span className="text-foreground-tertiary">
                    {zh ? item.influenceZh : item.influenceEn}
                  </span>
                </div>
                <p className="mt-0.5 break-words text-foreground-tertiary">
                  {zh ? item.conclusionZh : item.conclusionEn}
                </p>
              </li>
            ))}
          </ul>
          <Link
            href="/methodology"
            className="inline-block text-caption text-primary underline-offset-2 hover:underline"
          >
            {zh ? "查看MOOX预测方法" : "View MOOX methodology"}
          </Link>
        </div>
      ) : (
        <div className="border-t border-border/[0.06] px-3 py-2">
          <Link
            href="/methodology"
            className="inline-block text-caption text-primary underline-offset-2 hover:underline"
          >
            {zh ? "查看MOOX预测方法" : "View MOOX methodology"}
          </Link>
        </div>
      )}
    </div>
  );
}
