import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export type Status = "active" | "pending" | "closed" | "error" | "draft";

export interface StatusBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  status: Status;
  label?: string;
}

const statusConfig: Record<Status, { text: string; dotClass: string; textClass: string }> = {
  active: { text: "Active", dotClass: "bg-success", textClass: "text-foreground-secondary" },
  pending: { text: "Pending", dotClass: "bg-warning", textClass: "text-foreground-secondary" },
  closed: { text: "Closed", dotClass: "bg-foreground-tertiary", textClass: "text-foreground-tertiary" },
  error: { text: "Error", dotClass: "bg-danger", textClass: "text-foreground-secondary" },
  draft: { text: "Draft", dotClass: "bg-foreground-disabled", textClass: "text-foreground-tertiary" },
};

/** Dot + label status indicator, the Linear/Stripe-style compact status pattern. */
export function StatusBadge({ status, label, className, ...props }: StatusBadgeProps) {
  const { text, dotClass, textClass } = statusConfig[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-caption font-medium", textClass, className)} {...props}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dotClass)} aria-hidden="true" />
      {label ?? text}
    </span>
  );
}
