import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export interface PercentageProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Percentage points, e.g. `4.28` renders as "+4.28%". */
  value: number;
  decimals?: number;
  /** Colors the text green/red based on sign. Defaults to true. */
  colorize?: boolean;
  showSign?: boolean;
}

/** Tabular-figure percentage display, typically used for changes, confidence, or allocation. */
export function Percentage({
  value,
  decimals = 2,
  colorize = true,
  showSign = true,
  className,
  ...props
}: PercentageProps) {
  const sign = value > 0 ? "+" : "";
  const formatted = `${showSign ? sign : ""}${value.toFixed(decimals)}%`;

  return (
    <span
      className={cn(
        "font-mono tabular-figures",
        colorize
          ? value > 0
            ? "text-success"
            : value < 0
              ? "text-danger"
              : "text-foreground-secondary"
          : "text-foreground",
        className
      )}
      {...props}
    >
      {formatted}
    </span>
  );
}
