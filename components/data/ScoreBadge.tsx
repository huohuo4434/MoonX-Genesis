import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export interface ScoreBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Score from 0 to `max`. */
  value: number;
  max?: number;
  /** Higher score thresholds (as a fraction of `max`) for success/warning coloring. */
  thresholds?: { success: number; warning: number };
}

const defaultThresholds = { success: 0.7, warning: 0.4 };

/** Compact numeric score chip (e.g. model score, quality score) with tiered coloring. */
export function ScoreBadge({ value, max = 100, thresholds = defaultThresholds, className, ...props }: ScoreBadgeProps) {
  const ratio = max === 0 ? 0 : value / max;
  const colorClasses =
    ratio >= thresholds.success
      ? "bg-success/10 text-success border-success/20"
      : ratio >= thresholds.warning
        ? "bg-warning/10 text-warning border-warning/20"
        : "bg-danger/10 text-danger border-danger/20";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-caption font-semibold tabular-figures",
        colorClasses,
        className
      )}
      {...props}
    >
      {value}
      <span className="text-foreground-tertiary">/{max}</span>
    </span>
  );
}
