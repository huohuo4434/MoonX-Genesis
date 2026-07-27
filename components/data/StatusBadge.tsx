"use client";

import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";
import { useTranslations } from "@/lib/i18n/LocaleProvider";

export type Status = "active" | "pending" | "closed" | "error" | "draft";

export interface StatusBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  status: Status;
  label?: string;
}

const statusConfig: Record<Status, { key: string; dotClass: string; textClass: string }> = {
  active: { key: "badges.active", dotClass: "bg-success", textClass: "text-foreground-secondary" },
  pending: { key: "badges.pending", dotClass: "bg-warning", textClass: "text-foreground-secondary" },
  closed: { key: "badges.closed", dotClass: "bg-foreground-tertiary", textClass: "text-foreground-tertiary" },
  error: { key: "badges.error", dotClass: "bg-danger", textClass: "text-foreground-secondary" },
  draft: { key: "badges.draft", dotClass: "bg-foreground-disabled", textClass: "text-foreground-tertiary" },
};

/** Dot + label status indicator, the Linear/Stripe-style compact status pattern. */
export function StatusBadge({ status, label, className, ...props }: StatusBadgeProps) {
  const t = useTranslations();
  const { key, dotClass, textClass } = statusConfig[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-caption font-medium", textClass, className)} {...props}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dotClass)} aria-hidden="true" />
      {label ?? t(key)}
    </span>
  );
}
