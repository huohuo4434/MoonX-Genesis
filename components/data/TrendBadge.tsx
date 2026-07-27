"use client";

import { cn } from "@/lib/utils";
import { MinusIcon, TrendingDownIcon, TrendingUpIcon } from "@/components/icons";
import { HTMLAttributes } from "react";
import { useTranslations } from "@/lib/i18n/LocaleProvider";

export type Trend = "up" | "down" | "neutral";

export interface TrendBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  trend: Trend;
  label?: string;
}

const trendConfig: Record<Trend, { icon: typeof TrendingUpIcon; key: string; classes: string }> = {
  up: { icon: TrendingUpIcon, key: "directions.bullish", classes: "bg-success/10 text-success border-success/20" },
  down: { icon: TrendingDownIcon, key: "directions.bearish", classes: "bg-danger/10 text-danger border-danger/20" },
  neutral: { icon: MinusIcon, key: "directions.neutral", classes: "bg-muted text-foreground-secondary border-transparent" },
};

/** Directional forecast/market trend indicator. */
export function TrendBadge({ trend, label, className, ...props }: TrendBadgeProps) {
  const t = useTranslations();
  const { icon: Icon, key, classes } = trendConfig[trend];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-caption font-medium",
        classes,
        className
      )}
      {...props}
    >
      <Icon size={11} />
      {label ?? t(key)}
    </span>
  );
}
